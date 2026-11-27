/** Standardized five-band AQI classification used across the application. */
export type AqiCategory = 'Good' | 'Moderate' | 'Poor' | 'Unhealthy' | 'Severe';

/** Target groups receiving tailored air-quality guidance. */
export type SensitiveGroupId = 'children' | 'elderly' | 'respiratory';

/** Normalized air quality observation for a preset or custom location. */
export interface AirQualityReading {
  city: string;
  country?: string;
  aqi: number;
  pm25: number;
  pm10: number;
  isCustom?: boolean;
  dominantPollutant?: string;
  profileNote?: string;
}

/** Curated urban reference profile included out of the box. */
export interface PresetCity extends AirQualityReading {
  id: string;
  country: string;
  dominantPollutant: 'PM2.5' | 'PM10';
  profileNote: string;
}

/** Visual and clinical metadata associated with an AQI severity category. */
export interface AqiCategoryMeta {
  category: AqiCategory;
  rangeLabel: string;
  shortRisk: string;
  healthSummary: string;
  badgeClasses: string;
  textClass: string;
  meterColor: string;
  maskHeadline: string;
  outdoorHeadline: string;
}

/** Scale band definition rendered on the 0-500 AQI severity meter. */
export interface AqiScaleBand {
  category: AqiCategory;
  min: number;
  max: number;
  widthPercent: number;
  barColor: string;
}

/** Actionable recommendations tailored for vulnerable populations. */
export interface SensitiveGroupGuidance {
  children: string;
  elderly: string;
  respiratory: string;
}

/** Structured guidance returned by Gemini or the deterministic fallback engine. */
export interface AirQualityAdvisory {
  summary: string;
  outdoorActivity: string;
  commuteGuidance: string;
  maskRecommendation: string;
  indoorAirTips: string;
  sensitiveGroups: SensitiveGroupGuidance;
  actionChecklist: string[];
}

/** API response contract for POST /api/advisory. */
export interface AdvisoryResponsePayload {
  source: 'gemini' | 'fallback';
  model?: string;
  cached?: boolean;
  warning?: string;
  category: AqiCategory;
  advisory: AirQualityAdvisory;
}

/** Single turn in the grounded Q&A conversation history. */
export interface QaTurn {
  role: 'user' | 'assistant';
  content: string;
}

/** API response contract for POST /api/qa. */
export interface QaResponsePayload {
  source: 'gemini' | 'fallback';
  model?: string;
  warning?: string;
  answer: string;
}

/** Validated payload for follow-up Q&A requests. */
export interface ValidatedQaInput {
  reading: AirQualityReading;
  question: string;
  history: QaTurn[];
}

export interface ValidationSuccess<T> {
  valid: true;
  value: T;
}

export interface ValidationFailure {
  valid: false;
  errors: Record<string, string>;
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;
