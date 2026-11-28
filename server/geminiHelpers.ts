/**
 * @module server/geminiHelpers
 * Error classification, bounded retry policy, cache keying, and safe normalization
 * of structured Gemini advisory payloads.
 */
import {
  TEXT_LIMITS,
  type AirQualityAdvisory,
  type AirQualityReading,
  formatAssistantText,
} from '../shared/airQuality.ts';
import { SERVER_CONFIG } from './config.ts';

export interface GeminiErrorClassification {
  retryable: boolean;
  userWarning: string;
}

/** Builds a deterministic cache key for identical city and particulate readings. */
export function getAdvisoryCacheKey(reading: AirQualityReading): string {
  return `${reading.city.toLowerCase()}|${reading.aqi}|${reading.pm25}|${reading.pm10}`;
}

/** Classifies upstream Gemini failures to decide retry eligibility and fallback wording. */
export function classifyGeminiError(error: unknown): GeminiErrorClassification {
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

/** Executes an async Gemini call with at most one retry for transient 5xx/network errors. */
export async function withSingleRetry<T>(
  operation: () => Promise<T>,
  retryDelayMs: number = SERVER_CONFIG.geminiRetryDelayMs
): Promise<T> {
  try {
    return await operation();
  } catch (err) {
    const info = classifyGeminiError(err);
    if (!info.retryable) {
      throw err;
    }
    if (retryDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
    return await operation();
  }
}

function pickFormattedText(candidate: unknown, fallbackValue: string, maxLength: number): string {
  if (typeof candidate === 'string' && candidate.trim().length > 0) {
    return formatAssistantText(candidate, maxLength);
  }
  return fallbackValue;
}

/** Normalizes a partial AI advisory object, safely backfilling any missing fields from fallback. */
export function normalizeAdvisoryObject(
  raw: Partial<AirQualityAdvisory>,
  fallback: AirQualityAdvisory
): AirQualityAdvisory {
  const checklist = Array.isArray(raw.actionChecklist)
    ? raw.actionChecklist
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .slice(0, TEXT_LIMITS.maxChecklistItems)
        .map((item) => formatAssistantText(item, TEXT_LIMITS.checklistItemMax))
    : fallback.actionChecklist;

  return {
    summary: pickFormattedText(raw.summary, fallback.summary, TEXT_LIMITS.summaryMax),
    outdoorActivity: pickFormattedText(
      raw.outdoorActivity,
      fallback.outdoorActivity,
      TEXT_LIMITS.guidanceFieldMax
    ),
    commuteGuidance: pickFormattedText(
      raw.commuteGuidance,
      fallback.commuteGuidance,
      TEXT_LIMITS.guidanceFieldMax
    ),
    maskRecommendation: pickFormattedText(
      raw.maskRecommendation,
      fallback.maskRecommendation,
      TEXT_LIMITS.guidanceFieldMax
    ),
    indoorAirTips: pickFormattedText(
      raw.indoorAirTips,
      fallback.indoorAirTips,
      TEXT_LIMITS.guidanceFieldMax
    ),
    sensitiveGroups: {
      children: pickFormattedText(
        raw.sensitiveGroups?.children,
        fallback.sensitiveGroups.children,
        TEXT_LIMITS.sensitiveGroupMax
      ),
      elderly: pickFormattedText(
        raw.sensitiveGroups?.elderly,
        fallback.sensitiveGroups.elderly,
        TEXT_LIMITS.sensitiveGroupMax
      ),
      respiratory: pickFormattedText(
        raw.sensitiveGroups?.respiratory,
        fallback.sensitiveGroups.respiratory,
        TEXT_LIMITS.sensitiveGroupMax
      ),
    },
    actionChecklist: checklist.length > 0 ? checklist : fallback.actionChecklist,
  };
}
