import {
  IAiProviderAdapter,
  AiCompletionRequest,
  AiCompletionResponse,
  AiProviderName,
  AiProviderError,
} from './providerTypes';
import { GeminiProviderAdapter } from './geminiAdapter';
import { GroqProviderAdapter } from './groqAdapter';
import { CerebrasProviderAdapter } from './cerebrasAdapter';

export interface ProviderAttemptResult {
  provider: AiProviderName;
  success: boolean;
  error?: string;
  latencyMs?: number;
}

export class AIProviderManager {
  private providers: Map<AiProviderName, IAiProviderAdapter> = new Map();
  private providerSequence: AiProviderName[] = ['gemini', 'groq', 'cerebras'];

  constructor() {
    this.registerProvider(new GeminiProviderAdapter());
    this.registerProvider(new GroqProviderAdapter());
    this.registerProvider(new CerebrasProviderAdapter());

    // Startup diagnostic: print which providers are configured
    const configured = this.providerSequence.filter((name) => {
      const adapter = this.providers.get(name);
      return adapter && adapter.isConfigured();
    });
    const unconfigured = this.providerSequence.filter((name) => {
      const adapter = this.providers.get(name);
      return !adapter || !adapter.isConfigured();
    });

    console.log(
      `\x1b[36m[AIProviderManager]\x1b[0m Initialized. Configured providers: \x1b[32m${configured.map(p => p.toUpperCase()).join(' → ') || 'NONE'}\x1b[0m` +
      (unconfigured.length > 0 ? ` | \x1b[33mNo API key set for: ${unconfigured.map(p => p.toUpperCase()).join(', ')}\x1b[0m` : '')
    );
  }

  registerProvider(adapter: IAiProviderAdapter): void {
    this.providers.set(adapter.name, adapter);
  }

  getProvider(name: AiProviderName): IAiProviderAdapter | undefined {
    return this.providers.get(name);
  }

  /**
   * Return list of providers in priority order that are currently configured
   */
  getConfiguredProviders(): AiProviderName[] {
    return this.providerSequence.filter((name) => {
      const adapter = this.providers.get(name);
      return adapter && adapter.isConfigured();
    });
  }

  /**
   * Return health status of all providers
   */
  getStatus(): Record<AiProviderName, { configured: boolean; available: boolean }> {
    const status: any = {};
    for (const name of this.providerSequence) {
      const adapter = this.providers.get(name);
      status[name] = {
        configured: Boolean(adapter && adapter.isConfigured()),
        available: Boolean(adapter && adapter.isAvailable()),
      };
    }
    return status;
  }

  /**
   * Execute request with automatic fallback priority:
   * 1. Gemini
   * 2. Groq
   * 3. Cerebras
   */
  async execute<T = any>(
    request: AiCompletionRequest,
    featureName?: string
  ): Promise<{ response: AiCompletionResponse<T>; attempts: ProviderAttemptResult[] }> {
    const attempts: ProviderAttemptResult[] = [];
    let lastError: any = null;

    for (const providerName of this.providerSequence) {
      const adapter = this.providers.get(providerName);
      if (!adapter) continue;

      if (!adapter.isConfigured()) {
        // Skip unconfigured providers silently without wasting network
        continue;
      }

      if (!adapter.isAvailable()) {
        console.warn(`[AIProviderManager] Skipping provider "${providerName}" (in cooldown or circuit breaker open).`);
        attempts.push({
          provider: providerName,
          success: false,
          error: 'Provider in cooldown or circuit breaker open',
        });
        continue;
      }

      const pStartTime = Date.now();
      console.log(`[AI-Provider] Calling provider "${providerName.toUpperCase()}" for feature "${featureName || 'general'}"...`);
      try {
        const response = await adapter.execute<T>(request);
        const pLatency = Date.now() - pStartTime;
        attempts.push({
          provider: providerName,
          success: true,
          latencyMs: pLatency,
        });

        console.log(
          `\x1b[32m✔ [AI-Provider SUCCESS]\x1b[0m Feature "${featureName || 'general'}" responded by \x1b[1m\x1b[36m${providerName.toUpperCase()}\x1b[0m (${pLatency}ms)${attempts.length > 1 ? ` [after ${attempts.length - 1} fallback(s)]` : ''}`
        );

        return { response, attempts };
      } catch (err: any) {
        const pLatency = Date.now() - pStartTime;
        const errMsg = err?.message || String(err);
        lastError = err;

        attempts.push({
          provider: providerName,
          success: false,
          error: errMsg,
          latencyMs: pLatency,
        });

        console.warn(
          `\x1b[33m⚠ [AI-Provider FAILED]\x1b[0m "${providerName.toUpperCase()}" failed (${pLatency}ms) for "${featureName || 'general'}": ${errMsg}. Falling back to next AI provider...`
        );

        // If the error was explicitly a client/permanent input error (e.g. invalid user input / 400), don't retry other providers
        if (err instanceof AiProviderError && !err.isRetryable && err.status === 400) {
          throw err;
        }
      }
    }

    throw lastError || new Error('All configured AI providers (Gemini, Groq, Cerebras) failed or were unavailable');
  }
}

export const aiProviderManager = new AIProviderManager();
