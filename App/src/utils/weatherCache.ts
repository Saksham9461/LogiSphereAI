import AsyncStorage from '@react-native-async-storage/async-storage';

export interface MobileCachedWeather {
  data: any;
  cachedAt: number; // timestamp ms
  isOffline?: boolean;
}

const FRESH_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_STALE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_STORED_ITEMS = 30;
const INDEX_STORAGE_KEY = '@logisphere_weather_index_v1';

// In-flight request tracker to coalesce simultaneous requests
const inFlightRequests = new Map<string, Promise<any>>();

function normalizeCoord(coord: number): string {
  return (Math.round(coord * 100) / 100).toFixed(2);
}

export function buildWeatherStorageKey(tripId?: string | null, lat?: number | null, lon?: number | null): string {
  if (tripId) {
    const cleanId = String(tripId).trim().replace(/^#/, '');
    return `@logisphere_weather_trip_${cleanId}`;
  }
  if (lat !== undefined && lat !== null && lon !== undefined && lon !== null) {
    return `@logisphere_weather_coord_${normalizeCoord(lat)}_${normalizeCoord(lon)}`;
  }
  return '@logisphere_weather_default';
}

/**
 * Retrieves cached weather from AsyncStorage.
 * Returns { cached: MobileCachedWeather, isFresh: boolean } or null.
 */
export async function getMobileCachedWeather(
  storageKey: string
): Promise<{ cached: MobileCachedWeather; isFresh: boolean } | null> {
  try {
    const raw = await AsyncStorage.getItem(storageKey);
    if (!raw) return null;

    const parsed: MobileCachedWeather = JSON.parse(raw);
    if (!parsed || !parsed.data || typeof parsed.cachedAt !== 'number') {
      return null;
    }

    const age = Date.now() - parsed.cachedAt;
    const isFresh = age <= FRESH_TTL_MS;
    const isUsable = age <= MAX_STALE_TTL_MS;

    if (!isUsable) {
      // Exceeded 24h stale limit, clean up
      await AsyncStorage.removeItem(storageKey).catch(() => {});
      return null;
    }

    return {
      cached: {
        ...parsed,
        isOffline: !isFresh,
      },
      isFresh,
    };
  } catch (err) {
    console.warn('[WeatherCache] Failed to read cached weather:', err);
    return null;
  }
}

/**
 * Saves successful weather response to AsyncStorage with bounded capacity.
 */
export async function saveMobileCachedWeather(storageKey: string, weatherData: any): Promise<void> {
  if (!weatherData) return;

  try {
    const entry: MobileCachedWeather = {
      data: weatherData,
      cachedAt: Date.now(),
      isOffline: false,
    };

    await AsyncStorage.setItem(storageKey, JSON.stringify(entry));

    // Update bounded LRU index
    updateStorageIndex(storageKey).catch(() => {});
  } catch (err) {
    console.warn('[WeatherCache] Failed to persist weather to AsyncStorage:', err);
  }
}

async function updateStorageIndex(newKey: string): Promise<void> {
  try {
    const rawIndex = await AsyncStorage.getItem(INDEX_STORAGE_KEY);
    let index: string[] = rawIndex ? JSON.parse(rawIndex) : [];

    // Filter out newKey if already present, and prepend as most recent
    index = [newKey, ...index.filter((k) => k !== newKey)];

    // Evict oldest if exceeding capacity
    if (index.length > MAX_STORED_ITEMS) {
      const keysToEvict = index.slice(MAX_STORED_ITEMS);
      index = index.slice(0, MAX_STORED_ITEMS);
      for (const k of keysToEvict) {
        await AsyncStorage.removeItem(k).catch(() => {});
      }
    }

    await AsyncStorage.setItem(INDEX_STORAGE_KEY, JSON.stringify(index));
  } catch {
    // Non-blocking index management
  }
}

/**
 * Wraps an asynchronous network fetch with in-flight debouncing
 * so multiple calls for the same key await a single network request.
 */
export function coalesceMobileWeatherRequest<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const existing = inFlightRequests.get(key);
  if (existing) {
    return existing;
  }

  const promise = fetcher().finally(() => {
    inFlightRequests.delete(key);
  });

  inFlightRequests.set(key, promise);
  return promise;
}
