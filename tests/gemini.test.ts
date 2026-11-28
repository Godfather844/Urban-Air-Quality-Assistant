import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { TtlCache } from '../server/cache.ts';
import {
  answerAirQualityQuestion,
  generateAirQualityAdvisory,
  type GeminiContentGenerator,
} from '../server/gemini.ts';
import {
  type AdvisoryResponsePayload,
  type AirQualityReading,
  buildFallbackAdvisory,
  buildFallbackAnswer,
} from '../shared/airQuality.ts';

const DELHI_READING: AirQualityReading = {
  city: 'Delhi',
  country: 'India',
  aqi: 342,
  pm25: 198,
  pm10: 315,
};

describe('Advisory generation with deterministic Gemini stubs and fallbacks', () => {
  it('returns structured Gemini guidance, caches repeat readings, and supports bypassCache', async () => {
    let callCount = 0;
    const mockGenerator: GeminiContentGenerator = async () => {
      callCount += 1;
      return JSON.stringify({
        summary: '**Delhi** faces severe PM2.5 levels today.',
        outdoorActivity: 'Avoid outdoor exercise completely.',
        commuteGuidance: 'Use closed-cabin transit with recirculation.',
        maskRecommendation: 'Wear a tightly sealed N95 respirator.',
        indoorAirTips: 'Run a HEPA purifier with windows closed.',
        sensitiveGroups: {
          children: 'Keep children indoors all day.',
          elderly: 'Avoid outdoor errands.',
          respiratory: 'Keep rescue inhalers accessible.',
        },
        actionChecklist: ['Stay indoors.', 'Wear N95 outside.', 'Run HEPA filter.'],
      });
    };

    const cache = new TtlCache<AdvisoryResponsePayload>(60_000, 10);

    const first = await generateAirQualityAdvisory(DELHI_READING, {
      generator: mockGenerator,
      cache,
      retryDelayMs: 0,
    });
    assert.equal(first.source, 'gemini');
    assert.equal(first.cached, false);
    assert.equal(first.category, 'Severe');
    assert.equal(first.advisory.summary, 'Delhi faces severe PM2.5 levels today.');
    assert.equal(callCount, 1);

    const second = await generateAirQualityAdvisory(DELHI_READING, {
      generator: mockGenerator,
      cache,
      retryDelayMs: 0,
    });
    assert.equal(second.source, 'gemini');
    assert.equal(second.cached, true);
    assert.equal(callCount, 1);

    const refreshed = await generateAirQualityAdvisory(DELHI_READING, {
      generator: mockGenerator,
      cache,
      bypassCache: true,
      retryDelayMs: 0,
    });
    assert.equal(refreshed.cached, false);
    assert.equal(callCount, 2);
  });

  it('backfills missing fields safely when Gemini returns partial JSON', async () => {
    const partialGenerator: GeminiContentGenerator = async () =>
      JSON.stringify({
        summary: 'Custom AI summary for Delhi.',
        sensitiveGroups: { children: 'Keep kids indoors.' },
        actionChecklist: [],
      });

    const result = await generateAirQualityAdvisory(DELHI_READING, {
      generator: partialGenerator,
      cache: new TtlCache<AdvisoryResponsePayload>(60_000, 10),
      retryDelayMs: 0,
    });

    assert.equal(result.source, 'gemini');
    assert.equal(result.advisory.summary, 'Custom AI summary for Delhi.');
    assert.equal(result.advisory.sensitiveGroups.children, 'Keep kids indoors.');
    assert.ok(result.advisory.sensitiveGroups.elderly.length > 15);
    assert.ok(result.advisory.maskRecommendation.length > 15);
    assert.equal(result.advisory.actionChecklist.length, 3);
  });

  it('falls back cleanly on empty response text, malformed JSON, 429 rate limit, and 403 errors', async () => {
    const emptyRes = await generateAirQualityAdvisory(DELHI_READING, {
      generator: async () => '   ',
      cache: new TtlCache<AdvisoryResponsePayload>(60_000, 10),
      retryDelayMs: 0,
    });
    assert.equal(emptyRes.source, 'fallback');
    assert.ok(emptyRes.warning);

    const badJsonRes = await generateAirQualityAdvisory(DELHI_READING, {
      generator: async () => '{not-valid-json',
      cache: new TtlCache<AdvisoryResponsePayload>(60_000, 10),
      retryDelayMs: 0,
    });
    assert.equal(badJsonRes.source, 'fallback');
    assert.ok(badJsonRes.advisory.maskRecommendation.includes('N95'));

    let rateLimitCalls = 0;
    const rateLimited = await generateAirQualityAdvisory(DELHI_READING, {
      generator: async () => {
        rateLimitCalls += 1;
        const err = Object.assign(new Error('RESOURCE_EXHAUSTED'), { status: 429 });
        throw err;
      },
      cache: new TtlCache<AdvisoryResponsePayload>(60_000, 10),
      retryDelayMs: 0,
    });
    assert.equal(rateLimited.source, 'fallback');
    assert.equal(rateLimitCalls, 1);
    assert.match(rateLimited.warning ?? '', /quota|rate limit/i);

    let authErrorCalls = 0;
    const authFailed = await generateAirQualityAdvisory(DELHI_READING, {
      generator: async () => {
        authErrorCalls += 1;
        const err = Object.assign(new Error('PERMISSION_DENIED'), { status: 403 });
        throw err;
      },
      cache: new TtlCache<AdvisoryResponsePayload>(60_000, 10),
      retryDelayMs: 0,
    });
    assert.equal(authFailed.source, 'fallback');
    assert.equal(authErrorCalls, 1);
    assert.match(authFailed.warning ?? '', /credentials|GEMINI_API_KEY/i);
  });

  it('retries once on transient 503 failure and succeeds if the retry recovers', async () => {
    let attempts = 0;
    const flakyGenerator: GeminiContentGenerator = async () => {
      attempts += 1;
      if (attempts === 1) {
        throw Object.assign(new Error('Service temporarily unavailable 503'), { status: 503 });
      }
      return JSON.stringify({
        summary: 'Recovered after retry.',
        outdoorActivity: 'Stay indoors.',
        commuteGuidance: 'Minimize travel.',
        maskRecommendation: 'Wear N95.',
        indoorAirTips: 'Close windows.',
        sensitiveGroups: {
          children: 'Stay inside.',
          elderly: 'Stay inside.',
          respiratory: 'Keep inhaler ready.',
        },
        actionChecklist: ['Stay indoors.'],
      });
    };

    const result = await generateAirQualityAdvisory(DELHI_READING, {
      generator: flakyGenerator,
      cache: new TtlCache<AdvisoryResponsePayload>(60_000, 10),
      retryDelayMs: 0,
    });

    assert.equal(attempts, 2);
    assert.equal(result.source, 'gemini');
    assert.equal(result.advisory.summary, 'Recovered after retry.');
  });

  it('falls back cleanly after exhausting retry on persistent 503 failure or null generator', async () => {
    let attempts = 0;
    const persistentOutage: GeminiContentGenerator = async () => {
      attempts += 1;
      throw Object.assign(new Error('503 network outage'), { status: 503 });
    };

    const failedResult = await generateAirQualityAdvisory(DELHI_READING, {
      generator: persistentOutage,
      cache: new TtlCache<AdvisoryResponsePayload>(60_000, 10),
      retryDelayMs: 0,
    });
    assert.equal(attempts, 2);
    assert.equal(failedResult.source, 'fallback');
    assert.match(failedResult.warning ?? '', /unreachable/i);

    const missingKeyResult = await generateAirQualityAdvisory(DELHI_READING, {
      generator: null,
      cache: new TtlCache<AdvisoryResponsePayload>(60_000, 10),
    });
    assert.equal(missingKeyResult.source, 'fallback');
    assert.match(missingKeyResult.warning ?? '', /GEMINI_API_KEY/);
  });
});

