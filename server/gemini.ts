import { GoogleGenAI, ThinkingLevel, Type, type Schema } from '@google/genai';
import {
  type AdvisoryResponsePayload,
  type AirQualityAdvisory,
  type AirQualityReading,
  type QaResponsePayload,
  type QaTurn,
  WHO_24H_GUIDELINES,
  buildFallbackAdvisory,
  buildFallbackAnswer,
  formatAssistantText,
  getAqiCategory,
  getWhoGuidelineMultiplier,
} from '../shared/airQuality.ts';
import { TtlCache } from './cache.ts';
import { SERVER_CONFIG, getGeminiApiKey } from './config.ts';

const advisoryCache = new TtlCache<AdvisoryResponsePayload>(
  SERVER_CONFIG.advisoryCacheTtlMs,
  SERVER_CONFIG.advisoryCacheMaxEntries
);

const ADVISORY_RESPONSE_SCHEMA: Schema = {
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

function createGeminiClient(): GoogleGenAI | null {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return null;
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': SERVER_CONFIG.geminiUserAgent,
      },
    },
  });
}

function getCacheKey(reading: AirQualityReading): string {
  return `${reading.city.toLowerCase()}|${reading.aqi}|${reading.pm25}|${reading.pm10}`;
}

function classifyGeminiError(error: unknown): {
  retryable: boolean;
  userWarning: string;
} {
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error';
  const status =
    typeof error === 'object' && error !== null && 'status' in error
      ? Number((error as { status?: unknown }).status)
      : undefined;

  if (status === 429 || /RESOURCE_EXHAUSTED|\b429\b|rate.?limit|quota/i.test(message)) {
    return {
      retryable: false,
      userWarning:
        'Gemini API quota or rate limit was reached. Check your key quota in Settings > Secrets. Showing evidence-based fallback guidance instead.',
    };
  }

  if (
    status === 400 ||
    status === 401 ||
    status === 403 ||
    /API_KEY_INVALID|PERMISSION_DENIED/i.test(message)
  ) {
    return {
      retryable: false,
      userWarning:
        'Gemini API credentials could not be verified on the server. Check GEMINI_API_KEY in Settings > Secrets. Showing evidence-based fallback guidance instead.',
    };
  }

  if (
    status === 500 ||
    status === 503 ||
    /timeout|network|ECONNRESET|\b503\b|\b500\b|fetch failed/i.test(message)
  ) {
    return {
      retryable: true,
      userWarning:
        'Gemini AI service is temporarily unreachable. Showing evidence-based fallback guidance instead.',
    };
  }

  return {
    retryable: false,
    userWarning:
      'Gemini AI could not complete this request right now. Showing evidence-based fallback guidance instead.',
  };
}

async function withSingleRetry<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (err) {
    const info = classifyGeminiError(err);
    if (!info.retryable) {
      throw err;
    }
    await new Promise((resolve) => setTimeout(resolve, SERVER_CONFIG.geminiRetryDelayMs));
    return await operation();
  }
}

function pickFormattedText(candidate: unknown, fallbackValue: string, maxLength: number): string {
  if (typeof candidate === 'string' && candidate.trim().length > 0) {
    return formatAssistantText(candidate, maxLength);
  }
  return fallbackValue;
}

function normalizeAdvisoryObject(
  raw: Partial<AirQualityAdvisory>,
  fallback: AirQualityAdvisory
): AirQualityAdvisory {
  const checklist = Array.isArray(raw.actionChecklist)
    ? raw.actionChecklist
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .slice(0, 4)
        .map((item) => formatAssistantText(item, 180))
    : fallback.actionChecklist;

  return {
    summary: pickFormattedText(raw.summary, fallback.summary, 420),
    outdoorActivity: pickFormattedText(raw.outdoorActivity, fallback.outdoorActivity, 320),
    commuteGuidance: pickFormattedText(raw.commuteGuidance, fallback.commuteGuidance, 320),
    maskRecommendation: pickFormattedText(
      raw.maskRecommendation,
      fallback.maskRecommendation,
      320
    ),
    indoorAirTips: pickFormattedText(raw.indoorAirTips, fallback.indoorAirTips, 320),
    sensitiveGroups: {
      children: pickFormattedText(
        raw.sensitiveGroups?.children,
        fallback.sensitiveGroups.children,
        300
      ),
      elderly: pickFormattedText(
        raw.sensitiveGroups?.elderly,
        fallback.sensitiveGroups.elderly,
        300
      ),
      respiratory: pickFormattedText(
        raw.sensitiveGroups?.respiratory,
        fallback.sensitiveGroups.respiratory,
        300
      ),
    },
    actionChecklist: checklist.length > 0 ? checklist : fallback.actionChecklist,
  };
}

