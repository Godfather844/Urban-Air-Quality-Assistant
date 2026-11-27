import { READING_LIMITS } from './presets.ts';
import type { AqiCategory, AqiCategoryMeta } from './types.ts';

const AQI_CATEGORY_METADATA: Record<AqiCategory, AqiCategoryMeta> = {
  Good: {
    category: 'Good',
    rangeLabel: '0–50 AQI',
    shortRisk: 'Minimal health risk',
    healthSummary:
      'Air quality is satisfactory with low particulate burden. Normal outdoor activity and natural indoor ventilation are safe for all groups.',
    badgeClasses: 'bg-emerald-100 text-emerald-950 border border-emerald-700/30',
    textClass: 'text-emerald-800',
    meterColor: '#15803d',
    maskHeadline: 'No mask required',
    outdoorHeadline: 'Ideal for all outdoor activities',
  },
  Moderate: {
    category: 'Moderate',
    rangeLabel: '51–100 AQI',
    shortRisk: 'Acceptable with minor sensitivity',
    healthSummary:
      'Air quality is acceptable for most people, though unusually sensitive individuals with asthma or chronic respiratory conditions may notice mild irritation during prolonged outdoor exertion.',
    badgeClasses: 'bg-amber-100 text-amber-950 border border-amber-700/30',
    textClass: 'text-amber-800',
    meterColor: '#b45309',
    maskHeadline: 'Optional near heavy traffic',
    outdoorHeadline: 'Safe for most; pace intense workouts',
  },
  Poor: {
    category: 'Poor',
    rangeLabel: '101–200 AQI',
    shortRisk: 'Elevated risk for sensitive groups',
    healthSummary:
      'Particulate levels can trigger breathing discomfort, coughing, or eye irritation—especially for children, older adults, and people with asthma or heart disease.',
    badgeClasses: 'bg-orange-100 text-orange-950 border border-orange-700/35',
    textClass: 'text-orange-800',
    meterColor: '#c2410c',
    maskHeadline: 'N95/KN95 recommended for commutes',
    outdoorHeadline: 'Reduce prolonged outdoor exertion',
  },
  Unhealthy: {
    category: 'Unhealthy',
    rangeLabel: '201–300 AQI',
    shortRisk: 'Health effects across general public',
    healthSummary:
      'Everyone may begin to experience throat irritation, fatigue, or shortness of breath outdoors. Sensitive groups face a significantly higher risk of symptom flare-ups.',
    badgeClasses: 'bg-red-100 text-red-950 border border-red-700/35',
    textClass: 'text-red-800',
    meterColor: '#b91c1c',
    maskHeadline: 'Well-fitted N95/FFP2 strongly advised',
    outdoorHeadline: 'Move exercise indoors; limit exposure',
  },
  Severe: {
    category: 'Severe',
    rangeLabel: '301–500 AQI',
    shortRisk: 'Emergency-level respiratory hazard',
    healthSummary:
      'Hazardous particulate concentration poses serious health risks even to healthy adults during brief exposure. Stay indoors with filtered air and avoid all strenuous outdoor activity.',
    badgeClasses: 'bg-purple-100 text-purple-950 border border-purple-700/35',
    textClass: 'text-purple-900',
    meterColor: '#7e22ce',
    maskHeadline: 'Sealed N95/N99 essential if outside',
    outdoorHeadline: 'Avoid outdoor activity completely',
  },
};

/** Maps a numeric AQI value into one of the five standard severity categories. */
export function getAqiCategory(aqi: number): AqiCategory {
  const normalized = Number.isFinite(aqi) ? Math.max(0, Math.round(aqi)) : 0;
  if (normalized <= 50) return 'Good';
  if (normalized <= 100) return 'Moderate';
  if (normalized <= 200) return 'Poor';
  if (normalized <= 300) return 'Unhealthy';
  return 'Severe';
}

/** Returns calibrated visual tokens and clinical risk copy for an AQI reading. */
export function getAqiCategoryMeta(aqi: number): AqiCategoryMeta {
  return AQI_CATEGORY_METADATA[getAqiCategory(aqi)];
}

/** Converts an AQI reading into a clamped 0–100 percentage for the severity meter. */
export function getAqiScalePosition(aqi: number): number {
  const clamped = Math.max(
    READING_LIMITS.aqiMin,
    Math.min(READING_LIMITS.aqiMax, Number.isFinite(aqi) ? aqi : 0)
  );
  return Number(((clamped / READING_LIMITS.aqiMax) * 100).toFixed(1));
}

/** Computes how many times a particulate measurement exceeds its WHO 24-hour guideline. */
export function getWhoGuidelineMultiplier(value: number, guideline: number): number {
  if (!Number.isFinite(value) || value <= 0 || guideline <= 0) {
    return 0;
  }
  return Number((value / guideline).toFixed(1));
}
