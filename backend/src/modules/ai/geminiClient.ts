import { env } from '../../config/env';
import { aiCircuitBreaker, CircuitBreakerOpenError } from './circuitBreaker';
import { aiMetrics } from './metrics';

export interface GeminiRequestOptions {
  systemPrompt?: string;
  userPrompt: string;
  responseMimeType?: 'application/json' | 'text/plain';
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
  maxRetries?: number;
  model?: string;
}

export interface GeminiResponse<T = any> {
  rawText: string;
  data: T | null;
  totalTokens?: number;
  latencyMs: number;
}

export class GeminiQuotaExhaustedError extends Error {
  constructor(message = 'Gemini API daily quota or hard rate limit exhausted') {
    super(message);
    this.name = 'GeminiQuotaExhaustedError';
  }
}

export class GeminiUnavailableError extends Error {
  constructor(message = 'Gemini API service is unavailable') {
    super(message);
    this.name = 'GeminiUnavailableError';
  }
}

/**
 * Helper to compute jittered exponential backoff delay.
 * Base delay e.g. 300ms -> attempt 0: ~300ms, attempt 1: ~600ms, attempt 2: ~1200ms
 */
function getBackoffDelay(attempt: number, baseMs = 300, maxMs = 2000): number {
  const exponential = Math.min(maxMs, baseMs * Math.pow(2, attempt));
  // Add 10-30% random jitter
  const jitter = Math.random() * (exponential * 0.2);
  return Math.min(maxMs, Math.round(exponential + jitter));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Centralized, production-grade Gemini API client wrapper.
 *
 * Resilience features:
 * - Exponential backoff with jitter for transient 5xx and network drops.
 * - Distinguishes 429 per-minute rate-limiting vs non-recoverable daily quota exhaustion.
 * - Respects Circuit Breaker state (CLOSED, OPEN, HALF_OPEN) for fast-failing.
 * - Strict per-request deadline using AbortController.
 * - Never retries 4xx client errors (400, 401, 403, 404).
 * - Never exposes API keys or secrets in logs or errors.
 */
export async function callGemini<T = any>(options: GeminiRequestOptions): Promise<GeminiResponse<T>> {
  const apiKey = env.GEMINI_API_KEY || env.AI_API_KEY;
  if (!apiKey) {
    throw new GeminiUnavailableError('Gemini API key is not configured');
  }

  // 1. Check Circuit Breaker
  if (!aiCircuitBreaker.canExecute()) {
    throw new CircuitBreakerOpenError();
  }

  let activeModel = options.model || env.GEMINI_MODEL || 'gemini-3.8-flash';
  const timeoutMs = options.timeoutMs ?? env.GEMINI_TIMEOUT_MS ?? 15000;
  const maxRetries = options.maxRetries ?? env.GEMINI_MAX_RETRIES ?? 2;
  const buildUrl = (m: string) =>
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent?key=${apiKey}`;

  // Assemble request contents
  const contentsParts: Array<{ text: string }> = [];
  if (options.systemPrompt) {
    contentsParts.push({ text: options.systemPrompt });
  }
  contentsParts.push({ text: options.userPrompt });

  const requestBody = {
    contents: [{ parts: contentsParts }],
    generationConfig: {
      temperature: options.temperature ?? 0.15,
      maxOutputTokens: options.maxOutputTokens ?? 350,
      ...(options.responseMimeType ? { responseMimeType: options.responseMimeType } : {}),
    },
  };

  let lastError: any = null;
  const startTime = Date.now();

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    aiMetrics.recordGeminiAttempt();
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    try {
      if (attempt > 0) {
        aiMetrics.recordRetry();
      }

      let res: Response;
      try {
        res = await fetch(buildUrl(activeModel), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify(requestBody),
        });
      } finally {
        clearTimeout(timeoutHandle);
      }

      const latencyMs = Date.now() - startTime;

      if (res.ok) {
        const json = await res.json();
        const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        const totalTokens = json?.usageMetadata?.totalTokenCount;

        let parsedData: T | null = null;
        if (options.responseMimeType === 'application/json' && rawText) {
          try {
            parsedData = JSON.parse(rawText);
          } catch {
            // If json parse failed, keep parsedData as null
          }
        }

        aiCircuitBreaker.recordSuccess();
        aiMetrics.recordGeminiSuccess(latencyMs);

        return {
          rawText,
          data: parsedData,
          totalTokens,
          latencyMs,
        };
      }

      // Non-2xx response handling
      const status = res.status;
      let errBody = '';
      try {
        errBody = await res.text();
      } catch {}

      // A. 429 Rate Limit / Quota Exhaustion
      if (status === 429) {
        const isDailyQuotaExhausted =
          errBody.includes('RESOURCE_EXHAUSTED') ||
          errBody.toLowerCase().includes('quota exceeded') ||
          errBody.toLowerCase().includes('daily limit') ||
          errBody.toLowerCase().includes('per-day limit') ||
          errBody.toLowerCase().includes('free tier limit');

        aiMetrics.recordGeminiFailure(isDailyQuotaExhausted, true);

        if (isDailyQuotaExhausted) {
          console.warn('[GeminiClient] Daily quota exhausted. Fast-failing and opening circuit breaker.');
          aiCircuitBreaker.tripNow('Daily quota exhausted');
          throw new GeminiQuotaExhaustedError(`Gemini quota exhausted: ${errBody.slice(0, 200)}`);
        }

        // Transient rate limit: inspect retry-after
        const retryAfterHeader = res.headers.get('retry-after');
        const retryAfterSec = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 0;

        if (attempt < maxRetries && retryAfterSec <= 2) {
          const delay = retryAfterSec > 0 ? retryAfterSec * 1000 : getBackoffDelay(attempt);
          console.warn(`[GeminiClient] 429 Rate limit encountered. Backing off for ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
          await sleep(delay);
          continue;
        }

        throw new GeminiUnavailableError(`Gemini rate limited (429): ${errBody.slice(0, 150)}`);
      }

      // B. 4xx Client / Auth Errors (400, 401, 403, 404)
      if (status === 404 && activeModel !== 'gemini-3.8-flash' && attempt < maxRetries) {
        console.warn(`[GeminiClient] Model ${activeModel} returned 404 (retired by Google). Self-healing with gemini-3.8-flash...`);
        activeModel = 'gemini-3.8-flash';
        continue;
      }

      if (status >= 400 && status < 500) {
        aiMetrics.recordGeminiFailure(false, false);
        // Never retry client/auth errors
        console.warn(`[GeminiClient] Non-retryable HTTP ${status} error: ${errBody.slice(0, 150)}`);
        throw new GeminiUnavailableError(`Gemini client error ${status}`);
      }

      // C. 5xx Server Errors (500, 502, 503, 504)
      if (status >= 500) {
        aiMetrics.recordGeminiFailure(false, false);
        aiCircuitBreaker.recordFailure(true);
        lastError = new GeminiUnavailableError(`Gemini server error ${status}: ${errBody.slice(0, 150)}`);

        if (attempt < maxRetries) {
          const delay = getBackoffDelay(attempt);
          console.warn(`[GeminiClient] 5xx Server error (${status}). Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
          await sleep(delay);
          continue;
        }
        throw lastError;
      }

      throw new GeminiUnavailableError(`Unexpected Gemini status: ${status}`);
    } catch (err: any) {
      clearTimeout(timeoutHandle);

      if (err instanceof GeminiQuotaExhaustedError || err instanceof CircuitBreakerOpenError) {
        throw err;
      }

      const isAbort = err?.name === 'AbortError' || err?.message?.includes('aborted');
      const isNetwork =
        err?.code === 'ECONNRESET' ||
        err?.code === 'ETIMEDOUT' ||
        err?.code === 'ENOTFOUND' ||
        isAbort;

      lastError = err;

      if (isNetwork) {
        aiMetrics.recordGeminiFailure(false, false);
        aiCircuitBreaker.recordFailure(true);

        if (attempt < maxRetries) {
          const delay = getBackoffDelay(attempt);
          console.warn(`[GeminiClient] Network/timeout failure (${err?.message || err?.code}). Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
          await sleep(delay);
          continue;
        }
      }

      // If non-network or max retries exceeded
      throw err;
    }
  }

  throw lastError || new GeminiUnavailableError('Gemini request failed after maximum retries');
}
