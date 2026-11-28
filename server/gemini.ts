/**
 * @module server/gemini
 * Server-side Gemini AI service for structured air quality advisories and
 * grounded Q&A, with TTL caching and transparent evidence-based fallbacks.
 */
import { GoogleGenAI, ThinkingLevel, type Schema } from '@google/genai';
import {
  TEXT_LIMITS,
  type AdvisoryResponsePayload,
  type AirQualityAdvisory,
  type AirQualityReading,
  type QaResponsePayload,
  type QaTurn,
  buildFallbackAdvisory,
  buildFallbackAnswer,
  formatAssistantText,
  getAqiCategory,
} from '../shared/airQuality.ts';
import { TtlCache } from './cache.ts';
import { SERVER_CONFIG, getGeminiApiKey } from './config.ts';
import {
  classifyGeminiError,
  getAdvisoryCacheKey,
  normalizeAdvisoryObject,
  withSingleRetry,
} from './geminiHelpers.ts';
import {
  ADVISORY_RESPONSE_SCHEMA,
  ADVISORY_SYSTEM_INSTRUCTION,
  QA_SYSTEM_INSTRUCTION,
  buildAdvisoryPrompt,
  buildQaPrompt,
} from './geminiPrompts.ts';

/** Minimal transport interface for generating text via Gemini (injectable in tests). */
export interface GeminiGenerateRequest {
  contents: string;
  systemInstruction: string;
  responseMimeType?: string;
  responseSchema?: Schema;
}

export type GeminiContentGenerator = (request: GeminiGenerateRequest) => Promise<string | undefined>;

export interface AdvisoryGenerationOptions {
  bypassCache?: boolean;
  generator?: GeminiContentGenerator | null;
  cache?: TtlCache<AdvisoryResponsePayload>;
  retryDelayMs?: number;
}

export interface QaGenerationOptions {
  generator?: GeminiContentGenerator | null;
  retryDelayMs?: number;
}

const defaultAdvisoryCache = new TtlCache<AdvisoryResponsePayload>(
  SERVER_CONFIG.advisoryCacheTtlMs,
  SERVER_CONFIG.advisoryCacheMaxEntries
);

function createDefaultGeminiGenerator(): GeminiContentGenerator | null {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return null;
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': SERVER_CONFIG.geminiUserAgent,
      },
    },
  });

  return async (request: GeminiGenerateRequest): Promise<string | undefined> => {
    const response = await ai.models.generateContent({
      model: SERVER_CONFIG.geminiModel,
      contents: request.contents,
      config: {
        systemInstruction: request.systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        ...(request.responseMimeType ? { responseMimeType: request.responseMimeType } : {}),
        ...(request.responseSchema ? { responseSchema: request.responseSchema } : {}),
      },
    });
    return response.text;
  };
}

/**
 * Generates structured outdoor, commute, mask, indoor, and sensitive-group guidance
 * via server-side Gemini AI, transparently falling back when unavailable or failing.
 */
export async function generateAirQualityAdvisory(
  reading: AirQualityReading,
  options?: AdvisoryGenerationOptions
): Promise<AdvisoryResponsePayload> {
  const category = getAqiCategory(reading.aqi);
  const cache = options?.cache ?? defaultAdvisoryCache;
  const cacheKey = getAdvisoryCacheKey(reading);

  if (!options?.bypassCache) {
    const cached = cache.get(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }
  }

  const fallback = buildFallbackAdvisory(reading);
  const generator =
    options && 'generator' in options ? options.generator : createDefaultGeminiGenerator();

  if (!generator) {
    return {
      source: 'fallback',
      warning:
        'GEMINI_API_KEY is not configured on the server. Showing evidence-based fallback guidance.',
      category,
      advisory: fallback,
    };
  }

  try {
    const rawText = await withSingleRetry(
      () =>
        generator({
          contents: buildAdvisoryPrompt(reading, category),
          systemInstruction: ADVISORY_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: ADVISORY_RESPONSE_SCHEMA,
        }),
      options?.retryDelayMs
    );

    const trimmed = rawText?.trim();
    if (!trimmed) {
      throw new Error('Empty response from Gemini');
    }

    const parsed = JSON.parse(trimmed) as Partial<AirQualityAdvisory>;
    const payload: AdvisoryResponsePayload = {
      source: 'gemini',
      model: SERVER_CONFIG.geminiModel,
      cached: false,
      category,
      advisory: normalizeAdvisoryObject(parsed, fallback),
    };

    cache.set(cacheKey, payload);
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
 * falling back to topic-aware deterministic guidance if Gemini is unavailable or empty.
 */
export async function answerAirQualityQuestion(
  reading: AirQualityReading,
  question: string,
  history: QaTurn[] = [],
  options?: QaGenerationOptions
): Promise<QaResponsePayload> {
  const category = getAqiCategory(reading.aqi);
  const generator =
    options && 'generator' in options ? options.generator : createDefaultGeminiGenerator();

  if (!generator) {
    return {
      source: 'fallback',
      warning:
        'GEMINI_API_KEY is not configured on the server. Returning rule-based fallback answer.',
      answer: formatAssistantText(buildFallbackAnswer(reading, question), TEXT_LIMITS.qaAnswerMax),
    };
  }

  try {
    const rawText = await withSingleRetry(
      () =>
        generator({
          contents: buildQaPrompt(reading, category, question, history),
          systemInstruction: QA_SYSTEM_INSTRUCTION,
        }),
      options?.retryDelayMs
    );

    const trimmed = rawText?.trim();
    if (!trimmed) {
      throw new Error('Empty response from Gemini');
    }

    return {
      source: 'gemini',
      model: SERVER_CONFIG.geminiModel,
      answer: formatAssistantText(trimmed, TEXT_LIMITS.qaAnswerMax),
    };
  } catch (error) {
    const info = classifyGeminiError(error);
    return {
      source: 'fallback',
      warning: info.userWarning,
      answer: formatAssistantText(buildFallbackAnswer(reading, question), TEXT_LIMITS.qaAnswerMax),
    };
  }
}
