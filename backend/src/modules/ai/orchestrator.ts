import { env } from '../../config/env';
import { aiCache, AiFeatureType, generateCacheKey, FEATURE_TTL_SECONDS } from './cache';
import { singleFlight } from './singleFlight';
import { aiMetrics } from './metrics';

export interface ResilientAiOptions<T> {
  feature: AiFeatureType;
  tenantOrUserId?: string | null;
  normalizedInput: any;
  ttlSeconds?: number;
  schemaVersion?: string;
  skipCache?: boolean;
  executeAi?: () => Promise<T>;
  executeGemini?: () => Promise<T>;
  validateResponse?: (data: T) => boolean;
  getFallback: () => T;
}

/**
 * Standard resilient pipeline orchestrating:
 * Cache Check -> Single-Flight Coalesce -> AI Execution (Gemini -> Groq -> Cerebras) -> Validation -> Cache Write -> Deterministic Fallback.
 */
export async function executeResilientAi<T>(options: ResilientAiOptions<T>): Promise<T> {
  const model = env.GEMINI_MODEL || 'gemini-1.5-flash';
  const ttl = options.ttlSeconds ?? FEATURE_TTL_SECONDS[options.feature] ?? env.AI_CACHE_TTL_SECONDS ?? 300;

  // 1. Generate deterministic SHA-256 cache key
  const cacheKey = generateCacheKey({
    feature: options.feature,
    model,
    normalizedInput: options.normalizedInput,
    tenantOrUserId: options.tenantOrUserId,
    schemaVersion: options.schemaVersion || 'v1',
  });

  // 2. Cache Lookup (unless explicitly skipped)
  if (!options.skipCache) {
    const cached = aiCache.get<T>(cacheKey);
    if (cached !== null) {
      aiMetrics.recordOperation(true, false);
      return cached;
    }
  }

  // 3. Single-flight request coalescing for concurrent cache misses
  try {
    const { result, wasCoalesced } = await singleFlight.do<T>(cacheKey, async () => {
      // Re-check cache in case an earlier coalesced peer just populated it
      if (!options.skipCache) {
        const recheck = aiCache.get<T>(cacheKey);
        if (recheck !== null) {
          return recheck;
        }
      }

      try {
        // 4. Call AI via provider manager (Gemini -> Groq -> Cerebras)
        const executor = options.executeAi || options.executeGemini;
        if (!executor) {
          throw new Error('No AI execution function provided');
        }
        const generated = await executor();

        // 5. Response Validation
        const isValid = options.validateResponse ? options.validateResponse(generated) : Boolean(generated);
        if (!isValid) {
          console.warn(`[executeResilientAi] Response validation failed for feature "${options.feature}". Using fallback.`);
          aiMetrics.recordFallback();
          return options.getFallback();
        }

        // 6. Cache Validated Result
        if (!options.skipCache) {
          aiCache.set(cacheKey, generated, ttl, options.feature, options.tenantOrUserId);
        }

        return generated;
      } catch (err: any) {
        // Log with full provider chain context — not just 'Gemini'
        const providerHint = err?.provider ? `[${String(err.provider).toUpperCase()}]` : '[ALL PROVIDERS]';
        console.warn(`\x1b[31m✖ [executeResilientAi]\x1b[0m ${providerHint} All AI calls failed for "${options.feature}": ${err?.message || err}. Returning deterministic fallback.`);
        aiMetrics.recordFallback();
        return options.getFallback();
      }
    });

    aiMetrics.recordOperation(false, wasCoalesced);
    return result;
  } catch (err: any) {
    console.error(`[executeResilientAi] Critical singleFlight error for "${options.feature}":`, err?.message || err);
    aiMetrics.recordFallback();
    return options.getFallback();
  }
}
