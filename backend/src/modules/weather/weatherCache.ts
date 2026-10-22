import { NormalizedWeather, WeatherCacheEntry } from './weatherTypes';

/**
 * In-memory Bounded Weather Cache with Request Coalescing & Negative Caching.
 * 
 * ARCHITECTURAL NOTES:
 * 1. Process-local in-memory cache; resets on backend restart.
 * 2. Normalizes coordinates to ~1.1km meteorological grid (2 decimal places).
 * 3. TTL for fresh weather data is 10 minutes.
 * 4. Stale entries are preserved up to 24 hours to serve as upstream fallbacks during network degradation.
 * 5. Concurrent requests for the same cache key share an in-flight promise (Request Coalescing).
 * 6. Negative caching prevents request storms on upstream failures (30s TTL).
 * 7. Bounded to MAX_CACHE_ENTRIES with LRU-style eviction.
 */

const FRESH_TTL_MS = 10 * 60 * 1000; // 10 minutes
const STALE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours fallback limit
const NEGATIVE_TTL_MS = 30 * 1000; // 30 seconds negative cache
const MAX_CACHE_ENTRIES = 500;

interface NegativeCacheEntry {
  errorMessage: string;
  statusCode?: number;
  cachedAt: number;
  expiresAt: number;
}

export class WeatherCache {
  private cache = new Map<string, WeatherCacheEntry>();
  private negativeCache = new Map<string, NegativeCacheEntry>();
  private inFlight = new Map<string, Promise<NormalizedWeather>>();

  /**
   * Generates a normalized cache key from latitude, longitude, and units.
   * Coordinates are rounded to 2 decimal places (~1.1 km precision).
   */
  public getCacheKey(lat: number, lon: number, units = 'metric'): string {
    const roundedLat = (Math.round(lat * 100) / 100).toFixed(2);
    const roundedLon = (Math.round(lon * 100) / 100).toFixed(2);
    return `weather_${roundedLat}_${roundedLon}_${units}`;
  }

  /**
   * Retrieves fresh cached weather data if available.
   */
  public getFresh(key: string): NormalizedWeather | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now <= entry.expiresAt) {
      // Return a copy marked as fresh cache hit
      return {
        ...entry.data,
        isCached: true,
        isStale: false,
        dataSource: 'cache_fallback',
      };
    }

    return null;
  }

  /**
   * Retrieves stale cached weather data if available within the stale fallback window.
   */
  public getStale(key: string): NormalizedWeather | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now <= entry.cachedAt + STALE_TTL_MS) {
      return {
        ...entry.data,
        isCached: true,
        isStale: true,
        dataSource: 'cache_fallback',
      };
    }

    return null;
  }

  /**
   * Stores fresh weather data into the bounded cache.
   */
  public set(key: string, data: NormalizedWeather, ttlMs = FRESH_TTL_MS): void {
    // Clear any negative cache entry for this key
    this.negativeCache.delete(key);

    this.pruneIfNecessary();

    const now = Date.now();
    this.cache.set(key, {
      data: {
        ...data,
        isCached: true,
        isStale: false,
      },
      cachedAt: now,
      expiresAt: now + ttlMs,
    });
  }

  /**
   * Checks if an active negative cache entry exists.
   */
  public getNegative(key: string): NegativeCacheEntry | null {
    const entry = this.negativeCache.get(key);
    if (!entry) return null;

    if (Date.now() <= entry.expiresAt) {
      return entry;
    }

    this.negativeCache.delete(key);
    return null;
  }

  /**
   * Records a temporary negative cache entry to avoid upstream request storms.
   */
  public setNegative(key: string, errorMessage: string, statusCode = 502, ttlMs = NEGATIVE_TTL_MS): void {
    const now = Date.now();
    this.negativeCache.set(key, {
      errorMessage,
      statusCode,
      cachedAt: now,
      expiresAt: now + ttlMs,
    });
  }

  /**
   * Request Coalescing: gets active in-flight promise for the key if present.
   */
  public getInFlight(key: string): Promise<NormalizedWeather> | undefined {
    return this.inFlight.get(key);
  }

  /**
   * Request Coalescing: registers an in-flight promise for the key.
   */
  public setInFlight(key: string, promise: Promise<NormalizedWeather>): void {
    this.inFlight.set(key, promise);
    promise
      .finally(() => {
        this.inFlight.delete(key);
      })
      .catch(() => {
        // Handled by caller
      });
  }

  /**
   * Clears all cache entries (useful for testing).
   */
  public clear(): void {
    this.cache.clear();
    this.negativeCache.clear();
    this.inFlight.clear();
  }

  /**
   * Current number of cached items.
   */
  public size(): number {
    return this.cache.size;
  }

  /**
   * Evicts expired entries and enforces max capacity limit.
   */
  private pruneIfNecessary(): void {
    const now = Date.now();

    // 1. Remove expired beyond stale window
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.cachedAt + STALE_TTL_MS) {
        this.cache.delete(key);
      }
    }

    // 2. Prune negative cache
    for (const [key, entry] of this.negativeCache.entries()) {
      if (now > entry.expiresAt) {
        this.negativeCache.delete(key);
      }
    }

    // 3. If still over capacity, evict oldest entries
    if (this.cache.size >= MAX_CACHE_ENTRIES) {
      const keysToDelete: string[] = [];
      let count = 0;
      const targetToRemove = Math.max(10, Math.floor(MAX_CACHE_ENTRIES * 0.1));

      for (const key of this.cache.keys()) {
        keysToDelete.push(key);
        count++;
        if (count >= targetToRemove) break;
      }

      for (const k of keysToDelete) {
        this.cache.delete(k);
      }
    }
  }
}

export const weatherCache = new WeatherCache();
