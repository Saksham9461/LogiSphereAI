import { env } from '../../config/env';
import {
  IAiProviderAdapter,
  AiCompletionRequest,
  AiCompletionResponse,
  AiProviderError,
  getBackoffDelay,
  sleep,
} from './providerTypes';

export class GroqProviderAdapter implements IAiProviderAdapter {
  readonly name = 'groq' as const;
  private cooldownUntil = 0;

  isConfigured(): boolean {
    return Boolean(env.GROQ_API_KEY && env.GROQ_API_KEY.trim().length > 0);
  }

  isAvailable(): boolean {
    if (!this.isConfigured()) return false;
    return Date.now() >= this.cooldownUntil;
  }

  setCooldown(durationMs = 30000): void {
    this.cooldownUntil = Date.now() + durationMs;
  }

  async execute<T = any>(options: AiCompletionRequest): Promise<AiCompletionResponse<T>> {
    const apiKey = env.GROQ_API_KEY;
    if (!apiKey) {
      throw new AiProviderError(this.name, 'Groq API key is not configured', { isRetryable: false });
    }

    if (Date.now() < this.cooldownUntil) {
      const waitSec = Math.ceil((this.cooldownUntil - Date.now()) / 1000);
      throw new AiProviderError(this.name, `Groq in cooldown for ${waitSec}s`, { isRetryable: true, retryAfterSec: waitSec });
    }

    const model = options.model || env.GROQ_MODEL || 'llama-3.3-70b-versatile';
    const timeoutMs = options.timeoutMs ?? env.AI_PROVIDER_TIMEOUT_MS ?? 15000;
    const maxRetries = options.maxRetries ?? env.AI_PROVIDER_MAX_RETRIES ?? 1;

    const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: options.userPrompt });

    const requestBody: Record<string, any> = {
      model,
      messages,
      temperature: options.temperature ?? 0.15,
      max_tokens: options.maxOutputTokens ?? 400,
    };

    if (options.responseMimeType === 'application/json') {
      requestBody.response_format = { type: 'json_object' };
    }

    let lastError: any = null;
    const startTime = Date.now();

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

      try {
        let res: Response;
        try {
          res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            signal: controller.signal,
            body: JSON.stringify(requestBody),
          });
        } finally {
          clearTimeout(timeoutHandle);
        }

        const latencyMs = Date.now() - startTime;

        if (res.ok) {
          const json = await res.json();
          const rawText = json?.choices?.[0]?.message?.content ?? '';
          const totalTokens = json?.usage?.total_tokens;

          let parsedData: T | null = null;
          if (options.responseMimeType === 'application/json' && rawText) {
            try {
              parsedData = JSON.parse(rawText);
            } catch {
              // Leave as null if json parse fails
            }
          }

          return {
            provider: this.name,
            model,
            rawText,
            data: parsedData,
            totalTokens,
            latencyMs,
          };
        }

        const status = res.status;
        let errBody = '';
        try {
          errBody = await res.text();
        } catch {}

        if (status === 429) {
          const retryAfter = res.headers.get('retry-after');
          const retrySec = retryAfter ? parseInt(retryAfter, 10) : 60;
          this.setCooldown(retrySec * 1000);
          console.warn(`[Groq] Rate limit (429) encountered: ${errBody.slice(0, 150)}. Cooling down for ${retrySec}s.`);
          throw new AiProviderError(this.name, `Groq rate limited (429): ${errBody.slice(0, 150)}`, {
            status: 429,
            isRetryable: true,
            isQuotaExhausted: true,
            retryAfterSec: retrySec,
          });
        }

        if (status >= 400 && status < 500) {
          console.warn(`[Groq] Non-retryable client error (${status}): ${errBody.slice(0, 150)}`);
          throw new AiProviderError(this.name, `Groq client error ${status}: ${errBody.slice(0, 150)}`, {
            status,
            isRetryable: false,
          });
        }

        if (status >= 500) {
          lastError = new AiProviderError(this.name, `Groq server error ${status}: ${errBody.slice(0, 150)}`, {
            status,
            isRetryable: true,
          });
          if (attempt < maxRetries) {
            const delay = getBackoffDelay(attempt);
            console.warn(`[Groq] Server error (${status}). Retrying in ${delay}ms...`);
            await sleep(delay);
            continue;
          }
          this.setCooldown(30000);
          throw lastError;
        }

        throw new AiProviderError(this.name, `Unexpected Groq status ${status}`, { status, isRetryable: false });
      } catch (err: any) {
        clearTimeout(timeoutHandle);
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

        if (isNetwork && attempt < maxRetries) {
          const delay = getBackoffDelay(attempt);
          console.warn(`[Groq] Network/timeout failure (${err?.message || err?.code}). Retrying in ${delay}ms...`);
          await sleep(delay);
          continue;
        }

        this.setCooldown(15000);
        throw err instanceof AiProviderError ? err : new AiProviderError(this.name, err?.message || 'Network/timeout failure', { isRetryable: true });
      }
    }

    throw lastError || new AiProviderError(this.name, 'Groq request failed after retries', { isRetryable: false });
  }
}
