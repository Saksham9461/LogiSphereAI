import crypto from 'crypto';

export type AiFeatureType =
  | 'TRIP_DELAY_INSIGHTS'
  | 'MAINTENANCE_FORECAST'
  | 'ROUTE_RECOMMENDATION'
  | 'AI_ASSISTANT_QUERY'
  | 'FUEL_ANOMALY_DETECTION';

export interface CacheKeyOptions {
  feature: AiFeatureType;
  model: string;
  normalizedInput: any;
  tenantOrUserId?: string | null;
  schemaVersion?: string;
}

export interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  expiresAt: number;
  ttlSeconds: number;
  key: string;
  feature: AiFeatureType;
  tenantOrUserId?: string | null;
}

export interface CacheStats {
  size: number;
  maxEntries: number;
  hits: number;
  misses: number;
  evictions: number;
  expirations: number;
  hitRatio: number;
}

/**
 * Feature-specific TTL defaults (in seconds):
 * - TRIP_DELAY_INSIGHTS: 3 minutes (180s)
 * - MAINTENANCE_FORECAST: 30 minutes (1800s)
 * - ROUTE_RECOMMENDATION: 10 minutes (600s)
 * - AI_ASSISTANT_QUERY: 5 minutes (300s)
 * - FUEL_ANOMALY_DETECTION: 15 minutes (900s)
 */
export const FEATURE_TTL_SECONDS: Record<AiFeatureType, number> = {
  TRIP_DELAY_INSIGHTS: 180,
  MAINTENANCE_FORECAST: 1800,
  ROUTE_RECOMMENDATION: 600,
  AI_ASSISTANT_QUERY: 300,
  FUEL_ANOMALY_DETECTION: 900,
};

/**
 * Deterministically normalize any JavaScript object or primitive for hashing.
 * Sorts object keys recursively, trims strings, and ignores undefined values.
 */
export function normalizeForHashing(val: any): any {
  if (val === null || val === undefined) {
    return null;
  }
  if (typeof val === 'string') {
    return val.trim();
  }
  if (typeof val === 'number' || typeof val === 'boolean') {
    return val;
  }
  if (Array.isArray(val)) {
    return val.map(normalizeForHashing);
  }
  if (typeof val === 'object') {
    const sortedKeys = Object.keys(val).sort();
    const result: Record<string, any> = {};
    for (const key of sortedKeys) {
      // Do not include sensitive keys or non-deterministic fields in cache key
      if (['token', 'password', 'authorization', 'secret', 'key'].includes(key.toLowerCase())) {
        continue;
      }
      result[key] = normalizeForHashing(val[key]);
    }
    return result;
  }
  return String(val);
}

/**
 * Generate a deterministic SHA-256 hash key for an AI request.
 */
export function generateCacheKey(options: CacheKeyOptions): string {
  const schemaVer = options.schemaVersion || 'v1';
  const tenantScope = options.tenantOrUserId ? String(options.tenantOrUserId).trim() : 'global';
  const normalized = normalizeForHashing(options.normalizedInput);
  const normalizedJson = JSON.stringify(normalized);

  const hash = crypto
    .createHash('sha256')
    .update(`${options.feature}:${options.model}:${schemaVer}:${tenantScope}:${normalizedJson}`)
    .digest('hex');

  return `ai:${options.feature}:${tenantScope}:${hash.slice(0, 32)}`;
}

/**
 * Bounded In-Memory TTL Cache with LRU-style eviction.
 *
 * Characteristics:
 * - Thread-safe within Node's single-threaded event loop.
 * - Explicit max entries cap to prevent memory bloat.
 * - Map preserves insertion order, allowing LRU eviction of oldest entries.
 * - Periodic garbage collection of expired entries.
 * - Isolated by tenant / user ID to prevent unauthorized cache leakage.
 */
export class AiCacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private maxEntries: number;
  private hits = 0;
  private misses = 0;
  private evictions = 0;
  private expirations = 0;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(maxEntries = 500, cleanupIntervalMs = 60000) {
    this.maxEntries = maxEntries;

    if (process.env.NODE_ENV !== 'test') {
      this.cleanupTimer = setInterval(() => {
        this.cleanExpired();
      }, cleanupIntervalMs);
      if (this.cleanupTimer.unref) {
        this.cleanupTimer.unref();
      }
    }
  }

  /**
   * Retrieve an item from cache.
   * If expired, removes it and returns null.
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.expirations++;
      this.misses++;
      return null;
    }

    // Refresh LRU position by re-inserting
    this.cache.delete(key);
    this.cache.set(key, entry);

    this.hits++;
    return entry.data as T;
  }

  /**
   * Store an item in the cache.
   * Evicts the oldest item if max capacity is reached.
   */
  set<T>(
    key: string,
    data: T,
    ttlSeconds: number,
    feature: AiFeatureType,
    tenantOrUserId?: string | null
  ): void {
    // Validate: Never cache null, undefined, or error responses
    if (data === null || data === undefined) {
      return;
    }

    // Enforce max entries cap (evict oldest)
    if (this.cache.size >= this.maxEntries && !this.cache.has(key)) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.evictions++;
      }
    }

    const now = Date.now();
    const expiresAt = now + ttlSeconds * 1000;

    this.cache.set(key, {
      data,
      cachedAt: now,
      expiresAt,
      ttlSeconds,
      key,
      feature,
      tenantOrUserId: tenantOrUserId || undefined,
    });
  }

  /**
   * Invalidate a specific key.
   */
  invalidate(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Invalidate entries matching a prefix or feature.
   */
  invalidatePrefix(prefix: string): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Invalidate all entries for a specific tenant or user.
   */
  invalidateTenant(tenantOrUserId: string): number {
    let count = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tenantOrUserId === tenantOrUserId || key.includes(`:${tenantOrUserId}:`)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Invalidate all entries for a specific feature.
   */
  invalidateFeature(feature: AiFeatureType): number {
    let count = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.feature === feature || key.startsWith(`ai:${feature}:`)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Remove expired items.
   */
  cleanExpired(): number {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        this.expirations++;
        removed++;
      }
    }
    return removed;
  }

  /**
   * Clear all entries and reset stats.
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
    this.expirations = 0;
  }

  /**
   * Get operational metrics for the cache.
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      maxEntries: this.maxEntries,
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      expirations: this.expirations,
      hitRatio: total > 0 ? Number((this.hits / total).toFixed(4)) : 0,
    };
  }

  /**
   * Clean up timer on shutdown
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

// Singleton global cache instance
export const aiCache = new AiCacheService();
