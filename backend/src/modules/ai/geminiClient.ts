import { env } from '../../config/env';
import { aiCircuitBreaker, CircuitBreakerOpenError } from './circuitBreaker';
import { aiMetrics } from './metrics';
import { aiProviderManager } from './providerManager';
import { AiCompletionRequest, AiCompletionResponse } from './providerTypes';

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
  provider?: string;
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
 * Universal AI Caller with automatic provider fallback (Gemini -> Groq -> Cerebras)
 * Direct callers to callGemini transparently benefit from Groq and Cerebras failover.
 */
export async function callGemini<T = any>(options: GeminiRequestOptions, featureName?: string): Promise<GeminiResponse<T>> {
  try {
    const { response } = await aiProviderManager.execute<T>(options, featureName);
    return {
      rawText: response.rawText,
      data: response.data,
      totalTokens: response.totalTokens,
      latencyMs: response.latencyMs,
      provider: response.provider,
    };
  } catch (err: any) {
    if (err instanceof CircuitBreakerOpenError) {
      throw err;
    }
    if (err?.isQuotaExhausted) {
      throw new GeminiQuotaExhaustedError(err.message);
    }
    throw new GeminiUnavailableError(err?.message || 'All AI providers unavailable');
  }
}

export const callAiWithFallback = callGemini;