function buildAdvisoryPrompt(reading: AirQualityReading, category: string): string {
  const pm25WhoRatio = getWhoGuidelineMultiplier(reading.pm25, WHO_24H_GUIDELINES.pm25);
  const pm10WhoRatio = getWhoGuidelineMultiplier(reading.pm10, WHO_24H_GUIDELINES.pm10);

  return [
    'Generate practical, concise urban air quality health guidance for the following reading:',
    `- City: ${reading.city}${reading.country ? `, ${reading.country}` : ''}`,
    `- AQI: ${reading.aqi} (Category: ${category})`,
    `- PM2.5: ${reading.pm25} µg/m³ (${pm25WhoRatio}x WHO 24-hour guideline of 15 µg/m³)`,
    `- PM10: ${reading.pm10} µg/m³ (${pm10WhoRatio}x WHO 24-hour guideline of 45 µg/m³)`,
    'Keep each field clear, specific, and 1–2 sentences long. Mention exact respirator types (N95/KN95/FFP2) when AQI >= 101. Do not give medical diagnoses or alarmist language.',
  ].join('\n');
}

/**
 * Generates structured outdoor, commute, mask, indoor, and sensitive-group guidance
 * using server-side Gemini AI, with transparent fallback when unavailable.
 */
export async function generateAirQualityAdvisory(
  reading: AirQualityReading,
  options?: { bypassCache?: boolean }
): Promise<AdvisoryResponsePayload> {
  const category = getAqiCategory(reading.aqi);
  const cacheKey = getCacheKey(reading);

  if (!options?.bypassCache) {
    const cached = advisoryCache.get(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }
  }

  const fallback = buildFallbackAdvisory(reading);
  const ai = createGeminiClient();

  if (!ai) {
    return {
      source: 'fallback',
      warning:
        'GEMINI_API_KEY is not configured on the server. Showing evidence-based fallback guidance.',
      category,
      advisory: fallback,
    };
  }

  try {
    const response = await withSingleRetry(() =>
      ai.models.generateContent({
        model: SERVER_CONFIG.geminiModel,
        contents: buildAdvisoryPrompt(reading, category),
        config: {
          systemInstruction:
            'You are a public environmental health specialist providing concise, practical, plain-language urban air quality guidance grounded strictly in the provided AQI, PM2.5, and PM10 measurements.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: ADVISORY_RESPONSE_SCHEMA,
        },
      })
    );

    const rawText = response.text?.trim();
    if (!rawText) {
      throw new Error('Empty response from Gemini');
    }

    const parsed = JSON.parse(rawText) as Partial<AirQualityAdvisory>;
    const payload: AdvisoryResponsePayload = {
      source: 'gemini',
      model: SERVER_CONFIG.geminiModel,
      cached: false,
      category,
      advisory: normalizeAdvisoryObject(parsed, fallback),
    };

    advisoryCache.set(cacheKey, payload);
    return payload;
  } catch (error) {
    const info = classifyGeminiError(error);
    return {
      source: 'fallback',
      warning: info.userWarning,
      category,
      advisory: fallback,
    };
  }
}

/**
 * Answers a user's follow-up air quality question grounded in the active city reading,
 * falling back to topic-aware deterministic guidance if Gemini is unavailable.
 */
export async function answerAirQualityQuestion(
  reading: AirQualityReading,
  question: string,
  history: QaTurn[] = []
): Promise<QaResponsePayload> {
  const category = getAqiCategory(reading.aqi);
  const ai = createGeminiClient();

  if (!ai) {
    return {
      source: 'fallback',
      warning:
        'GEMINI_API_KEY is not configured on the server. Returning rule-based fallback answer.',
      answer: formatAssistantText(buildFallbackAnswer(reading, question), 900),
    };
  }

  const historyBlock =
    history.length > 0
      ? `\nRecent conversation context:\n${history
          .map((turn) => `${turn.role === 'user' ? 'User' : 'Assistant'}: ${turn.content}`)
          .join('\n')}`
      : '';

  const prompt = [
    'Current location reading:',
    `- City: ${reading.city}${reading.country ? `, ${reading.country}` : ''}`,
    `- AQI: ${reading.aqi} (${category})`,
    `- PM2.5: ${reading.pm25} µg/m³`,
    `- PM10: ${reading.pm10} µg/m³`,
    historyBlock,
    `\nUser question: ${question}`,
  ].join('\n');

  try {
    const response = await withSingleRetry(() =>
      ai.models.generateContent({
        model: SERVER_CONFIG.geminiModel,
        contents: prompt,
        config: {
          systemInstruction:
            'You are the Urban Air Quality Assistant. Answer user air-quality questions concisely in 2 to 4 plain-language sentences (under 110 words). Always ground your answer in the provided city, AQI, PM2.5, and PM10 data. Give practical actions (masks, timing, ventilation, sensitive-group precautions) without markdown headers, bold asterisks, or medical diagnosis claims.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      })
    );

    const answerText = response.text?.trim();
    if (!answerText) {
      throw new Error('Empty response from Gemini');
    }

    return {
      source: 'gemini',
      model: SERVER_CONFIG.geminiModel,
      answer: formatAssistantText(answerText, 900),
    };
  } catch (error) {
    const info = classifyGeminiError(error);
    return {
      source: 'fallback',
      warning: info.userWarning,
      answer: formatAssistantText(buildFallbackAnswer(reading, question), 900),
    };
  }
}
