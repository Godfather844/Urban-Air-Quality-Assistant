export type AqiCategory = 'Good' | 'Moderate' | 'Poor' | 'Unhealthy' | 'Severe';

export type SensitiveGroupId = 'children' | 'elderly' | 'respiratory';

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

export interface PresetCity extends AirQualityReading {
  id: string;
  country: string;
  dominantPollutant: 'PM2.5' | 'PM10';
  profileNote: string;
}

export interface AqiCategoryMeta {
  category: AqiCategory;
  rangeLabel: string;
  shortRisk: string;
  healthSummary: string;
  badgeClasses: string;
  meterColor: string;
  maskHeadline: string;
  outdoorHeadline: string;
}

export interface SensitiveGroupGuidance {
  children: string;
  elderly: string;
  respiratory: string;
}

export interface AirQualityAdvisory {
  summary: string;
  outdoorActivity: string;
  commuteGuidance: string;
  maskRecommendation: string;
  indoorAirTips: string;
  sensitiveGroups: SensitiveGroupGuidance;
  actionChecklist: string[];
}

export interface AdvisoryResponsePayload {
  source: 'gemini' | 'fallback';
  model?: string;
  cached?: boolean;
  warning?: string;
  category: AqiCategory;
  advisory: AirQualityAdvisory;
}

