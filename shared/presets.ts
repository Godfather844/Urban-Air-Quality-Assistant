import type { AqiScaleBand, PresetCity } from './types.ts';

/** World Health Organization 24-hour particulate guideline limits (µg/m³). */
export const WHO_24H_GUIDELINES = {
  pm25: 15,
  pm10: 45,
} as const;

/** Numeric and string bounds enforced on air quality reading inputs. */
export const READING_LIMITS = {
  cityMinLength: 2,
  cityMaxLength: 80,
  countryMaxLength: 60,
  aqiMin: 0,
  aqiMax: 500,
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

/** Curated reference cities spanning all five AQI severity categories. */
export const PRESET_CITIES: readonly PresetCity[] = [
  {
    id: 'delhi',
    city: 'Delhi',
    country: 'India',
    aqi: 342,
    pm25: 198,
    pm10: 315,
    dominantPollutant: 'PM2.5',
    profileNote:
      'Winter thermal inversion, vehicular emissions, and regional fine particulate buildup.',
  },
  {
    id: 'prayagraj',
    city: 'Prayagraj',
    country: 'India',
    aqi: 248,
    pm25: 134,
    pm10: 226,
    dominantPollutant: 'PM2.5',
    profileNote:
      'Elevated Gangetic plain particulate haze with dense road dust and biomass smoke.',
  },
  {
    id: 'mumbai',
    city: 'Mumbai',
    country: 'India',
    aqi: 156,
    pm25: 68,
    pm10: 142,
    dominantPollutant: 'PM10',
    profileNote:
      'Coastal humidity trapping construction dust and arterial traffic particulates.',
  },
  {
    id: 'bengaluru',
    city: 'Bengaluru',
    country: 'India',
    aqi: 78,
    pm25: 28,
    pm10: 64,
    dominantPollutant: 'PM10',
    profileNote:
      'Moderate urban background levels with localized rush-hour corridor spikes.',
  },
  {
    id: 'london',
    city: 'London',
    country: 'United Kingdom',
    aqi: 42,
    pm25: 11,
    pm10: 24,
    dominantPollutant: 'PM2.5',
    profileNote:
      'Well-dispersed Atlantic airflow with low particulate concentrations across inner boroughs.',
  },
  {
    id: 'tokyo',
    city: 'Tokyo',
    country: 'Japan',
    aqi: 36,
    pm25: 9,
    pm10: 19,
    dominantPollutant: 'PM2.5',
    profileNote:
      'Clean bay breeze dispersion keeping both fine and coarse particulates well below thresholds.',
  },
] as const;

/** Proportional segments for the 0–500 AQI visual severity meter. */
export const AQI_SCALE_BANDS: readonly AqiScaleBand[] = [
  { category: 'Good', min: 0, max: 50, widthPercent: 10, barColor: '#15803d' },
  { category: 'Moderate', min: 51, max: 100, widthPercent: 10, barColor: '#b45309' },
  { category: 'Poor', min: 101, max: 200, widthPercent: 20, barColor: '#c2410c' },
  { category: 'Unhealthy', min: 201, max: 300, widthPercent: 20, barColor: '#b91c1c' },
  { category: 'Severe', min: 301, max: 500, widthPercent: 40, barColor: '#7e22ce' },
] as const;
