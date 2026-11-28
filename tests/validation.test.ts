import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  QA_LIMITS,
  READING_LIMITS,
  formatAssistantText,
  sanitizePlainText,
  validateAirQualityReading,
  validateQuestionInput,
} from '../shared/airQuality.ts';

describe('Air quality reading validation and pollutant edge cases', () => {
  it('accepts zero and exact upper boundary values for AQI, PM2.5, and PM10', () => {
    const lowerBound = validateAirQualityReading({
      city: 'Reykjavik',
      aqi: READING_LIMITS.aqiMin,
      pm25: READING_LIMITS.pm25Min,
      pm10: READING_LIMITS.pm10Min,
    });
    assert.equal(lowerBound.valid, true);
    if (lowerBound.valid) {
      assert.equal(lowerBound.value.aqi, 0);
      assert.equal(lowerBound.value.pm25, 0);
      assert.equal(lowerBound.value.pm10, 0);
    }

    const upperBound = validateAirQualityReading({
      city: "St. John's (East)",
      aqi: READING_LIMITS.aqiMax,
      pm25: READING_LIMITS.pm25Max,
      pm10: READING_LIMITS.pm10Max,
      isCustom: true,
    });
    assert.equal(upperBound.valid, true);
    if (upperBound.valid) {
      assert.equal(upperBound.value.aqi, 500);
      assert.equal(upperBound.value.pm25, 1000);
      assert.equal(upperBound.value.pm10, 2000);
      assert.equal(upperBound.value.dominantPollutant, 'PM2.5');
    }
  });

  it('normalizes string numbers, trims whitespace, and determines dominant pollutant accurately', () => {
    const pm10Dominant = validateAirQualityReading({
      city: '  Mumbai  ',
      country: '  India  ',
      aqi: '156.4',
      pm25: '40.26',
      pm10: '142.84',
    });

    assert.equal(pm10Dominant.valid, true);
    if (pm10Dominant.valid) {
      assert.equal(pm10Dominant.value.city, 'Mumbai');
      assert.equal(pm10Dominant.value.country, 'India');
      assert.equal(pm10Dominant.value.aqi, 156);
      assert.equal(pm10Dominant.value.pm25, 40.3);
      assert.equal(pm10Dominant.value.pm10, 142.8);
      assert.equal(pm10Dominant.value.dominantPollutant, 'PM10');
    }
  });

  it('rejects negative, NaN, Infinity, out-of-range, missing, and non-object inputs', () => {
    assert.equal(validateAirQualityReading(null).valid, false);
    assert.equal(validateAirQualityReading([]).valid, false);
    assert.equal(validateAirQualityReading('Delhi').valid, false);

    const negativeAndOverflow = validateAirQualityReading({
      city: '<script>alert(1)</script>',
      aqi: -1,
      pm25: READING_LIMITS.pm25Max + 0.1,
      pm10: -0.1,
    });
    assert.equal(negativeAndOverflow.valid, false);
    if (!negativeAndOverflow.valid) {
      assert.ok(negativeAndOverflow.errors.city);
      assert.ok(negativeAndOverflow.errors.aqi);
      assert.ok(negativeAndOverflow.errors.pm25);
      assert.ok(negativeAndOverflow.errors.pm10);
    }

    const nanAndMissing = validateAirQualityReading({
      city: 'A',
      aqi: Number.NaN,
      pm25: Number.POSITIVE_INFINITY,
      pm10: '',
    });
    assert.equal(nanAndMissing.valid, false);
    if (!nanAndMissing.valid) {
      assert.ok(nanAndMissing.errors.city);
      assert.ok(nanAndMissing.errors.aqi);
      assert.ok(nanAndMissing.errors.pm25);
      assert.ok(nanAndMissing.errors.pm10);
    }
  });
});

describe('Q&A input validation and text sanitization', () => {
  it('validates question bounds, filters malformed history items, and caps history turns', () => {
    assert.equal(validateQuestionInput(null).valid, false);

    const tooShort = validateQuestionInput({
      reading: { city: 'Delhi', aqi: 320, pm25: 180, pm10: 290 },
      question: 'ok',
    });
    assert.equal(tooShort.valid, false);

    const mixedHistory = [
      null,
      { role: 'system', content: 'ignored' },
      { role: 'user', content: '   ' },
      ...Array.from({ length: 10 }, (_, idx) => ({
        role: idx % 2 === 0 ? 'user' : 'assistant',
        content: `Turn ${idx + 1}\u0007`,
      })),
    ];

    const validQa = validateQuestionInput({
      reading: { city: 'Delhi', aqi: 320, pm25: 180, pm10: 290 },
      question: '  Should I wear an N95 mask on my commute?  ',
      history: mixedHistory,
    });

    assert.equal(validQa.valid, true);
    if (validQa.valid) {
      assert.equal(validQa.value.question, 'Should I wear an N95 mask on my commute?');
      assert.equal(validQa.value.history.length, QA_LIMITS.maxHistoryTurns);
      assert.equal(validQa.value.history[0].content, 'Turn 5');
      assert.equal(validQa.value.history[5].content, 'Turn 10');
    }
  });

  it('sanitizes control characters and formats markdown into clean plain text', () => {
    assert.equal(sanitizePlainText('  Hello\u0000   world\t\n ', 50), 'Hello world');
    assert.equal(sanitizePlainText('Hello', 0), '');

    const raw = '## Summary\n**Wear an N95** __fitted__ `mask`.\u0007\n\n\n\nKeep windows closed.';
    const formatted = formatAssistantText(raw, 200);
    assert.equal(formatted, 'Summary\nWear an N95 fitted mask.\n\nKeep windows closed.');

    const sentenceBoundary = formatAssistantText(
      'Stay indoors today. Use a HEPA air purifier for cleaner bedroom air.',
      28
    );
    assert.equal(sentenceBoundary, 'Stay indoors today.');

    const hardTruncated = formatAssistantText('ParticulateMatterConcentrationWarningMessage', 15);
    assert.equal(hardTruncated, 'ParticulateMatt…');
    assert.equal(formatAssistantText('text', 0), '');
  });
});
