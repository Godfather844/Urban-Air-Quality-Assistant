import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import {
  PRESET_CITIES,
  validateAirQualityReading,
  validateQuestionInput,
} from '../shared/airQuality.ts';
import { answerAirQualityQuestion, generateAirQualityAdvisory } from './gemini.ts';

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

function createRateLimiter(maxRequests: number, windowMs: number) {
  const buckets = new Map<string, RateLimitBucket>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (current.count >= maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      res.status(429).json({
        error: 'Too many requests. Please wait a moment before trying again.',
      });
      return;
    }

    current.count += 1;
    next();
  };
}

export function createApiApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));

  // Defensive security headers (X-Frame-Options intentionally omitted for iframe preview compatibility)
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  const apiLimiter = createRateLimiter(60, 60_000);

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      geminiConfigured: Boolean(
        process.env.GEMINI_API_KEY &&
          process.env.GEMINI_API_KEY.trim() !== '' &&
          process.env.GEMINI_API_KEY.trim() !== 'MY_GEMINI_API_KEY'
      ),
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
    } catch {
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
    } catch {
      res.status(500).json({
        error: 'Unable to answer your question right now. Please try again.',
      });
    }
  });

  // Malformed JSON error handler
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (err instanceof SyntaxError && 'body' in err) {
      res.status(400).json({ error: 'Malformed JSON request body.' });
      return;
    }
    next(err);
  });

  return app;
}
