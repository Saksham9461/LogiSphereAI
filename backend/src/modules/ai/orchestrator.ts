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
  executeGemini: () => Promise<T>;
  validateResponse?: (data: T) => boolean;
  getFallback: () => T;
}

/**
 * Standard resilient pipeline orchestrating:
 * Cache Check -> Single-Flight Coalesce -> Gemini Execution -> Validation -> Cache Write -> Deterministic Fallback.
 */
export async function executeResilientAi<T>(options: ResilientAiOptions<T>): Promise<T> {
  const model = env.GEMINI_MODEL || 'gemini-1.5-flash';
  const ttl = options.ttlSeconds ?? FEATURE_TTL_SECONDS[options.feature] ?? 300;

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
        // 4. Call Gemini via caller's prompt & configuration
        const generated = await options.executeGemini();

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
        console.warn(`[executeResilientAi] Gemini call error for "${options.feature}":`, err?.message || err);
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
