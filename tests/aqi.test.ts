import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  AQI_SCALE_BANDS,
  AQI_THRESHOLDS,
  PRESET_CITIES,
  WHO_24H_GUIDELINES,
  getAqiCategory,
  getAqiCategoryMeta,
  getAqiScalePosition,
  getWhoGuidelineMultiplier,
  validateAirQualityReading,
} from '../shared/airQuality.ts';

describe('AQI category boundaries and classification', () => {
  it('maps exact lower and upper boundaries across all five AQI bands', () => {
    const cases: ReadonlyArray<[number, string]> = [
      [0, 'Good'],
      [50, 'Good'],
      [51, 'Moderate'],
      [100, 'Moderate'],
      [101, 'Poor'],
      [200, 'Poor'],
      [201, 'Unhealthy'],
      [300, 'Unhealthy'],
      [301, 'Severe'],
      [500, 'Severe'],
    ];

    for (const [aqi, expected] of cases) {
      assert.equal(getAqiCategory(aqi), expected, `Expected AQI ${aqi} to map to ${expected}`);
    }
  });

  it('handles decimal rounding, out-of-range, negative, and non-finite AQI values safely', () => {
    assert.equal(getAqiCategory(50.4), 'Good');
    assert.equal(getAqiCategory(50.5), 'Moderate');
    assert.equal(getAqiCategory(-25), 'Good');
    assert.equal(getAqiCategory(750), 'Severe');
    assert.equal(getAqiCategory(Number.NaN), 'Good');
    assert.equal(getAqiCategory(Number.POSITIVE_INFINITY), 'Good');
    assert.equal(getAqiCategory(Number.NEGATIVE_INFINITY), 'Good');
  });

  it('keeps AQI_SCALE_BANDS contiguous and aligned with AQI_THRESHOLDS', () => {
    const totalWidth = AQI_SCALE_BANDS.reduce((sum, band) => sum + band.widthPercent, 0);
    assert.equal(totalWidth, 100);
    assert.equal(AQI_SCALE_BANDS[0].min, 0);
    assert.equal(AQI_SCALE_BANDS[0].max, AQI_THRESHOLDS.goodMax);
    assert.equal(AQI_SCALE_BANDS[4].max, AQI_THRESHOLDS.severeMax);

    for (let i = 1; i < AQI_SCALE_BANDS.length; i += 1) {
      assert.equal(AQI_SCALE_BANDS[i].min, AQI_SCALE_BANDS[i - 1].max + 1);
    }
  });
});

describe('Scale position and PM2.5/PM10 WHO guideline calculations', () => {
  it('clamps AQI scale position to 0–100 across normal and extreme values', () => {
    assert.equal(getAqiScalePosition(-50), 0);
    assert.equal(getAqiScalePosition(0), 0);
    assert.equal(getAqiScalePosition(250), 50);
    assert.equal(getAqiScalePosition(500), 100);
    assert.equal(getAqiScalePosition(999), 100);
    assert.equal(getAqiScalePosition(Number.NaN), 0);
    assert.equal(getAqiScalePosition(Number.POSITIVE_INFINITY), 0);
  });

  it('computes WHO 24-hour guideline multipliers safely for PM2.5 and PM10 edge cases', () => {
    assert.equal(getWhoGuidelineMultiplier(0, WHO_24H_GUIDELINES.pm25), 0);
    assert.equal(getWhoGuidelineMultiplier(-12, WHO_24H_GUIDELINES.pm25), 0);
    assert.equal(getWhoGuidelineMultiplier(Number.NaN, WHO_24H_GUIDELINES.pm10), 0);
    assert.equal(getWhoGuidelineMultiplier(Number.POSITIVE_INFINITY, WHO_24H_GUIDELINES.pm10), 0);
    assert.equal(getWhoGuidelineMultiplier(30, 0), 0);
    assert.equal(getWhoGuidelineMultiplier(WHO_24H_GUIDELINES.pm25, WHO_24H_GUIDELINES.pm25), 1);
    assert.equal(getWhoGuidelineMultiplier(WHO_24H_GUIDELINES.pm10, WHO_24H_GUIDELINES.pm10), 1);
    assert.equal(getWhoGuidelineMultiplier(198, WHO_24H_GUIDELINES.pm25), 13.2);
    assert.equal(getWhoGuidelineMultiplier(226, WHO_24H_GUIDELINES.pm10), 5);
  });

  it('ensures all preset cities pass reading validation and expose complete category metadata', () => {
    const names = PRESET_CITIES.map((city) => city.city);
    for (const expected of ['Delhi', 'Prayagraj', 'Bengaluru', 'Mumbai', 'London', 'Tokyo']) {
      assert.ok(names.includes(expected), `Missing required preset city: ${expected}`);
    }

    for (const preset of PRESET_CITIES) {
      const validation = validateAirQualityReading(preset);
      assert.equal(validation.valid, true, `Preset ${preset.city} failed validation`);
      const meta = getAqiCategoryMeta(preset.aqi);
      assert.ok(meta.healthSummary.length > 20);
      assert.ok(meta.textClass.startsWith('text-'));
      assert.ok(meta.badgeClasses.length > 10);
    }
  });
});
