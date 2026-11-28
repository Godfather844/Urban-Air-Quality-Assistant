/**
 * @module shared/fallback
 * Deterministic, evidence-based fallback advisory and Q&A builders used when
 * Gemini AI is unavailable, unconfigured, or rate-limited.
 */
import { getAqiCategory, getWhoGuidelineMultiplier } from './aqi.ts';
import { AQI_THRESHOLDS, WHO_24H_GUIDELINES } from './constants.ts';
import type { AirQualityAdvisory, AirQualityReading, AqiCategory } from './types.ts';

type AdvisoryTemplate = Omit<AirQualityAdvisory, 'summary'>;

const CATEGORY_FALLBACK_TEMPLATES: Record<AqiCategory, AdvisoryTemplate> = {
  Good: {
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
  },
  Moderate: {
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
  },
  Poor: {
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
  },
  Unhealthy: {
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
  },
  Severe: {
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
  },
};

function buildCategorySummary(reading: AirQualityReading, category: AqiCategory): string {
  const pm25Ratio = getWhoGuidelineMultiplier(reading.pm25, WHO_24H_GUIDELINES.pm25);

  switch (category) {
    case 'Good':
      return `${reading.city} currently reports Good air quality (AQI ${reading.aqi}, PM2.5 ${reading.pm25} µg/m³). Conditions are safe for routine outdoor exercise, walking commutes, and fresh-air ventilation.`;
    case 'Moderate':
      return `${reading.city} is in the Moderate band (AQI ${reading.aqi}, PM2.5 ${reading.pm25} µg/m³—about ${pm25Ratio}× the WHO 24-hour guideline). Most residents are unaffected, while sensitive lungs benefit from pacing high-exertion outdoor workouts.`;
    case 'Poor':
      return `${reading.city} has Poor air quality (AQI ${reading.aqi}, PM2.5 ${reading.pm25} µg/m³, PM10 ${reading.pm10} µg/m³). Fine particulates are elevated enough to irritate airways during outdoor commutes and prolonged exertion.`;
    case 'Unhealthy':
      return `${reading.city} is experiencing Unhealthy air (AQI ${reading.aqi}, PM2.5 ${reading.pm25} µg/m³—${pm25Ratio}× the WHO 24-hour guideline). Everyone should reduce outdoor time and protect airways during essential travel.`;
    case 'Severe':
      return `${reading.city} is in the Severe emergency band (AQI ${reading.aqi}, PM2.5 ${reading.pm25} µg/m³, PM10 ${reading.pm10} µg/m³). High fine-particle levels affect even healthy adults within minutes outdoors.`;
  }
}

/** Generates a deterministic, evidence-based fallback advisory for any city reading. */
export function buildFallbackAdvisory(reading: AirQualityReading): AirQualityAdvisory {
  const category = getAqiCategory(reading.aqi);
  const template = CATEGORY_FALLBACK_TEMPLATES[category];

  return {
    summary: buildCategorySummary(reading, category),
    ...template,
    sensitiveGroups: { ...template.sensitiveGroups },
    actionChecklist: [...template.actionChecklist],
  };
}

/** Generates a concise, topic-aware fallback Q&A answer using centralized AQI thresholds. */
export function buildFallbackAnswer(reading: AirQualityReading, question: string): string {
  const category = getAqiCategory(reading.aqi);
  const normalizedQuestion = question.toLowerCase();

  if (/(mask|n95|kn95|ffp2|respirator)/.test(normalizedQuestion)) {
    if (reading.aqi <= AQI_THRESHOLDS.goodMax) {
      return `In ${reading.city} (AQI ${reading.aqi}, Good), no mask is required for daily commutes or outdoor time.`;
    }
    if (reading.aqi <= AQI_THRESHOLDS.moderateMax) {
      return `At AQI ${reading.aqi} (Moderate) in ${reading.city}, most people do not need a mask. If you have asthma or commute along dense traffic corridors, a fitted N95/KN95 can reduce exposure to roadside PM2.5 (${reading.pm25} µg/m³).`;
    }
    return `With ${reading.city} at AQI ${reading.aqi} (${category}) and PM2.5 at ${reading.pm25} µg/m³, wear a snug N95, KN95, or FFP2 respirator outdoors. Make sure the nose wire and cheek edges seal tightly—cloth or loose surgical masks let fine PM2.5 particles bypass the filter.`;
  }

  if (/(jog|run|exercise|workout|gym|walk|cycle|bike|sport)/.test(normalizedQuestion)) {
    if (reading.aqi <= AQI_THRESHOLDS.moderateMax) {
      const caveat =
        reading.aqi > AQI_THRESHOLDS.goodMax
          ? 'If you are sensitive to particulates, choose parks away from major roads and keep sessions moderate.'
          : 'Normal intensity and duration are fine.';
      return `Outdoor exercise in ${reading.city} (AQI ${reading.aqi}, ${category}) is generally safe. ${caveat}`;
    }
    return `Outdoor jogging or intense workouts are not advisable in ${reading.city} right now (AQI ${reading.aqi}, ${category}, PM2.5 ${reading.pm25} µg/m³). Heavy breathing pulls fine particles deeper into the lungs—move cardio indoors with filtered air until AQI drops below ${AQI_THRESHOLDS.moderateMax}.`;
  }

  if (/(window|indoor|purifier|hepa|ventila|ac|air conditioner|home)/.test(normalizedQuestion)) {
    if (reading.aqi <= AQI_THRESHOLDS.goodMax) {
      return `Because ${reading.city} is currently Good (AQI ${reading.aqi}), opening windows for cross-ventilation is beneficial and refreshes indoor air.`;
    }
    return `Keep exterior windows closed in ${reading.city} while AQI is ${reading.aqi} (${category}). If you have a HEPA air purifier, run it continuously in occupied rooms, set AC units to recirculate rather than draw outdoor air, and avoid indoor smoke sources like incense or unvented frying.`;
  }

  if (
    /(child|kid|baby|school|elderly|senior|asthma|inhaler|pregnant|heart|copd|lung)/.test(
      normalizedQuestion
    )
  ) {
    const fallback = buildFallbackAdvisory(reading);
    return `For sensitive groups in ${reading.city} (AQI ${reading.aqi}, ${category}): Children: ${fallback.sensitiveGroups.children} Older adults: ${fallback.sensitiveGroups.elderly} Asthma & respiratory conditions: ${fallback.sensitiveGroups.respiratory}`;
  }

  const fallback = buildFallbackAdvisory(reading);
  return `In ${reading.city} (AQI ${reading.aqi} — ${category}, PM2.5 ${reading.pm25} µg/m³, PM10 ${reading.pm10} µg/m³): ${fallback.outdoorActivity} ${fallback.maskRecommendation}`;
}
