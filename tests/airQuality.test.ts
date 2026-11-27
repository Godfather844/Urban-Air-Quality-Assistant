import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { describe, it } from 'node:test';
import { createApiApp } from '../server/app.ts';
import { TtlCache } from '../server/cache.ts';
import {
  PRESET_CITIES,
  buildFallbackAdvisory,
  buildFallbackAnswer,
  formatAssistantText,
  getAqiCategory,
  getAqiCategoryMeta,
  getAqiScalePosition,
  getWhoGuidelineMultiplier,
  validateAirQualityReading,
  validateQuestionInput,
} from '../shared/airQuality.ts';

describe('AQI category mapping and calibration', () => {
  it('maps boundary values accurately across all five AQI bands', () => {
    assert.equal(getAqiCategory(0), 'Good');
    assert.equal(getAqiCategory(50), 'Good');
    assert.equal(getAqiCategory(51), 'Moderate');
    assert.equal(getAqiCategory(100), 'Moderate');
    assert.equal(getAqiCategory(101), 'Poor');
    assert.equal(getAqiCategory(200), 'Poor');
    assert.equal(getAqiCategory(201), 'Unhealthy');
    assert.equal(getAqiCategory(300), 'Unhealthy');
    assert.equal(getAqiCategory(301), 'Severe');
    assert.equal(getAqiCategory(500), 'Severe');
  });

  it('clamps scale position and computes WHO guideline multipliers cleanly', () => {
    assert.equal(getAqiScalePosition(-10), 0);
    assert.equal(getAqiScalePosition(250), 50);
    assert.equal(getAqiScalePosition(700), 100);
    assert.equal(getWhoGuidelineMultiplier(30, 15), 2);
    assert.equal(getWhoGuidelineMultiplier(0, 15), 0);
  });

  it('provides realistic preset cities including Delhi, Prayagraj, Bengaluru, Mumbai, London, and Tokyo', () => {
    const names = PRESET_CITIES.map((city) => city.city);
    for (const expected of ['Delhi', 'Prayagraj', 'Bengaluru', 'Mumbai', 'London', 'Tokyo']) {
      assert.ok(names.includes(expected), `Expected preset city ${expected}`);
    }
    for (const preset of PRESET_CITIES) {
      const meta = getAqiCategoryMeta(preset.aqi);
      assert.ok(meta.healthSummary.length > 20);
      assert.ok(meta.textClass.startsWith('text-'));
    }
  });
});

describe('Input validation', () => {
  it('accepts valid custom air quality readings and normalizes decimals', () => {
    const result = validateAirQualityReading({
      city: '  Pune  ',
      aqi: '164',
      pm25: 74.26,
      pm10: '138.4',
      isCustom: true,
    });

    assert.equal(result.valid, true);
    if (result.valid) {
      assert.equal(result.value.city, 'Pune');
      assert.equal(result.value.aqi, 164);
      assert.equal(result.value.pm25, 74.3);
      assert.equal(result.value.pm10, 138.4);
      assert.equal(result.value.isCustom, true);
    }
  });

  it('rejects out-of-range metrics, empty city names, and invalid characters', () => {
    const invalid = validateAirQualityReading({
      city: '<script>alert(1)</script>',
      aqi: 750,
      pm25: -5,
      pm10: 'not-a-number',
    });

    assert.equal(invalid.valid, false);
    if (!invalid.valid) {
      assert.ok(invalid.errors.city);
      assert.ok(invalid.errors.aqi);
      assert.ok(invalid.errors.pm25);
      assert.ok(invalid.errors.pm10);
    }
  });

  it('validates Q&A inputs and bounds conversation history', () => {
    const shortQuestion = validateQuestionInput({
      reading: { city: 'Delhi', aqi: 320, pm25: 180, pm10: 290 },
      question: 'hi',
    });
    assert.equal(shortQuestion.valid, false);

    const longHistory = Array.from({ length: 12 }, (_, idx) => ({
      role: idx % 2 === 0 ? 'user' : 'assistant',
      content: `Turn ${idx + 1}`,
    }));

    const validQa = validateQuestionInput({
      reading: { city: 'Delhi', aqi: 320, pm25: 180, pm10: 290 },
      question: 'Should I wear an N95 mask on my commute?',
      history: longHistory,
    });

    assert.equal(validQa.valid, true);
    if (validQa.valid) {
      assert.equal(validQa.value.history.length, 6);
    }
  });
});

