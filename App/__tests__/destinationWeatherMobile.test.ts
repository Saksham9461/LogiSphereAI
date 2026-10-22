/* eslint-disable import/first */
jest.mock('react-native-url-polyfill/auto', () => {});
jest.mock('@maplibre/maplibre-react-native', () => ({}));
jest.mock('../src/services/supabaseClient', () => ({
  supabase: {
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    })),
  },
}));

let mockStorage: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (key: string) => mockStorage[key] || null),
  setItem: jest.fn(async (key: string, val: string) => {
    mockStorage[key] = String(val);
  }),
  removeItem: jest.fn(async (key: string) => {
    delete mockStorage[key];
  }),
  clear: jest.fn(async () => {
    mockStorage = {};
  }),
}));

import {
  buildWeatherStorageKey,
  getMobileCachedWeather,
  saveMobileCachedWeather,
  coalesceMobileWeatherRequest,
} from '../src/utils/weatherCache';
import { GetDestinationWeather, GetTripDelayInsights } from '../src/api/apiPath';

describe('LogiSphere AI — Mobile Destination Weather & Caching Resilience', () => {
  beforeEach(() => {
    mockStorage = {};
    jest.clearAllMocks();
  });

  const sampleWeatherData = {
    locationName: 'Ahmedabad Ashram Road',
    coordinates: { latitude: 23.0225, longitude: 72.5714 },
    condition: { main: 'Clear', description: 'clear sky', icon: '01d', iconCategory: 'clear' },
    temperature: { current: 32, feelsLike: 34, tempMin: 30, tempMax: 35 },
    humidity: 45,
    windSpeedKmh: 12.5,
    windSpeedMs: 3.5,
    visibilityKm: 10,
    precipitationMm: null,
    hasPrecipitation: false,
    advisory: { severity: 'NORMAL', message: 'Favorable travel conditions reported at destination.' },
    lastUpdated: new Date().toISOString(),
    isCached: false,
    isStale: false,
    dataSource: 'openweather',
  };

  it('1. Generates normalized, collision-free storage keys for trips and coordinates', () => {
    const keyTrip = buildWeatherStorageKey('TRP-1001', 23.0225, 72.5714);
    expect(keyTrip).toBe('@logisphere_weather_trip_TRP-1001');

    const keyCleanHash = buildWeatherStorageKey('#TRP-2002', null, null);
    expect(keyCleanHash).toBe('@logisphere_weather_trip_TRP-2002');

    const keyCoords = buildWeatherStorageKey(null, 23.0225, 72.5714);
    expect(keyCoords).toBe('@logisphere_weather_coord_23.02_72.57');
  });

  it('2. Saves and retrieves fresh cached weather from mobile storage', async () => {
    const key = '@logisphere_weather_trip_TRP-TEST-1';
    await saveMobileCachedWeather(key, sampleWeatherData);

    const result = await getMobileCachedWeather(key);
    expect(result).not.toBeNull();
    expect(result!.isFresh).toBe(true);
    expect(result!.cached.isOffline).toBe(false);
    expect(result!.cached.data.locationName).toBe('Ahmedabad Ashram Road');
    expect(result!.cached.data.temperature.current).toBe(32);
  });

  it('3. Stale cached data (>10m) is marked as offline fallback', async () => {
    const key = '@logisphere_weather_trip_TRP-TEST-2';
    // Manually write an entry cached 15 minutes ago
    const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
    mockStorage[key] = JSON.stringify({
      data: sampleWeatherData,
      cachedAt: fifteenMinutesAgo,
      isOffline: false,
    });

    const result = await getMobileCachedWeather(key);
    expect(result).not.toBeNull();
    expect(result!.isFresh).toBe(false); // Stale
    expect(result!.cached.isOffline).toBe(true); // Flagged for offline indicator
    expect(result!.cached.data.locationName).toBe('Ahmedabad Ashram Road');
  });

  it('4. Expired data beyond 24 hours is automatically pruned and returns null', async () => {
    const key = '@logisphere_weather_trip_TRP-TEST-3';
    // 25 hours ago
    const twentyFiveHoursAgo = Date.now() - 25 * 60 * 60 * 1000;
    mockStorage[key] = JSON.stringify({
      data: sampleWeatherData,
      cachedAt: twentyFiveHoursAgo,
    });

    const result = await getMobileCachedWeather(key);
    expect(result).toBeNull();
  });

  it('5. In-flight request coalescing prevents duplicate upstream calls on rapid taps', async () => {
    let networkCallCount = 0;
    const mockFetcher = async () => {
      networkCallCount++;
      await new Promise((r) => setTimeout(() => r(true), 40));
      return sampleWeatherData;
    };

    const key = 'test_coalesce_key';
    const p1 = coalesceMobileWeatherRequest(key, mockFetcher);
    const p2 = coalesceMobileWeatherRequest(key, mockFetcher);
    const p3 = coalesceMobileWeatherRequest(key, mockFetcher);

    const [res1, res2, res3] = await Promise.all([p1, p2, p3]);
    expect(res1).toEqual(sampleWeatherData);
    expect(res2).toEqual(sampleWeatherData);
    expect(res3).toEqual(sampleWeatherData);

    // Crucial: Only 1 network request triggered for all 3 concurrent taps!
    expect(networkCallCount).toBe(1);
  });

  it('6. GetDestinationWeather builds correct URL without breaking GetTripDelayInsights', () => {
    const weatherUrl = GetDestinationWeather('TRP-999', 23.02, 72.57);
    expect(weatherUrl).toContain('/api/trip/TRP-999/destination-weather');
    expect(weatherUrl).toContain('lat=23.02');
    expect(weatherUrl).toContain('lon=72.57');

    // Confirm existing AI Delay endpoint format is 100% preserved
    const delayUrl = GetTripDelayInsights('TRP-999');
    expect(delayUrl).toContain('/api/trip/TRP-999/delay-insights');
    expect(delayUrl).not.toBe(weatherUrl);
  });
});
