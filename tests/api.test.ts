import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { describe, it } from 'node:test';
import { createApiApp } from '../server/app.ts';
import { PRESET_CITIES } from '../shared/airQuality.ts';

async function withTestServer(
  options: { rateLimitMaxRequests?: number; rateLimitWindowMs?: number },
  fn: (baseUrl: string) => Promise<void>
): Promise<void> {
  const previousKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  const app = createApiApp(options);
  const server = app.listen(0);
  const { port } = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    await fn(baseUrl);
  } finally {
    if (previousKey !== undefined) {
      process.env.GEMINI_API_KEY = previousKey;
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

describe('Express API integration tests', () => {
  it('serves health, presets, security headers, validation 400s, 404s, and structured fallbacks', async () => {
    await withTestServer({ rateLimitMaxRequests: 25, rateLimitWindowMs: 60_000 }, async (baseUrl) => {
      const healthRes = await fetch(`${baseUrl}/api/health`);
      assert.equal(healthRes.status, 200);
      assert.equal(healthRes.headers.get('x-content-type-options'), 'nosniff');
      assert.equal(healthRes.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
      assert.ok(healthRes.headers.get('permissions-policy'));
      const healthBody = (await healthRes.json()) as {
        status: string;
        geminiConfigured: boolean;
        presetCount: number;
      };
      assert.equal(healthBody.status, 'ok');
      assert.equal(healthBody.geminiConfigured, false);
      assert.equal(healthBody.presetCount, PRESET_CITIES.length);

      const presetsRes = await fetch(`${baseUrl}/api/presets`);
      assert.equal(presetsRes.status, 200);
      const presetsBody = (await presetsRes.json()) as { cities: unknown[] };
      assert.equal(presetsBody.cities.length, PRESET_CITIES.length);

      const unknownRes = await fetch(`${baseUrl}/api/unknown-route`);
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
      const badAdvisoryBody = (await badAdvisoryRes.json()) as {
        fieldErrors?: Record<string, string>;
      };
      assert.ok(badAdvisoryBody.fieldErrors?.city);
      assert.ok(badAdvisoryBody.fieldErrors?.aqi);
      assert.ok(badAdvisoryBody.fieldErrors?.pm25);

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

      const badQaRes = await fetch(`${baseUrl}/api/qa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reading: { city: 'London', aqi: 42, pm25: 11, pm10: 24 },
          question: '?',
        }),
      });
      assert.equal(badQaRes.status, 400);

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
    });
  });

  it('enforces per-IP rate limiting with HTTP 429 and Retry-After header', async () => {
    await withTestServer({ rateLimitMaxRequests: 2, rateLimitWindowMs: 60_000 }, async (baseUrl) => {
      const payload = JSON.stringify({ city: 'Tokyo', aqi: 36, pm25: 9, pm10: 19 });
      const headers = { 'Content-Type': 'application/json' };

      const first = await fetch(`${baseUrl}/api/advisory`, { method: 'POST', headers, body: payload });
      const second = await fetch(`${baseUrl}/api/advisory`, { method: 'POST', headers, body: payload });
      const third = await fetch(`${baseUrl}/api/advisory`, { method: 'POST', headers, body: payload });

      assert.equal(first.status, 200);
      assert.equal(second.status, 200);
      assert.equal(third.status, 429);
      assert.ok(Number(third.headers.get('retry-after')) >= 1);
    });
  });
});
