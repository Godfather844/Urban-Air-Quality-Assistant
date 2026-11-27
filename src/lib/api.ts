import type {
  AdvisoryResponsePayload,
  AirQualityReading,
  QaResponsePayload,
  QaTurn,
} from '../../shared/airQuality.ts';

interface ApiErrorBody {
  error?: string;
  fieldErrors?: Record<string, string>;
}

/** Structured error thrown when an API endpoint returns a non-2xx response. */
export class ApiRequestError extends Error {
  readonly status: number;
  readonly fieldErrors?: Record<string, string>;

  constructor(message: string, status: number, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

/** Runtime type guard for aborted fetch requests. */
export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

async function postJson<TResponse>(
  url: string,
  payload: Record<string, unknown>,
  fallbackErrorMessage: string,
  signal?: AbortSignal
): Promise<TResponse> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify(payload),
  });

  const body = (await response.json().catch(() => ({}))) as ApiErrorBody & TResponse;

  if (!response.ok) {
    throw new ApiRequestError(
      body.error || fallbackErrorMessage,
      response.status,
      body.fieldErrors
    );
  }

  return body;
}

function serializeReading(reading: AirQualityReading): Record<string, unknown> {
  return {
    city: reading.city,
    country: reading.country,
    aqi: reading.aqi,
    pm25: reading.pm25,
    pm10: reading.pm10,
    isCustom: Boolean(reading.isCustom),
  };
}

/** Requests a structured air quality advisory for a preset or custom city reading. */
export function fetchAdvisory(
  reading: AirQualityReading,
  options?: { signal?: AbortSignal; refresh?: boolean }
): Promise<AdvisoryResponsePayload> {
  return postJson<AdvisoryResponsePayload>(
    '/api/advisory',
    {
      ...serializeReading(reading),
      refresh: Boolean(options?.refresh),
    },
    'Could not load air quality advisory.',
    options?.signal
  );
}

/** Submits a follow-up air quality question grounded in the active location reading. */
export function askAirQualityQuestion(
  reading: AirQualityReading,
  question: string,
  history: QaTurn[],
  signal?: AbortSignal
): Promise<QaResponsePayload> {
  return postJson<QaResponsePayload>(
    '/api/qa',
    {
      reading: serializeReading(reading),
      question,
      history,
    },
    'Could not answer your question right now.',
    signal
  );
}