describe('Assistant response formatting and fallback guidance', () => {
  it('cleans markdown syntax, strips control chars, and enforces max length', () => {
    const raw = '## Heading\n**Wear an N95** `mask` today.\u0007\n\n\n\nStay safe outdoors.';
    const formatted = formatAssistantText(raw, 200);
    assert.equal(formatted, 'Heading\nWear an N95 mask today.\n\nStay safe outdoors.');

    const truncated = formatAssistantText(
      'First sentence. Second sentence is much longer than the limit.',
      25
    );
    assert.ok(truncated.length <= 26);
  });

  it('builds complete fallback advisories for every AQI band', () => {
    const sampleAqis = [25, 75, 150, 250, 410];
    for (const aqi of sampleAqis) {
      const advisory = buildFallbackAdvisory({
        city: 'Testville',
        aqi,
        pm25: Math.round(aqi * 0.55),
        pm10: Math.round(aqi * 0.9),
      });
      assert.ok(advisory.summary.includes('Testville'));
      assert.ok(advisory.outdoorActivity.length > 15);
      assert.ok(advisory.commuteGuidance.length > 15);
      assert.ok(advisory.maskRecommendation.length > 15);
      assert.ok(advisory.sensitiveGroups.children.length > 15);
      assert.ok(advisory.sensitiveGroups.elderly.length > 15);
      assert.ok(advisory.sensitiveGroups.respiratory.length > 15);
      assert.equal(advisory.actionChecklist.length, 3);
    }
  });

  it('produces topic-aware fallback Q&A answers', () => {
    const reading = { city: 'Delhi', aqi: 342, pm25: 198, pm10: 315 };
    const maskAnswer = buildFallbackAnswer(reading, 'Do I need an N95 mask?');
    assert.match(maskAnswer, /N95|KN95|FFP2/);

    const windowAnswer = buildFallbackAnswer(reading, 'Should I open my windows?');
    assert.match(windowAnswer, /windows closed|HEPA/i);
  });
});

describe('Bounded TtlCache', () => {
  it('expires stale entries and evicts the oldest entry when at capacity', () => {
    const cache = new TtlCache<string>(1_000, 2);
    cache.set('first', 'v1', 100);
    cache.set('second', 'v2', 200);
    assert.equal(cache.get('first', 500), 'v1');
    assert.equal(cache.size, 2);

    cache.set('third', 'v3', 300);
    assert.equal(cache.get('first', 500), undefined);
    assert.equal(cache.get('second', 500), 'v2');
    assert.equal(cache.get('third', 500), 'v3');

    assert.equal(cache.get('second', 1_250), undefined);
    assert.equal(cache.size, 1);
  });
});

describe('Express API integration tests', () => {
  it('validates requests, handles malformed JSON and 404s, and returns structured fallbacks', async () => {
    const previousKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    const app = createApiApp({ rateLimitMaxRequests: 20, rateLimitWindowMs: 60_000 });
    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${port}`;

    try {
      const healthRes = await fetch(`${baseUrl}/api/health`);
      assert.equal(healthRes.status, 200);
      assert.equal(healthRes.headers.get('x-content-type-options'), 'nosniff');
      const healthBody = (await healthRes.json()) as { status: string; presetCount: number };
      assert.equal(healthBody.status, 'ok');
      assert.equal(healthBody.presetCount, PRESET_CITIES.length);

      const unknownRes = await fetch(`${baseUrl}/api/does-not-exist`);
      assert.equal(unknownRes.status, 404);

      const malformedRes = await fetch(`${baseUrl}/api/advisory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{invalid-json',
      });
      assert.equal(malformedRes.status, 400);

      const badAdvisoryRes = await fetch(`${baseUrl}/api/advisory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: 'X', aqi: 999, pm25: -1, pm10: 10 }),
      });
      assert.equal(badAdvisoryRes.status, 400);

      const okAdvisoryRes = await fetch(`${baseUrl}/api/advisory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: 'Prayagraj', aqi: 248, pm25: 134, pm10: 226 }),
      });
      assert.equal(okAdvisoryRes.status, 200);
      const advisoryBody = (await okAdvisoryRes.json()) as {
        source: string;
        category: string;
        advisory: { maskRecommendation: string };
      };
      assert.equal(advisoryBody.source, 'fallback');
      assert.equal(advisoryBody.category, 'Unhealthy');
      assert.ok(advisoryBody.advisory.maskRecommendation.length > 10);

      const okQaRes = await fetch(`${baseUrl}/api/qa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reading: { city: 'London', aqi: 42, pm25: 11, pm10: 24 },
          question: 'Is it safe to jog outside?',
        }),
      });
      assert.equal(okQaRes.status, 200);
      const qaBody = (await okQaRes.json()) as { source: string; answer: string };
      assert.equal(qaBody.source, 'fallback');
      assert.match(qaBody.answer, /safe|Good/i);
    } finally {
      if (previousKey !== undefined) {
        process.env.GEMINI_API_KEY = previousKey;
      }
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('enforces per-IP rate limiting with HTTP 429 and Retry-After header', async () => {
    const previousKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    const app = createApiApp({ rateLimitMaxRequests: 2, rateLimitWindowMs: 60_000 });
    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${port}`;

    try {
      const payload = JSON.stringify({ city: 'Tokyo', aqi: 36, pm25: 9, pm10: 19 });
      const headers = { 'Content-Type': 'application/json' };

      const first = await fetch(`${baseUrl}/api/advisory`, { method: 'POST', headers, body: payload });
      const second = await fetch(`${baseUrl}/api/advisory`, { method: 'POST', headers, body: payload });
      const third = await fetch(`${baseUrl}/api/advisory`, { method: 'POST', headers, body: payload });

      assert.equal(first.status, 200);
      assert.equal(second.status, 200);
      assert.equal(third.status, 429);
      assert.ok(Number(third.headers.get('retry-after')) >= 1);
    } finally {
      if (previousKey !== undefined) {
        process.env.GEMINI_API_KEY = previousKey;
      }
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
