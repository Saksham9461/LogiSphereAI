import { env } from '../../config/env';
import { aiCircuitBreaker } from './circuitBreaker';
import { aiMetrics } from './metrics';

export type AiProviderName = 'gemini' | 'groq' | 'cerebras';

export interface AiCompletionRequest {
  systemPrompt?: string;
  userPrompt: string;
  responseMimeType?: 'application/json' | 'text/plain';
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
  maxRetries?: number;
  model?: string;
}

export interface AiCompletionResponse<T = any> {
  provider: AiProviderName;
  model: string;
  rawText: string;
  data: T | null;
  totalTokens?: number;
  latencyMs: number;
}

export class AiProviderError extends Error {
  public provider: AiProviderName;
  public status?: number;
  public isRetryable: boolean;
  public isQuotaExhausted: boolean;
  public retryAfterSec?: number;

  constructor(
    provider: AiProviderName,
    message: string,
    options: {
      status?: number;
      isRetryable?: boolean;
      isQuotaExhausted?: boolean;
      retryAfterSec?: number;
    } = {}
  ) {
    super(`[${provider.toUpperCase()}] ${message}`);
    this.name = 'AiProviderError';
    this.provider = provider;
    this.status = options.status;
    this.isRetryable = options.isRetryable ?? false;
    this.isQuotaExhausted = options.isQuotaExhausted ?? false;
    this.retryAfterSec = options.retryAfterSec;
  }
}

export interface IAiProviderAdapter {
  readonly name: AiProviderName;
  isConfigured(): boolean;
  isAvailable(): boolean;
  execute<T = any>(request: AiCompletionRequest): Promise<AiCompletionResponse<T>>;
}

/**
 * Helper to compute jittered exponential backoff delay.
 */
export function getBackoffDelay(attempt: number, baseMs = 300, maxMs = 2000): number {
  const exponential = Math.min(maxMs, baseMs * Math.pow(2, attempt));
  const jitter = Math.random() * (exponential * 0.2);
  return Math.min(maxMs, Math.round(exponential + jitter));
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
