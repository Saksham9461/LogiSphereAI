import { describe, it, expect, vi, beforeEach } from 'vitest';
import { aiProviderManager, AIProviderManager } from '../src/modules/ai/providerManager';
import { IAiProviderAdapter, AiCompletionRequest, AiCompletionResponse, AiProviderError } from '../src/modules/ai/providerTypes';
import { aiCache } from '../src/modules/ai/cache';
import { executeResilientAi } from '../src/modules/ai/orchestrator';

class MockAdapter implements IAiProviderAdapter {
  constructor(
    public readonly name: 'gemini' | 'groq' | 'cerebras',
    public configured: boolean = true,
    public available: boolean = true,
    public handler?: (req: AiCompletionRequest) => Promise<AiCompletionResponse>
  ) {}

  isConfigured(): boolean {
    return this.configured;
  }

  isAvailable(): boolean {
    return this.available;
  }

  async execute<T = any>(request: AiCompletionRequest): Promise<AiCompletionResponse<T>> {
    if (this.handler) {
      return (await this.handler(request)) as AiCompletionResponse<T>;
    }
    return {
      provider: this.name,
      model: 'test-model',
      rawText: '{"result":"success"}',
      data: { result: 'success' } as any,
      latencyMs: 10,
    };
  }
}

describe('AIProviderManager Fallback Sequence & Resilience', () => {
  beforeEach(() => {
    aiCache.clear();
    vi.restoreAllMocks();
  });

  it('1. Primary provider Gemini succeeds on healthy call', async () => {
    const manager = new AIProviderManager();
    const mockGemini = new MockAdapter('gemini', true, true);
    const mockGroq = new MockAdapter('groq', true, true);
    const mockCerebras = new MockAdapter('cerebras', true, true);

    const geminiSpy = vi.spyOn(mockGemini, 'execute');
    const groqSpy = vi.spyOn(mockGroq, 'execute');
    const cerebrasSpy = vi.spyOn(mockCerebras, 'execute');

    manager.registerProvider(mockGemini);
    manager.registerProvider(mockGroq);
    manager.registerProvider(mockCerebras);

    const { response, attempts } = await manager.execute({ userPrompt: 'test prompt' });

    expect(response.provider).toBe('gemini');
    expect(geminiSpy).toHaveBeenCalledTimes(1);
    expect(groqSpy).not.toHaveBeenCalled();
    expect(cerebrasSpy).not.toHaveBeenCalled();
    expect(attempts).toHaveLength(1);
    expect(attempts[0].success).toBe(true);
  });

  it('2. Gemini rate-limit/quota failure seamlessly falls back to Groq', async () => {
    const manager = new AIProviderManager();
    const mockGemini = new MockAdapter('gemini', true, true, async () => {
      throw new AiProviderError('gemini', 'Rate limited 429', { status: 429, isRetryable: true, isQuotaExhausted: true });
    });
    const mockGroq = new MockAdapter('groq', true, true);
    const mockCerebras = new MockAdapter('cerebras', true, true);

    const geminiSpy = vi.spyOn(mockGemini, 'execute');
    const groqSpy = vi.spyOn(mockGroq, 'execute');
    const cerebrasSpy = vi.spyOn(mockCerebras, 'execute');

    manager.registerProvider(mockGemini);
    manager.registerProvider(mockGroq);
    manager.registerProvider(mockCerebras);

    const { response, attempts } = await manager.execute({ userPrompt: 'test prompt' });

    expect(response.provider).toBe('groq');
    expect(geminiSpy).toHaveBeenCalledTimes(1);
    expect(groqSpy).toHaveBeenCalledTimes(1);
    expect(cerebrasSpy).not.toHaveBeenCalled();
    expect(attempts).toHaveLength(2);
    expect(attempts[0].provider).toBe('gemini');
    expect(attempts[0].success).toBe(false);
    expect(attempts[1].provider).toBe('groq');
    expect(attempts[1].success).toBe(true);
  });

  it('3. Groq failure cascades to Cerebras', async () => {
    const manager = new AIProviderManager();
    const mockGemini = new MockAdapter('gemini', true, true, async () => {
      throw new AiProviderError('gemini', 'Server error 503', { status: 503, isRetryable: true });
    });
    const mockGroq = new MockAdapter('groq', true, true, async () => {
      throw new AiProviderError('groq', 'Rate limit 429', { status: 429, isRetryable: true });
    });
    const mockCerebras = new MockAdapter('cerebras', true, true);

    const geminiSpy = vi.spyOn(mockGemini, 'execute');
    const groqSpy = vi.spyOn(mockGroq, 'execute');
    const cerebrasSpy = vi.spyOn(mockCerebras, 'execute');

    manager.registerProvider(mockGemini);
    manager.registerProvider(mockGroq);
    manager.registerProvider(mockCerebras);

    const { response, attempts } = await manager.execute({ userPrompt: 'test prompt' });

    expect(response.provider).toBe('cerebras');
    expect(geminiSpy).toHaveBeenCalledTimes(1);
    expect(groqSpy).toHaveBeenCalledTimes(1);
    expect(cerebrasSpy).toHaveBeenCalledTimes(1);
    expect(attempts).toHaveLength(3);
    expect(attempts[2].provider).toBe('cerebras');
    expect(attempts[2].success).toBe(true);
  });

  it('4. Unconfigured providers are cleanly skipped without wasted network attempts', async () => {
    const manager = new AIProviderManager();
    const mockGemini = new MockAdapter('gemini', false, false); // not configured
    const mockGroq = new MockAdapter('groq', true, true); // configured
    const mockCerebras = new MockAdapter('cerebras', false, false); // not configured

    const geminiSpy = vi.spyOn(mockGemini, 'execute');
    const groqSpy = vi.spyOn(mockGroq, 'execute');

    manager.registerProvider(mockGemini);
    manager.registerProvider(mockGroq);
    manager.registerProvider(mockCerebras);

    const { response, attempts } = await manager.execute({ userPrompt: 'test prompt' });

    expect(response.provider).toBe('groq');
    expect(geminiSpy).not.toHaveBeenCalled();
    expect(groqSpy).toHaveBeenCalledTimes(1);
    expect(attempts).toHaveLength(1);
    expect(attempts[0].provider).toBe('groq');
  });

  it('5. Providers currently in cooldown are skipped', async () => {
    const manager = new AIProviderManager();
    const mockGemini = new MockAdapter('gemini', true, false); // in cooldown
    const mockGroq = new MockAdapter('groq', true, true);

    const geminiSpy = vi.spyOn(mockGemini, 'execute');
    const groqSpy = vi.spyOn(mockGroq, 'execute');

    manager.registerProvider(mockGemini);
    manager.registerProvider(mockGroq);

    const { response, attempts } = await manager.execute({ userPrompt: 'test prompt' });

    expect(response.provider).toBe('groq');
    expect(geminiSpy).not.toHaveBeenCalled();
    expect(groqSpy).toHaveBeenCalledTimes(1);
    expect(attempts[0].provider).toBe('gemini');
    expect(attempts[0].success).toBe(false);
    expect(attempts[0].error).toContain('cooldown');
    expect(attempts[1].provider).toBe('groq');
  });

  it('6. All providers failing triggers deterministic fallback via executeResilientAi', async () => {
    const mockGemini = new MockAdapter('gemini', true, true, async () => {
      throw new AiProviderError('gemini', 'Quota dead', { isRetryable: true });
    });
    const mockGroq = new MockAdapter('groq', true, true, async () => {
      throw new AiProviderError('groq', 'Server down', { isRetryable: true });
    });
    const mockCerebras = new MockAdapter('cerebras', true, true, async () => {
      throw new AiProviderError('cerebras', 'Out of service', { isRetryable: true });
    });

    aiProviderManager.registerProvider(mockGemini);
    aiProviderManager.registerProvider(mockGroq);
    aiProviderManager.registerProvider(mockCerebras);

    const deterministicFallback = {
      source: 'deterministic_fallback' as const,
      advice: 'Safe deterministic operational fallback calculation',
    };

    const result = await executeResilientAi({
      feature: 'ROUTE_RECOMMENDATION',
      tenantOrUserId: 'test-org-123',
      normalizedInput: { tripId: 'TRP-101' },
      executeAi: async () => {
        const { response } = await aiProviderManager.execute({ userPrompt: 'calculate route' });
        return response.data;
      },
      getFallback: () => deterministicFallback,
    });

    expect(result).toEqual(deterministicFallback);
  });

  it('7. Valid cache hit completely skips calling any AI provider', async () => {
    const mockGemini = new MockAdapter('gemini', true, true);
    const geminiSpy = vi.spyOn(mockGemini, 'execute');
    aiProviderManager.registerProvider(mockGemini);

    const input = { vehicleId: 'veh-999', date: '2026-10-23' };

    // 1st invocation: Cache miss -> calls provider
    const res1 = await executeResilientAi({
      feature: 'MAINTENANCE_FORECAST',
      tenantOrUserId: 'org-cache-test',
      normalizedInput: input,
      executeAi: async () => {
        const { response } = await aiProviderManager.execute({ userPrompt: 'forecast' });
        return { source: 'ai', budget: 15000 };
      },
      getFallback: () => ({ source: 'fallback', budget: 5000 }),
    });

    expect(res1.source).toBe('ai');
    expect(geminiSpy).toHaveBeenCalledTimes(1);

    // 2nd invocation: Cache hit -> zero provider calls
    const res2 = await executeResilientAi({
      feature: 'MAINTENANCE_FORECAST',
      tenantOrUserId: 'org-cache-test',
      normalizedInput: input,
      executeAi: async () => {
        const { response } = await aiProviderManager.execute({ userPrompt: 'forecast' });
        return { source: 'ai', budget: 15000 };
      },
      getFallback: () => ({ source: 'fallback', budget: 5000 }),
    });

    expect(res2).toEqual(res1);
    expect(geminiSpy).toHaveBeenCalledTimes(1); // Still 1! Provider was not called again
  });
});
