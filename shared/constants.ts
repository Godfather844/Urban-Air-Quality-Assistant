/**
 * @module shared/constants
 * Single source of truth for AQI category thresholds, particulate limits,
 * WHO 24-hour guidelines, and assistant text bounds.
 */
import type { AqiScaleBand } from './types.ts';

/** Canonical upper bounds for the five AQI severity categories. */
export const AQI_THRESHOLDS = {
  goodMax: 50,
  moderateMax: 100,
  poorMax: 200,
  unhealthyMax: 300,
  severeMax: 500,
} as const;

/** World Health Organization 24-hour particulate guideline limits (µg/m³). */
export const WHO_24H_GUIDELINES = {
  pm25: 15,
  pm10: 45,
} as const;

/** Ratio threshold used to infer whether PM2.5 or PM10 is the dominant pollutant. */
export const DOMINANT_PM25_TO_PM10_RATIO = 0.5;

/** Numeric and string bounds enforced on air quality reading inputs. */
export const READING_LIMITS = {
  cityMinLength: 2,
  cityMaxLength: 80,
  countryMaxLength: 60,
  aqiMin: 0,
  aqiMax: AQI_THRESHOLDS.severeMax,
  pm25Min: 0,
  pm25Max: 1000,
  pm10Min: 0,
  pm10Max: 2000,
} as const;

/** Input bounds enforced on follow-up Q&A requests. */
export const QA_LIMITS = {
  questionMinLength: 3,
  questionMaxLength: 400,
  maxHistoryTurns: 6,
  historyContentMaxLength: 500,
} as const;

/** Output length caps enforced on formatted AI and fallback guidance fields. */
export const TEXT_LIMITS = {
  defaultFormattedMax: 1200,
  sentenceTruncationRatio: 0.6,
  summaryMax: 420,
  guidanceFieldMax: 320,
  sensitiveGroupMax: 300,
  checklistItemMax: 180,
  maxChecklistItems: 4,
  qaAnswerMax: 900,
} as const;

/** Proportional segments rendered on the 0–500 AQI visual severity meter. */
export const AQI_SCALE_BANDS: readonly AqiScaleBand[] = [
  {
    category: 'Good',
    min: READING_LIMITS.aqiMin,
    max: AQI_THRESHOLDS.goodMax,
    widthPercent: 10,
    barColor: '#15803d',
  },
  {
    category: 'Moderate',
    min: AQI_THRESHOLDS.goodMax + 1,
    max: AQI_THRESHOLDS.moderateMax,
    widthPercent: 10,
    barColor: '#b45309',
  },
  {
    category: 'Poor',
    min: AQI_THRESHOLDS.moderateMax + 1,
    max: AQI_THRESHOLDS.poorMax,
    widthPercent: 20,
    barColor: '#c2410c',
  },
  {
    category: 'Unhealthy',
    min: AQI_THRESHOLDS.poorMax + 1,
    max: AQI_THRESHOLDS.unhealthyMax,
    widthPercent: 20,
    barColor: '#b91c1c',
  },
  {
    category: 'Severe',
    min: AQI_THRESHOLDS.unhealthyMax + 1,
    max: AQI_THRESHOLDS.severeMax,
    widthPercent: 40,
    barColor: '#7e22ce',
  },
] as const;
