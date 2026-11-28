/**
 * @module server/geminiPrompts
 * Prompt builders, system instructions, and structured JSON output schema
 * for Gemini air quality advisory and Q&A generation.
 */
import { Type, type Schema } from '@google/genai';
import {
  AQI_THRESHOLDS,
  WHO_24H_GUIDELINES,
  type AirQualityReading,
  type AqiCategory,
  type QaTurn,
  getWhoGuidelineMultiplier,
} from '../shared/airQuality.ts';

/** System instruction governing structured air quality advisory generation. */
export const ADVISORY_SYSTEM_INSTRUCTION =
  'You are a public environmental health specialist providing concise, practical, plain-language urban air quality guidance grounded strictly in the provided AQI, PM2.5, and PM10 measurements.';

/** System instruction governing concise, location-grounded follow-up Q&A responses. */
export const QA_SYSTEM_INSTRUCTION =
  'You are the Urban Air Quality Assistant. Answer user air-quality questions concisely in 2 to 4 plain-language sentences (under 110 words). Always ground your answer in the provided city, AQI, PM2.5, and PM10 data. Give practical actions (masks, timing, ventilation, sensitive-group precautions) without markdown headers, bold asterisks, or medical diagnosis claims.';

/** Strict JSON schema passed to Gemini for structured advisory responses. */
export const ADVISORY_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: 'A 2-sentence plain-language health risk summary for the city reading.',
    },
    outdoorActivity: {
      type: Type.STRING,
      description: 'Actionable guidance for outdoor exercise, walking, and errands.',
    },
    commuteGuidance: {
      type: Type.STRING,
      description: 'Practical transit, walking, cycling, and car cabin air advice.',
    },
    maskRecommendation: {
      type: Type.STRING,
      description: 'Clear mask advice specifying whether N95/KN95/FFP2 is needed.',
    },
    indoorAirTips: {
      type: Type.STRING,
      description: 'Actionable ventilation, window, and HEPA filtration advice.',
    },
    sensitiveGroups: {
      type: Type.OBJECT,
      properties: {
        children: {
          type: Type.STRING,
          description: 'Tailored guidance for children and outdoor school play.',
        },
        elderly: {
          type: Type.STRING,
          description: 'Tailored guidance for older adults.',
        },
        respiratory: {
          type: Type.STRING,
          description:
            'Tailored guidance for people with asthma, COPD, or respiratory conditions.',
        },
      },
      required: ['children', 'elderly', 'respiratory'],
    },
    actionChecklist: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '3 short, immediately actionable steps for today.',
    },
  },
  required: [
    'summary',
    'outdoorActivity',
    'commuteGuidance',
    'maskRecommendation',
    'indoorAirTips',
    'sensitiveGroups',
    'actionChecklist',
  ],
};

/** Builds the user prompt for structured air quality advisory generation. */
export function buildAdvisoryPrompt(reading: AirQualityReading, category: AqiCategory): string {
  const pm25WhoRatio = getWhoGuidelineMultiplier(reading.pm25, WHO_24H_GUIDELINES.pm25);
  const pm10WhoRatio = getWhoGuidelineMultiplier(reading.pm10, WHO_24H_GUIDELINES.pm10);
  const poorThreshold = AQI_THRESHOLDS.moderateMax + 1;

  return [
    'Generate practical, concise urban air quality health guidance for the following reading:',
    `- City: ${reading.city}${reading.country ? `, ${reading.country}` : ''}`,
    `- AQI: ${reading.aqi} (Category: ${category})`,
    `- PM2.5: ${reading.pm25} µg/m³ (${pm25WhoRatio}x WHO 24-hour guideline of ${WHO_24H_GUIDELINES.pm25} µg/m³)`,
    `- PM10: ${reading.pm10} µg/m³ (${pm10WhoRatio}x WHO 24-hour guideline of ${WHO_24H_GUIDELINES.pm10} µg/m³)`,
    `Keep each field clear, specific, and 1–2 sentences long. Mention exact respirator types (N95/KN95/FFP2) when AQI >= ${poorThreshold}. Do not give medical diagnoses or alarmist language.`,
  ].join('\n');
}

/** Builds the grounded user prompt for a follow-up Q&A turn. */
export function buildQaPrompt(
  reading: AirQualityReading,
  category: AqiCategory,
  question: string,
  history: readonly QaTurn[]
): string {
  const historyBlock =
    history.length > 0
      ? `\nRecent conversation context:\n${history
          .map((turn) => `${turn.role === 'user' ? 'User' : 'Assistant'}: ${turn.content}`)
          .join('\n')}`
      : '';

  return [
    'Current location reading:',
    `- City: ${reading.city}${reading.country ? `, ${reading.country}` : ''}`,
    `- AQI: ${reading.aqi} (${category})`,
    `- PM2.5: ${reading.pm25} µg/m³`,
    `- PM10: ${reading.pm10} µg/m³`,
    historyBlock,
    `\nUser question: ${question}`,
  ].join('\n');
}
