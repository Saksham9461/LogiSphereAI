import { env } from '../../config/env';
import {
  IAiProviderAdapter,
  AiCompletionRequest,
  AiCompletionResponse,
  AiProviderError,
  getBackoffDelay,
  sleep,
} from './providerTypes';
import { aiCircuitBreaker, CircuitBreakerOpenError } from './circuitBreaker';
import { aiMetrics } from './metrics';

export class GeminiProviderAdapter implements IAiProviderAdapter {
  readonly name = 'gemini' as const;

  isConfigured(): boolean {
    return Boolean(env.GEMINI_API_KEY || env.AI_API_KEY);
  }

  isAvailable(): boolean {
    if (!this.isConfigured()) return false;
    return aiCircuitBreaker.canExecute();
  }

  async execute<T = any>(options: AiCompletionRequest): Promise<AiCompletionResponse<T>> {
    const apiKey = env.GEMINI_API_KEY || env.AI_API_KEY;
    if (!apiKey) {
      throw new AiProviderError(this.name, 'API key is not configured', { isRetryable: false });
    }

    if (!aiCircuitBreaker.canExecute()) {
      throw new CircuitBreakerOpenError();
    }

    let activeModel = options.model || env.GEMINI_MODEL || 'gemini-3.8-flash';
    const timeoutMs = options.timeoutMs ?? env.GEMINI_TIMEOUT_MS ?? env.AI_PROVIDER_TIMEOUT_MS ?? 4000;
    const maxRetries = options.maxRetries ?? env.GEMINI_MAX_RETRIES ?? env.AI_PROVIDER_MAX_RETRIES ?? 2;
    const buildUrl = (m: string) =>
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent?key=${apiKey}`;

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
              // Leave as null if json parse fails
            }
          }

          aiCircuitBreaker.recordSuccess();
          aiMetrics.recordGeminiSuccess(latencyMs);

          return {
            provider: this.name,
            model: activeModel,
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
            throw new AiProviderError(this.name, `Daily quota exhausted: ${errBody.slice(0, 200)}`, {
              status: 429,
              isQuotaExhausted: true,
              isRetryable: false,
            });
          }

          const retryAfterHeader = res.headers.get('retry-after');
          const retryAfterSec = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 0;

          if (attempt < maxRetries && retryAfterSec <= 2) {
            const delay = retryAfterSec > 0 ? retryAfterSec * 1000 : getBackoffDelay(attempt);
            console.warn(`[GeminiClient] 429 Rate limit encountered. Backing off for ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
            await sleep(delay);
            continue;
          }

          throw new AiProviderError(this.name, `Rate limited (429): ${errBody.slice(0, 150)}`, {
            status: 429,
            isRetryable: true,
            retryAfterSec,
          });
        }

        // B. 4xx Client / Auth Errors (400, 401, 403, 404)
        if (status === 404 && activeModel !== 'gemini-3.8-flash' && attempt < maxRetries) {
          console.warn(`[GeminiClient] Model ${activeModel} returned 404 (retired by Google). Self-healing with gemini-3.8-flash...`);
          activeModel = 'gemini-3.8-flash';
          continue;
        }

        if (status >= 400 && status < 500) {
          aiMetrics.recordGeminiFailure(false, false);
          console.warn(`[GeminiClient] Non-retryable HTTP ${status} error: ${errBody.slice(0, 150)}`);
          throw new AiProviderError(this.name, `Client error ${status}: ${errBody.slice(0, 150)}`, {
            status,
            isRetryable: false,
          });
        }

        // C. 5xx Server Errors (500, 502, 503, 504)
        if (status >= 500) {
          aiMetrics.recordGeminiFailure(false, false);
          aiCircuitBreaker.recordFailure(true);
          lastError = new AiProviderError(this.name, `Server error ${status}: ${errBody.slice(0, 150)}`, {
            status,
            isRetryable: true,
          });

          if (attempt < maxRetries) {
            const delay = getBackoffDelay(attempt);
            console.warn(`[GeminiClient] 5xx Server error (${status}). Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
            await sleep(delay);
            continue;
          }
          throw lastError;
        }

        throw new AiProviderError(this.name, `Unexpected status: ${status}`, { status, isRetryable: false });
      } catch (err: any) {
        clearTimeout(timeoutHandle);

        if (err instanceof CircuitBreakerOpenError) {
          throw err;
        }
        if (err instanceof AiProviderError && !err.isRetryable) {
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

        throw err instanceof AiProviderError ? err : new AiProviderError(this.name, err?.message || 'Network/timeout failure', { isRetryable: true });
      }
    }

    throw lastError || new AiProviderError(this.name, 'Request failed after maximum retries', { isRetryable: false });
  }
}