describe('Q&A generation, fallback builders, and TtlCache', () => {
  it('formats Gemini Q&A responses and falls back cleanly on empty or failed responses', async () => {
    const okQa = await answerAirQualityQuestion(
      DELHI_READING,
      'What mask should I wear?',
      [{ role: 'user', content: 'How bad is it?' }],
      {
        generator: async () => '**Wear a sealed N95** mask during any outdoor trip in Delhi.',
        retryDelayMs: 0,
      }
    );
    assert.equal(okQa.source, 'gemini');
    assert.equal(okQa.answer, 'Wear a sealed N95 mask during any outdoor trip in Delhi.');

    const emptyQa = await answerAirQualityQuestion(DELHI_READING, 'Should I open windows?', [], {
      generator: async () => undefined,
      retryDelayMs: 0,
    });
    assert.equal(emptyQa.source, 'fallback');
    assert.match(emptyQa.answer, /windows closed|HEPA/i);

    const unconfiguredQa = await answerAirQualityQuestion(DELHI_READING, 'Can I jog?', [], {
      generator: null,
    });
    assert.equal(unconfiguredQa.source, 'fallback');
    assert.match(unconfiguredQa.answer, /not advisable|indoors/i);
  });

  it('builds complete fallback advisories across all five AQI bands and topic-aware Q&A', () => {
    for (const aqi of [25, 75, 150, 250, 410]) {
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

    assert.match(
      buildFallbackAnswer(DELHI_READING, 'How does this affect a child with asthma?'),
      /Children:|Asthma/i
    );
  });

  it('expires stale cache entries and evicts the oldest entry when reaching capacity', () => {
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

    cache.clear();
    assert.equal(cache.size, 0);
  });
});
