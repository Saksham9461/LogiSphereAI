import { env } from '../../config/env';
import { generateDeterministicWeatherAdvisory } from './weatherAdvisory';
import { weatherCache } from './weatherCache';
import { NormalizedWeather, WeatherIconCategory } from './weatherTypes';

export interface FetchWeatherOptions {
  latitude: number;
  longitude: number;
  destinationName?: string;
  bypassCache?: boolean;
}

export type WeatherHttpFetcher = (url: string, options?: { timeoutMs?: number }) => Promise<{
  status: number;
  data: any;
}>;

/**
 * Default HTTP fetcher using Node.js global fetch with AbortSignal timeout.
 */
export const defaultHttpFetcher: WeatherHttpFetcher = async (url: string, options = {}) => {
  const timeoutMs = options.timeoutMs || env.OPENWEATHER_TIMEOUT_MS || 5000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { signal: controller.signal });
    const data = await res.json().catch(() => null);
    return {
      status: res.status,
      data,
    };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      const timeoutErr: any = new Error('Weather upstream request timed out');
      timeoutErr.status = 504;
      throw timeoutErr;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
};

let activeHttpFetcher: WeatherHttpFetcher = defaultHttpFetcher;

/**
 * Allows test suites to inject a mocked HTTP fetcher without consuming real OpenWeather quota.
 */
export function setWeatherHttpFetcher(fetcher: WeatherHttpFetcher): void {
  activeHttpFetcher = fetcher;
}

export function resetWeatherHttpFetcher(): void {
  activeHttpFetcher = defaultHttpFetcher;
}

function resolveIconCategory(conditionId: number): WeatherIconCategory {
  if (conditionId >= 200 && conditionId < 300) return 'thunderstorm';
  if (conditionId >= 300 && conditionId < 400) return 'drizzle';
  if (conditionId >= 500 && conditionId < 600) return 'rain';
  if (conditionId >= 600 && conditionId < 700) return 'snow';
  if (conditionId >= 700 && conditionId < 800) return 'mist';
  if (conditionId === 800) return 'clear';
  if (conditionId > 800) return 'clouds';
  return 'unknown';
}

/**
 * Validates coordinate ranges.
 */
export function validateCoordinates(lat: any, lon: any): { valid: boolean; lat: number; lon: number; error?: string } {
  if (lat === undefined || lat === null || lon === undefined || lon === null || lat === '' || lon === '') {
    return { valid: false, lat: NaN, lon: NaN, error: 'Latitude and longitude coordinates are required.' };
  }

  const numLat = Number(lat);
  const numLon = Number(lon);

  if (isNaN(numLat) || numLat < -90 || numLat > 90) {
    return { valid: false, lat: numLat, lon: numLon, error: 'Latitude must be a valid number between -90 and 90.' };
  }

  if (isNaN(numLon) || numLon < -180 || numLon > 180) {
    return { valid: false, lat: numLat, lon: numLon, error: 'Longitude must be a valid number between -180 and 180.' };
  }

  return { valid: true, lat: numLat, lon: numLon };
}

/**
 * Normalizes OpenWeather raw API payload into the application standard response structure.
 */
export function normalizeOpenWeatherPayload(raw: any, lat: number, lon: number, customLocationName?: string): NormalizedWeather {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Malformed upstream weather payload');
  }

  const weatherArr = Array.isArray(raw.weather) && raw.weather.length > 0 ? raw.weather[0] : {};
  const conditionId = Number(weatherArr.id || 800);
  const conditionMain = String(weatherArr.main || 'Clear');
  const conditionDescription = String(weatherArr.description || 'clear sky');
  const conditionIcon = String(weatherArr.icon || '01d');

  const main = raw.main || {};
  const currentTemp = Math.round(Number(main.temp ?? 25) * 10) / 10;
  const feelsLike = Math.round(Number(main.feels_like ?? currentTemp) * 10) / 10;
  const tempMin = Math.round(Number(main.temp_min ?? currentTemp) * 10) / 10;
  const tempMax = Math.round(Number(main.temp_max ?? currentTemp) * 10) / 10;
  const humidity = Math.min(100, Math.max(0, Math.round(Number(main.humidity ?? 50))));

  const wind = raw.wind || {};
  const windSpeedMs = Math.round(Number(wind.speed ?? 0) * 10) / 10;
  const windSpeedKmh = Math.round(windSpeedMs * 3.6 * 10) / 10;
  const windDirectionDeg = wind.deg !== undefined ? Number(wind.deg) : undefined;

  const visibilityMeters = raw.visibility !== undefined ? Number(raw.visibility) : null;
  const visibilityKm = visibilityMeters !== null && !isNaN(visibilityMeters)
    ? Math.round((visibilityMeters / 1000) * 10) / 10
    : null;

  // Rain volume if present
  let precipitationMm: number | null = null;
  if (raw.rain && typeof raw.rain === 'object') {
    const r1h = raw.rain['1h'];
    const r3h = raw.rain['3h'];
    if (r1h !== undefined && !isNaN(Number(r1h))) {
      precipitationMm = Math.round(Number(r1h) * 10) / 10;
    } else if (r3h !== undefined && !isNaN(Number(r3h))) {
      precipitationMm = Math.round(Number(r3h) * 10) / 10;
    }
  }

  const hasPrecipitation = (precipitationMm !== null && precipitationMm > 0) ||
    ['rain', 'drizzle', 'thunderstorm', 'snow'].includes(resolveIconCategory(conditionId));

  const locationName = customLocationName || raw.name || `${lat.toFixed(2)}, ${lon.toFixed(2)}`;

  const advisory = generateDeterministicWeatherAdvisory({
    conditionMain,
    conditionDescription,
    conditionId,
    temperatureCurrent: currentTemp,
    windSpeedKmh,
    visibilityKm,
    precipitationMm,
  });

  return {
    locationName,
    coordinates: {
      latitude: lat,
      longitude: lon,
    },
    condition: {
      main: conditionMain,
      description: conditionDescription,
      icon: conditionIcon,
      iconCategory: resolveIconCategory(conditionId),
    },
    temperature: {
      current: currentTemp,
      feelsLike,
      tempMin,
      tempMax,
    },
    humidity,
    windSpeedKmh,
    windSpeedMs,
    windDirectionDeg,
    visibilityKm,
    precipitationMm,
    hasPrecipitation,
    advisory,
    lastUpdated: new Date().toISOString(),
    isCached: false,
    isStale: false,
    dataSource: 'openweather',
  };
}

