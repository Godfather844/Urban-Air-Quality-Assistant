import express, { type Express, type Request, type Response } from 'express';
import {
  PRESET_CITIES,
  validateAirQualityReading,
  validateQuestionInput,
} from '../shared/airQuality.ts';
import { SERVER_CONFIG, isGeminiConfigured, logServerError } from './config.ts';
import { answerAirQualityQuestion, generateAirQualityAdvisory } from './gemini.ts';
import {
  createRateLimiter,
  malformedJsonErrorHandler,
  securityHeadersMiddleware,
} from './middleware.ts';

export interface CreateApiAppOptions {
  rateLimitMaxRequests?: number;
  rateLimitWindowMs?: number;
}

/** Creates and configures the Express API application without binding a port. */
export function createApiApp(options?: CreateApiAppOptions): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: SERVER_CONFIG.jsonBodyLimit }));
  app.use(securityHeadersMiddleware);

  const apiLimiter = createRateLimiter({
    maxRequests: options?.rateLimitMaxRequests ?? SERVER_CONFIG.rateLimitMaxRequests,
    windowMs: options?.rateLimitWindowMs ?? SERVER_CONFIG.rateLimitWindowMs,
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      geminiConfigured: isGeminiConfigured(),
      presetCount: PRESET_CITIES.length,
    });
  });

  app.get('/api/presets', (_req: Request, res: Response) => {
    res.json({ cities: PRESET_CITIES });
  });

  app.post('/api/advisory', apiLimiter, async (req: Request, res: Response) => {
    const validation = validateAirQualityReading(req.body);
    if (!validation.valid) {
      res.status(400).json({
        error: 'Invalid air quality input.',
        fieldErrors: validation.errors,
      });
      return;
    }

    const bypassCache = Boolean(
      req.body && typeof req.body === 'object' && (req.body as { refresh?: unknown }).refresh
    );

    try {
      const result = await generateAirQualityAdvisory(validation.value, { bypassCache });
      res.json(result);
    } catch (error) {
      logServerError('POST /api/advisory', error);
      res.status(500).json({
        error: 'Unable to generate air quality advisory right now. Please try again.',
      });
    }
  });

  app.post('/api/qa', apiLimiter, async (req: Request, res: Response) => {
    const validation = validateQuestionInput(req.body);
    if (!validation.valid) {
      res.status(400).json({
        error: 'Invalid Q&A input.',
        fieldErrors: validation.errors,
      });
      return;
    }

    try {
      const result = await answerAirQualityQuestion(
        validation.value.reading,
        validation.value.question,
        validation.value.history
      );
      res.json(result);
    } catch (error) {
      logServerError('POST /api/qa', error);
      res.status(500).json({
        error: 'Unable to answer your question right now. Please try again.',
      });
    }
  });

  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  app.use(malformedJsonErrorHandler);

  return app;
}
