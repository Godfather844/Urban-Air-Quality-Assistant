/**
 * @module shared/validation
 * Strict input validation, pollutant bounds checking, and assistant text sanitization.
 */
import {
  DOMINANT_PM25_TO_PM10_RATIO,
  QA_LIMITS,
  READING_LIMITS,
  TEXT_LIMITS,
} from './constants.ts';
import type {
  AirQualityReading,
  QaTurn,
  ValidatedQaInput,
  ValidationResult,
} from './types.ts';

const CONTROL_CHAR_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const SAFE_CITY_NAME_PATTERN = /^[a-zA-Z0-9\s.,'()-]+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseFiniteNumber(raw: unknown): number | null {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : null;
  }
  if (typeof raw === 'string' && raw.trim() !== '') {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function validateNumericRange(
  raw: unknown,
  min: number,
  max: number,
  missingMessage: string,
  rangeMessage: string
): { value: number | null; error?: string } {
  const parsed = parseFiniteNumber(raw);
  if (parsed === null) {
    return { value: null, error: missingMessage };
  }
  if (parsed < min || parsed > max) {
    return { value: null, error: rangeMessage };
  }
  return { value: parsed };
}

/** Strips ASCII control characters, collapses whitespace, and enforces a max length. */
export function sanitizePlainText(
  input: string,
  maxLength: number = QA_LIMITS.questionMaxLength
): string {
  if (typeof input !== 'string' || maxLength <= 0) {
    return '';
  }
  return input
    .replace(CONTROL_CHAR_PATTERN, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/**
 * Normalizes model or fallback output into clean plain text without markdown artifacts,
 * truncating gracefully at a sentence boundary when exceeding maxLength.
 */
export function formatAssistantText(
  raw: string,
  maxLength: number = TEXT_LIMITS.defaultFormattedMax
): string {
  if (typeof raw !== 'string' || maxLength <= 0) {
    return '';
  }

  const cleaned = raw
    .replace(CONTROL_CHAR_PATTERN, '')
    .replace(/\r\n/g, '\n')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  const sliced = cleaned.slice(0, maxLength);
  const lastSentenceEnd = Math.max(
    sliced.lastIndexOf('. '),
    sliced.lastIndexOf('! '),
    sliced.lastIndexOf('? ')
  );
  if (lastSentenceEnd > maxLength * TEXT_LIMITS.sentenceTruncationRatio) {
    return sliced.slice(0, lastSentenceEnd + 1).trim();
  }
  return `${sliced.trimEnd()}…`;
}

/** Validates and normalizes an air quality reading payload from client forms or API bodies. */
export function validateAirQualityReading(input: unknown): ValidationResult<AirQualityReading> {
  if (!isRecord(input)) {
    return { valid: false, errors: { form: 'Reading payload must be a JSON object.' } };
  }

  const errors: Record<string, string> = {};

  const rawCity =
    typeof input.city === 'string'
      ? sanitizePlainText(input.city, READING_LIMITS.cityMaxLength)
      : '';
  if (rawCity.length < READING_LIMITS.cityMinLength) {
    errors.city = `Enter a city name with at least ${READING_LIMITS.cityMinLength} characters.`;
  } else if (!SAFE_CITY_NAME_PATTERN.test(rawCity)) {
    errors.city = 'City name contains unsupported special characters.';
  }

  const aqiResult = validateNumericRange(
    input.aqi,
    READING_LIMITS.aqiMin,
    READING_LIMITS.aqiMax,
    'Enter a valid numeric AQI value.',
    `AQI must be between ${READING_LIMITS.aqiMin} and ${READING_LIMITS.aqiMax}.`
  );
  if (aqiResult.error) errors.aqi = aqiResult.error;

  const pm25Result = validateNumericRange(
    input.pm25,
    READING_LIMITS.pm25Min,
    READING_LIMITS.pm25Max,
    'Enter a valid numeric PM2.5 reading.',
    `PM2.5 must be between ${READING_LIMITS.pm25Min} and ${READING_LIMITS.pm25Max} µg/m³.`
  );
  if (pm25Result.error) errors.pm25 = pm25Result.error;

  const pm10Result = validateNumericRange(
    input.pm10,
    READING_LIMITS.pm10Min,
    READING_LIMITS.pm10Max,
    'Enter a valid numeric PM10 reading.',
    `PM10 must be between ${READING_LIMITS.pm10Min} and ${READING_LIMITS.pm10Max} µg/m³.`
  );
  if (pm10Result.error) errors.pm10 = pm10Result.error;

  if (
    Object.keys(errors).length > 0 ||
    aqiResult.value === null ||
    pm25Result.value === null ||
    pm10Result.value === null
  ) {
    return { valid: false, errors };
  }

  const country =
    typeof input.country === 'string' && input.country.trim().length > 0
      ? sanitizePlainText(input.country, READING_LIMITS.countryMaxLength)
      : undefined;

  return {
    valid: true,
    value: {
      city: rawCity,
      country,
      aqi: Math.round(aqiResult.value),
      pm25: Number(pm25Result.value.toFixed(1)),
      pm10: Number(pm10Result.value.toFixed(1)),
      isCustom: Boolean(input.isCustom),
      dominantPollutant:
        pm25Result.value >= pm10Result.value * DOMINANT_PM25_TO_PM10_RATIO ? 'PM2.5' : 'PM10',
    },
  };
}

function sanitizeConversationHistory(rawHistory: unknown): QaTurn[] {
  if (!Array.isArray(rawHistory)) {
    return [];
  }

  const history: QaTurn[] = [];
  for (const item of rawHistory.slice(-QA_LIMITS.maxHistoryTurns)) {
    if (!isRecord(item)) continue;
    const { role, content } = item;
    if ((role === 'user' || role === 'assistant') && typeof content === 'string') {
      const sanitizedContent = sanitizePlainText(content, QA_LIMITS.historyContentMaxLength);
      if (sanitizedContent) {
        history.push({ role, content: sanitizedContent });
      }
    }
  }
  return history;
}

/** Validates a follow-up Q&A payload including its embedded reading and bounded chat history. */
export function validateQuestionInput(input: unknown): ValidationResult<ValidatedQaInput> {
  if (!isRecord(input)) {
    return { valid: false, errors: { form: 'Request body must be a JSON object.' } };
  }

  const readingResult = validateAirQualityReading(input.reading ?? input);
  const errors: Record<string, string> = readingResult.valid ? {} : { ...readingResult.errors };

  const rawQuestion =
    typeof input.question === 'string'
      ? sanitizePlainText(input.question, QA_LIMITS.questionMaxLength)
      : '';
  if (rawQuestion.length < QA_LIMITS.questionMinLength) {
    errors.question = `Ask a question with at least ${QA_LIMITS.questionMinLength} characters.`;
  }

  if (Object.keys(errors).length > 0 || !readingResult.valid) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    value: {
      reading: readingResult.value,
      question: rawQuestion,
      history: sanitizeConversationHistory(input.history),
    },
  };
}
