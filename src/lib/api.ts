import type {
  AdvisoryResponsePayload,
  AirQualityReading,
  QaResponsePayload,
  QaTurn,
} from '../../shared/airQuality.ts';

export class ApiRequestError extends Error {
  status: number;
  fieldErrors?: Record<string, string>;

  constructor(message: string, status: number, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export async function fetchAdvisory(
  reading: AirQualityReading,
  options?: { signal?: AbortSignal; refresh?: boolean }
): Promise<AdvisoryResponsePayload> {
  const response = await fetch('/api/advisory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: options?.signal,
    body: JSON.stringify({
      city: reading.city,
      country: reading.country,
      aqi: reading.aqi,
      pm25: reading.pm25,
      pm10: reading.pm10,
      isCustom: Boolean(reading.isCustom),
      refresh: Boolean(options?.refresh),
    }),
  });

  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
    fieldErrors?: Record<string, string>;
  } & Partial<AdvisoryResponsePayload>;

  if (!response.ok) {
    throw new ApiRequestError(
      data.error || 'Could not load air quality advisory.',
      response.status,
      data.fieldErrors
    );
  }

  return data as AdvisoryResponsePayload;
}

export async function askAirQualityQuestion(
  reading: AirQualityReading,
  question: string,
  history: QaTurn[],
  signal?: AbortSignal
): Promise<QaResponsePayload> {
  const response = await fetch('/api/qa', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      reading: {
        city: reading.city,
        country: reading.country,
        aqi: reading.aqi,
        pm25: reading.pm25,
        pm10: reading.pm10,
        isCustom: Boolean(reading.isCustom),
      },
      question,
      history,
    }),
  });

  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
    fieldErrors?: Record<string, string>;
  } & Partial<QaResponsePayload>;

  if (!response.ok) {
    throw new ApiRequestError(
      data.error || 'Could not answer your question right now.',
      response.status,
      data.fieldErrors
    );
  }

  return data as QaResponsePayload;
}
