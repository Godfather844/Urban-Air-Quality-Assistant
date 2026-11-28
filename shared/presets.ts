/**
 * @module shared/presets
 * Curated urban air quality reference profiles spanning all five AQI bands.
 */
import type { PresetCity } from './types.ts';

/** Reference cities available immediately without an external weather API. */
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