export interface QaTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface QaResponsePayload {
  source: 'gemini' | 'fallback';
  model?: string;
  warning?: string;
  answer: string;
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

export const WHO_24H_GUIDELINES = {
  pm25: 15,
  pm10: 45,
} as const;

export const PRESET_CITIES: readonly PresetCity[] = [
  {
    id: 'delhi',
    city: 'Delhi',
    country: 'India',
    aqi: 342,
    pm25: 198,
    pm10: 315,
    dominantPollutant: 'PM2.5',
    profileNote: 'Winter thermal inversion, vehicular emissions, and regional fine particulate buildup.',
  },
  {
    id: 'prayagraj',
    city: 'Prayagraj',
    country: 'India',
    aqi: 248,
    pm25: 134,
    pm10: 226,
    dominantPollutant: 'PM2.5',
    profileNote: 'Elevated Gangetic plain particulate haze with dense road dust and biomass smoke.',
  },
  {
    id: 'mumbai',
    city: 'Mumbai',
    country: 'India',
    aqi: 156,
    pm25: 68,
    pm10: 142,
    dominantPollutant: 'PM10',
    profileNote: 'Coastal humidity trapping construction dust and arterial traffic particulates.',
  },
  {
    id: 'bengaluru',
    city: 'Bengaluru',
    country: 'India',
    aqi: 78,
    pm25: 28,
    pm10: 64,
    dominantPollutant: 'PM10',
    profileNote: 'Moderate urban background levels with localized rush-hour corridor spikes.',
  },
  {
    id: 'london',
    city: 'London',
    country: 'United Kingdom',
    aqi: 42,
    pm25: 11,
    pm10: 24,
    dominantPollutant: 'PM2.5',
    profileNote: 'Well-dispersed Atlantic airflow with low particulate concentrations across inner boroughs.',
  },
  {
    id: 'tokyo',
    city: 'Tokyo',
    country: 'Japan',
    aqi: 36,
    pm25: 9,
    pm10: 19,
    dominantPollutant: 'PM2.5',
    profileNote: 'Clean bay breeze dispersion keeping both fine and coarse particulates well below thresholds.',
  },
] as const;

export const AQI_SCALE_BANDS: ReadonlyArray<{
  category: AqiCategory;
  min: number;
  max: number;
  widthPercent: number;
  barColor: string;
}> = [
  { category: 'Good', min: 0, max: 50, widthPercent: 10, barColor: '#15803d' },
  { category: 'Moderate', min: 51, max: 100, widthPercent: 10, barColor: '#b45309' },
  { category: 'Poor', min: 101, max: 200, widthPercent: 20, barColor: '#c2410c' },
  { category: 'Unhealthy', min: 201, max: 300, widthPercent: 20, barColor: '#b91c1c' },
  { category: 'Severe', min: 301, max: 500, widthPercent: 40, barColor: '#7e22ce' },
];

export function getAqiCategory(aqi: number): AqiCategory {
  const normalized = Number.isFinite(aqi) ? Math.max(0, Math.round(aqi)) : 0;
  if (normalized <= 50) return 'Good';
  if (normalized <= 100) return 'Moderate';
  if (normalized <= 200) return 'Poor';
  if (normalized <= 300) return 'Unhealthy';
  return 'Severe';
}

export function getAqiCategoryMeta(aqi: number): AqiCategoryMeta {
  const category = getAqiCategory(aqi);

  switch (category) {
    case 'Good':
      return {
        category: 'Good',
        rangeLabel: '0–50 AQI',
        shortRisk: 'Minimal health risk',
        healthSummary:
          'Air quality is satisfactory with low particulate burden. Normal outdoor activity and natural indoor ventilation are safe for all groups.',
        badgeClasses: 'bg-emerald-100 text-emerald-950 border border-emerald-700/30',
        meterColor: '#15803d',
        maskHeadline: 'No mask required',
        outdoorHeadline: 'Ideal for all outdoor activities',
      };
    case 'Moderate':
      return {
        category: 'Moderate',
        rangeLabel: '51–100 AQI',
        shortRisk: 'Acceptable with minor sensitivity',
        healthSummary:
          'Air quality is acceptable for most people, though unusually sensitive individuals with asthma or chronic respiratory conditions may notice mild irritation during prolonged outdoor exertion.',
        badgeClasses: 'bg-amber-100 text-amber-950 border border-amber-700/30',
        meterColor: '#b45309',
        maskHeadline: 'Optional near heavy traffic',
        outdoorHeadline: 'Safe for most; pace intense workouts',
      };
    case 'Poor':
      return {
        category: 'Poor',
        rangeLabel: '101–200 AQI',
        shortRisk: 'Elevated risk for sensitive groups',
        healthSummary:
          'Particulate levels can trigger breathing discomfort, coughing, or eye irritation—especially for children, older adults, and people with asthma or heart disease.',
        badgeClasses: 'bg-orange-100 text-orange-950 border border-orange-700/35',
        meterColor: '#c2410c',
        maskHeadline: 'N95/KN95 recommended for commutes',
        outdoorHeadline: 'Reduce prolonged outdoor exertion',
      };
    case 'Unhealthy':
      return {
        category: 'Unhealthy',
        rangeLabel: '201–300 AQI',
        shortRisk: 'Health effects across general public',
        healthSummary:
          'Everyone may begin to experience throat irritation, fatigue, or shortness of breath outdoors. Sensitive groups face a significantly higher risk of symptom flare-ups.',
        badgeClasses: 'bg-red-100 text-red-950 border border-red-700/35',
        meterColor: '#b91c1c',
        maskHeadline: 'Well-fitted N95/FFP2 strongly advised',
        outdoorHeadline: 'Move exercise indoors; limit exposure',
      };
    case 'Severe':
      return {
        category: 'Severe',
        rangeLabel: '301–500 AQI',
        shortRisk: 'Emergency-level respiratory hazard',
        healthSummary:
          'Hazardous particulate concentration poses serious health risks even to healthy adults during brief exposure. Stay indoors with filtered air and avoid all strenuous outdoor activity.',
        badgeClasses: 'bg-purple-100 text-purple-950 border border-purple-700/35',
        meterColor: '#7e22ce',
        maskHeadline: 'Sealed N95/N99 essential if outside',
        outdoorHeadline: 'Avoid outdoor activity completely',
      };
  }
}

export function getAqiScalePosition(aqi: number): number {
  const clamped = Math.max(0, Math.min(500, Number.isFinite(aqi) ? aqi : 0));
  return Number(((clamped / 500) * 100).toFixed(1));
}

export function getWhoGuidelineMultiplier(value: number, guideline: number): number {
  if (!Number.isFinite(value) || value <= 0 || guideline <= 0) {
    return 0;
  }
  return Number((value / guideline).toFixed(1));
}

export function sanitizePlainText(input: string, maxLength = 400): string {
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function formatAssistantText(raw: string, maxLength = 1200): string {
  const cleaned = raw
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
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
  if (lastSentenceEnd > maxLength * 0.6) {
    return sliced.slice(0, lastSentenceEnd + 1).trim();
  }
  return `${sliced.trimEnd()}…`;
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

export function validateAirQualityReading(input: unknown): ValidationResult<AirQualityReading> {
  const errors: Record<string, string> = {};

  if (!input || typeof input !== 'object') {
    return { valid: false, errors: { form: 'Reading payload must be a JSON object.' } };
  }

  const record = input as Record<string, unknown>;

  const rawCity = typeof record.city === 'string' ? sanitizePlainText(record.city, 80) : '';
  if (rawCity.length < 2) {
    errors.city = 'Enter a city name with at least 2 characters.';
  } else if (!/^[a-zA-Z0-9\s.,'()-]+$/.test(rawCity)) {
    errors.city = 'City name contains unsupported special characters.';
  }

  const aqi = parseFiniteNumber(record.aqi);
  if (aqi === null) {
    errors.aqi = 'Enter a valid numeric AQI value.';
  } else if (aqi < 0 || aqi > 500) {
    errors.aqi = 'AQI must be between 0 and 500.';
  }

  const pm25 = parseFiniteNumber(record.pm25);
  if (pm25 === null) {
    errors.pm25 = 'Enter a valid numeric PM2.5 reading.';
  } else if (pm25 < 0 || pm25 > 1000) {
    errors.pm25 = 'PM2.5 must be between 0 and 1000 µg/m³.';
  }

  const pm10 = parseFiniteNumber(record.pm10);
  if (pm10 === null) {
    errors.pm10 = 'Enter a valid numeric PM10 reading.';
  } else if (pm10 < 0 || pm10 > 2000) {
    errors.pm10 = 'PM10 must be between 0 and 2000 µg/m³.';
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  const country =
    typeof record.country === 'string' && record.country.trim().length > 0
      ? sanitizePlainText(record.country, 60)
      : undefined;

  return {
    valid: true,
    value: {
      city: rawCity,
      country,
      aqi: Math.round(aqi!),
      pm25: Number(pm25!.toFixed(1)),
      pm10: Number(pm10!.toFixed(1)),
      isCustom: Boolean(record.isCustom),
      dominantPollutant: pm25! >= pm10! * 0.5 ? 'PM2.5' : 'PM10',
    },
  };
}

export interface ValidatedQaInput {
  reading: AirQualityReading;
  question: string;
  history: QaTurn[];
}

export function validateQuestionInput(input: unknown): ValidationResult<ValidatedQaInput> {
  if (!input || typeof input !== 'object') {
    return { valid: false, errors: { form: 'Request body must be a JSON object.' } };
  }

  const record = input as Record<string, unknown>;
  const readingResult = validateAirQualityReading(record.reading ?? record);

  const errors: Record<string, string> = readingResult.valid ? {} : { ...readingResult.errors };

  const rawQuestion =
    typeof record.question === 'string' ? sanitizePlainText(record.question, 400) : '';
  if (rawQuestion.length < 3) {
    errors.question = 'Ask a question with at least 3 characters.';
  }

  const history: QaTurn[] = [];
  if (Array.isArray(record.history)) {
    for (const item of record.history.slice(-6)) {
      if (
        item &&
        typeof item === 'object' &&
        ((item as Record<string, unknown>).role === 'user' ||
          (item as Record<string, unknown>).role === 'assistant') &&
        typeof (item as Record<string, unknown>).content === 'string'
      ) {
        const sanitizedContent = sanitizePlainText(
          (item as Record<string, unknown>).content as string,
          500
        );
        if (sanitizedContent) {
          history.push({
            role: (item as Record<string, unknown>).role as 'user' | 'assistant',
            content: sanitizedContent,
          });
        }
      }
    }
  }

  if (Object.keys(errors).length > 0 || !readingResult.valid) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    value: {
      reading: readingResult.value,
      question: rawQuestion,
      history,
    },
  };
}

export function buildFallbackAdvisory(reading: AirQualityReading): AirQualityAdvisory {
  const category = getAqiCategory(reading.aqi);
  const pm25Ratio = getWhoGuidelineMultiplier(reading.pm25, WHO_24H_GUIDELINES.pm25);

  switch (category) {
    case 'Good':
      return {
        summary: `${reading.city} currently reports Good air quality (AQI ${reading.aqi}, PM2.5 ${reading.pm25} µg/m³). Conditions are safe for routine outdoor exercise, walking commutes, and fresh-air ventilation.`,
        outdoorActivity:
          'All outdoor activities—including running, cycling, and youth sports—can proceed normally without duration limits.',
        commuteGuidance:
          'Walking, cycling, and open-window commuting are comfortable. Standard traffic corridor awareness applies during peak rush hours.',
        maskRecommendation:
          'No respiratory mask is needed under current particulate concentrations.',
        indoorAirTips:
          'Open opposite windows for cross-ventilation to refresh indoor air and reduce indoor CO2 buildup.',
        sensitiveGroups: {
          children:
            'Normal outdoor play and school sports are safe. Keep routine hydration on hand.',
          elderly:
            'Favorable conditions for morning or evening walks and outdoor errands.',
          respiratory:
            'Low particulate trigger risk today. Keep standard controller medications on schedule as prescribed.',
        },
        actionChecklist: [
          'Enjoy unrestricted outdoor exercise and transit.',
          'Ventilate living and workspaces naturally while air is clean.',
          'Recheck AQI before peak evening traffic if you have severe asthma.',
        ],
      };

    case 'Moderate':
      return {
        summary: `${reading.city} is in the Moderate band (AQI ${reading.aqi}, PM2.5 ${reading.pm25} µg/m³—about ${pm25Ratio}× the WHO 24-hour guideline). Most residents are unaffected, while sensitive lungs benefit from pacing high-exertion outdoor workouts.`,
        outdoorActivity:
          'Outdoor workouts remain suitable for most adults; shift long endurance sessions to early afternoon or parks away from arterial roads.',
        commuteGuidance:
          'Prefer shaded side streets when walking or cycling, and switch vehicle cabin air to recirculation inside congested traffic tunnels.',
        maskRecommendation:
          'Not required for the general public. People with asthma or heavy roadside commuters may carry a lightweight N95/KN95 for traffic bottlenecks.',
        indoorAirTips:
          'Ventilate during lower-traffic hours and keep entryway mats clean to limit tracked-in PM10 road dust.',
        sensitiveGroups: {
          children:
            'Outdoor play is generally fine; shorten intense running if dust is visibly kicked up near playgrounds.',
          elderly:
            'Continue light walks, choosing green corridors and pausing if throat dryness or mild coughing appears.',
          respiratory:
            'Carry a rescue inhaler outdoors and consider lowering workout intensity if you notice chest tightness.',
        },
        actionChecklist: [
          'Keep car cabin air on recirculate during heavy traffic.',
          'Choose parks over roadside routes for jogging or cycling.',
          'Sensitive individuals should monitor mild throat or airway irritation.',
        ],
      };

    case 'Poor':
      return {
        summary: `${reading.city} has Poor air quality (AQI ${reading.aqi}, PM2.5 ${reading.pm25} µg/m³, PM10 ${reading.pm10} µg/m³). Fine particulates are elevated enough to irritate airways during outdoor commutes and prolonged exertion.`,
        outdoorActivity:
          'Cut back prolonged or vigorous outdoor exertion. Replace long outdoor runs with indoor training or shorter low-intensity walks.',
        commuteGuidance:
          'Use closed-cabin transit or keep car windows shut with AC recirculation active. Avoid cycling along high-traffic corridors.',
        maskRecommendation:
          'Wear a well-fitted N95, KN95, or FFP2 respirator for outdoor commutes longer than 15 minutes; cloth and loose surgical masks do not filter PM2.5 effectively.',
        indoorAirTips:
          'Keep exterior windows closed during morning and evening haze peaks. Run a HEPA air purifier in bedrooms and avoid indoor incense or frying without exhaust.',
        sensitiveGroups: {
          children:
            'Move vigorous sports indoors and limit outdoor recess to brief, low-exertion intervals.',
          elderly:
            'Minimize non-essential outdoor errands during peak rush hours and rest indoors if fatigued.',
          respiratory:
            'Wear an N95 outdoors, keep rescue inhalers accessible, and follow your clinician’s asthma or COPD action plan.',
        },
        actionChecklist: [
          'Wear a snug N95/KN95 mask during outdoor commutes.',
          'Keep windows shut and run HEPA filtration indoors if available.',
          'Move high-intensity cardio indoors until AQI drops below 100.',
        ],
      };

    case 'Unhealthy':
      return {
        summary: `${reading.city} is experiencing Unhealthy air (AQI ${reading.aqi}, PM2.5 ${reading.pm25} µg/m³—${pm25Ratio}× the WHO 24-hour guideline). Everyone should reduce outdoor time and protect airways during essential travel.`,
        outdoorActivity:
          'Avoid outdoor workouts, jogging, and prolonged outdoor gatherings. Move all exercise to an indoor space with filtered air.',
        commuteGuidance:
          'Consolidate trips, work remotely if possible, and keep vehicle cabin recirculation on with clean cabin filters. Avoid open two-wheeler rides without respirator protection.',
        maskRecommendation:
          'Wear a tightly sealed N95, KN95, or FFP2 respirator whenever stepping outdoors. Pinch the nose bridge firmly to prevent side leaks.',
        indoorAirTips:
          'Seal window and door gaps where haze enters, run a HEPA purifier continuously on medium-high, and damp-mop floors instead of dry sweeping.',
        sensitiveGroups: {
          children:
            'Keep children indoors for play and sports; monitor closely for coughing, wheezing, or watery eyes.',
          elderly:
            'Stay indoors with filtered air, postpone non-urgent outdoor errands, and stay well hydrated.',
          respiratory:
            'Avoid outdoor exposure whenever possible, keep rescue medication within reach, and contact a healthcare provider if symptoms worsen.',
        },
        actionChecklist: [
          'Cancel outdoor workouts and keep exposure brief.',
          'Use a properly sealed N95/FFP2 respirator for all outdoor travel.',
          'Run indoor HEPA air purification and avoid indoor smoke sources.',
        ],
      };

    case 'Severe':
      return {
        summary: `${reading.city} is in the Severe emergency band (AQI ${reading.aqi}, PM2.5 ${reading.pm25} µg/m³, PM10 ${reading.pm10} µg/m³). High fine-particle levels affect even healthy adults within minutes outdoors.`,
        outdoorActivity:
          'Suspend all outdoor exercise and non-essential time outside. Remain indoors until particulate levels decline.',
        commuteGuidance:
          'Postpone discretionary travel or work remotely if feasible. For essential travel, use sealed transit with air recirculation and wear a certified respirator door-to-door.',
        maskRecommendation:
          'A properly sealed N95, N99, or FFP2/FFP3 respirator is mandatory for any outdoor movement. Replace masks once breathing resistance increases or the seal loosens.',
        indoorAirTips:
          'Create a dedicated clean-air room with windows sealed and a HEPA purifier running continuously. Avoid candles, tobacco smoke, or unvented cooking.',
        sensitiveGroups: {
          children:
            'Keep indoors all day with filtered air; watch closely for persistent coughing, chest discomfort, or unusual fatigue.',
          elderly:
            'Remain strictly indoors, monitor blood pressure or breathing comfort if you have heart/lung conditions, and arrange home deliveries for essentials.',
          respiratory:
            'Stay in a HEPA-filtered room, follow your emergency respiratory action plan, and seek prompt medical care for wheezing or shortness of breath.',
        },
        actionChecklist: [
          'Stay indoors and cancel all outdoor physical activity.',
          'Wear a sealed N95/N99 respirator for any unavoidable trip outside.',
          'Run HEPA filtration continuously in sleeping and living spaces.',
        ],
      };
  }
}

export function buildFallbackAnswer(reading: AirQualityReading, question: string): string {
  const category = getAqiCategory(reading.aqi);
  const q = question.toLowerCase();

  if (/(mask|n95|kn95|ffp2|respirator)/.test(q)) {
    if (reading.aqi <= 50) {
      return `In ${reading.city} (AQI ${reading.aqi}, Good), no mask is required for daily commutes or outdoor time.`;
    }
    if (reading.aqi <= 100) {
      return `At AQI ${reading.aqi} (Moderate) in ${reading.city}, most people do not need a mask. If you have asthma or commute along dense traffic corridors, a fitted N95/KN95 can reduce exposure to roadside PM2.5 (${reading.pm25} µg/m³).`;
    }
    return `With ${reading.city} at AQI ${reading.aqi} (${category}) and PM2.5 at ${reading.pm25} µg/m³, wear a snug N95, KN95, or FFP2 respirator outdoors. Make sure the nose wire and cheek edges seal tightly—cloth or loose surgical masks let fine PM2.5 particles bypass the filter.`;
  }

  if (/(jog|run|exercise|workout|gym|walk|cycle|bike|sport)/.test(q)) {
    if (reading.aqi <= 100) {
      return `Outdoor exercise in ${reading.city} (AQI ${reading.aqi}, ${category}) is generally safe. ${reading.aqi > 50 ? 'If you are sensitive to particulates, choose parks away from major roads and keep sessions moderate.' : 'Normal intensity and duration are fine.'}`;
    }
    return `Outdoor jogging or intense workouts are not advisable in ${reading.city} right now (AQI ${reading.aqi}, ${category}, PM2.5 ${reading.pm25} µg/m³). Heavy breathing pulls fine particles deeper into the lungs—move cardio indoors with filtered air until AQI drops below 100.`;
  }

  if (/(window|indoor|purifier|hepa|ventila|ac|air conditioner|home)/.test(q)) {
    if (reading.aqi <= 50) {
      return `Because ${reading.city} is currently Good (AQI ${reading.aqi}), opening windows for cross-ventilation is beneficial and refreshes indoor air.`;
    }
    return `Keep exterior windows closed in ${reading.city} while AQI is ${reading.aqi} (${category}). If you have a HEPA air purifier, run it continuously in occupied rooms, set AC units to recirculate rather than draw outdoor air, and avoid indoor smoke sources like incense or unvented frying.`;
  }

  if (/(child|kid|baby|school|elderly|senior|asthma|inhaler|pregnant|heart|copd|lung)/.test(q)) {
    const fallback = buildFallbackAdvisory(reading);
    return `For sensitive groups in ${reading.city} (AQI ${reading.aqi}, ${category}): Children: ${fallback.sensitiveGroups.children} Older adults: ${fallback.sensitiveGroups.elderly} Asthma & respiratory conditions: ${fallback.sensitiveGroups.respiratory}`;
  }

  const fallback = buildFallbackAdvisory(reading);
  return `In ${reading.city} (AQI ${reading.aqi} — ${category}, PM2.5 ${reading.pm25} µg/m³, PM10 ${reading.pm10} µg/m³): ${fallback.outdoorActivity} ${fallback.maskRecommendation}`;
}
