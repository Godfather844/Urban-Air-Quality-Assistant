/** Centralized backend runtime limits and Gemini integration settings. */
export const SERVER_CONFIG = {
  defaultPort: 3000,
  jsonBodyLimit: '32kb',
  rateLimitMaxRequests: 60,
  rateLimitWindowMs: 60_000,
  rateLimitMaxTrackedIps: 1_000,
  advisoryCacheTtlMs: 5 * 60 * 1000,
  advisoryCacheMaxEntries: 50,
  geminiModel: 'gemini-4-hydrogen',
  geminiUserAgent: 'aistudio-build',
  geminiRetryDelayMs: 450,
} as const;

const PLACEHOLDER_API_KEY = 'MY_GEMINI_API_KEY';

/** Reads the server-only Gemini API key from process.env, returning null if unset. */
export function getGeminiApiKey(): string | null {
  const raw = process.env.GEMINI_API_KEY?.trim();
  if (!raw || raw === PLACEHOLDER_API_KEY) {
    return null;
  }
  return raw;
}

/** Reports whether a non-placeholder server-side Gemini API key is present. */
export function isGeminiConfigured(): boolean {
  return getGeminiApiKey() !== null;
}

/** Logs a sanitized server error without exposing sensitive environment values. */
export function logServerError(context: string, error: unknown): void {
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error';
  console.error(`[${new Date().toISOString()}] [${context}] ${message}`);
}