/**
 * Authoritative destination weather service.
 * Enforces caching, coalescing, timeout protection, stale fallback, and zero key leaks.
 */
export async function getDestinationWeather(options: FetchWeatherOptions): Promise<NormalizedWeather> {
  const coordCheck = validateCoordinates(options.latitude, options.longitude);
  if (!coordCheck.valid) {
    const err: any = new Error(coordCheck.error);
    err.status = 400;
    throw err;
  }

  const { lat, lon } = coordCheck;
  const cacheKey = weatherCache.getCacheKey(lat, lon);

  // 1. Fresh cache check
  if (!options.bypassCache) {
    const cachedFresh = weatherCache.getFresh(cacheKey);
    if (cachedFresh) {
      if (options.destinationName && cachedFresh.locationName !== options.destinationName) {
        return { ...cachedFresh, locationName: options.destinationName };
      }
      return cachedFresh;
    }
  }

  // 2. Request coalescing: reuse active upstream call
  const activePromise = weatherCache.getInFlight(cacheKey);
  if (activePromise) {
    const result = await activePromise;
    if (options.destinationName && result.locationName !== options.destinationName) {
      return { ...result, locationName: options.destinationName };
    }
    return result;
  }

  // 3. Negative cache check
  const negative = weatherCache.getNegative(cacheKey);
  if (negative && !options.bypassCache) {
    // If a stale cache exists, prefer returning stale cache over negative failure!
    const staleFallback = weatherCache.getStale(cacheKey);
    if (staleFallback) {
      return {
        ...staleFallback,
        locationName: options.destinationName || staleFallback.locationName,
      };
    }
    const negErr: any = new Error(negative.errorMessage);
    negErr.status = negative.statusCode || 502;
    throw negErr;
  }

  // 4. API Key check
  const apiKey = (process.env.OPENWEATHER_API_KEY || env.OPENWEATHER_API_KEY || '').trim();
  if (!apiKey) {
    // Fall back to stale cache if available
    const staleFallback = weatherCache.getStale(cacheKey);
    if (staleFallback) {
      return {
        ...staleFallback,
        locationName: options.destinationName || staleFallback.locationName,
      };
    }

    const keyErr: any = new Error('Weather service unavailable: OPENWEATHER_API_KEY is not configured on the server.');
    keyErr.status = 503;
    throw keyErr;
  }

  // 5. Initiate upstream request with coalescing
  const fetchPromise = (async (): Promise<NormalizedWeather> => {
    const upstreamUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${encodeURIComponent(apiKey)}&units=metric`;

    try {
      const response = await activeHttpFetcher(upstreamUrl, {
        timeoutMs: env.OPENWEATHER_TIMEOUT_MS || 5000,
      });

      if (response.status === 401 || response.status === 403) {
        weatherCache.setNegative(cacheKey, 'Weather service authorization failed', 502);
        const err: any = new Error('Weather service configuration error.');
        err.status = 502;
        throw err;
      }

      if (response.status === 429) {
        weatherCache.setNegative(cacheKey, 'Weather provider rate limit reached', 429);
        const err: any = new Error('Weather provider rate limit reached. Please retry in a few minutes.');
        err.status = 429;
        throw err;
      }

      if (response.status < 200 || response.status >= 300) {
        weatherCache.setNegative(cacheKey, `Weather provider returned status ${response.status}`, 502);
        const err: any = new Error(`Weather provider error (${response.status})`);
        err.status = 502;
        throw err;
      }

      const normalized = normalizeOpenWeatherPayload(response.data, lat, lon, options.destinationName);

      // Save into fresh cache
      weatherCache.set(cacheKey, normalized);

      return normalized;
    } catch (err: any) {
      // Check if stale cache is available as resilient fallback
      const staleFallback = weatherCache.getStale(cacheKey);
      if (staleFallback) {
        return {
          ...staleFallback,
          locationName: options.destinationName || staleFallback.locationName,
        };
      }

      // Record negative cache entry if not already set
      if (!weatherCache.getNegative(cacheKey)) {
        weatherCache.setNegative(cacheKey, err.message || 'Upstream request failed', err.status || 502);
      }

      // Ensure API keys are never exposed in error messages
      let safeMessage = err.message || 'Failed to fetch destination weather';
      if (apiKey && safeMessage.includes(apiKey)) {
        safeMessage = 'Upstream weather service error';
      }

      const clientErr: any = new Error(safeMessage);
      clientErr.status = err.status || 502;
      throw clientErr;
    }
  })();

  weatherCache.setInFlight(cacheKey, fetchPromise);
  return fetchPromise;
}
