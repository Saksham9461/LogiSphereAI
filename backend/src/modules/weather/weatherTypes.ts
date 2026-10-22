export type AdvisorySeverity = 'NORMAL' | 'ADVISORY' | 'WARNING' | 'ALERT';

export type WeatherIconCategory =
  | 'clear'
  | 'clouds'
  | 'rain'
  | 'drizzle'
  | 'thunderstorm'
  | 'snow'
  | 'mist'
  | 'unknown';

export interface WeatherCondition {
  main: string;
  description: string;
  icon: string;
  iconCategory: WeatherIconCategory;
}

export interface WeatherTemperature {
  current: number; // in °C
  feelsLike: number; // in °C
  tempMin: number;
  tempMax: number;
}

export interface WeatherAdvisory {
  severity: AdvisorySeverity;
  message: string;
}

export interface NormalizedWeather {
  locationName: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  condition: WeatherCondition;
  temperature: WeatherTemperature;
  humidity: number; // percentage (0-100)
  windSpeedKmh: number; // km/h
  windSpeedMs: number; // m/s
  windDirectionDeg?: number;
  visibilityKm: number | null; // km
  precipitationMm: number | null; // mm
  hasPrecipitation: boolean;
  advisory: WeatherAdvisory;
  lastUpdated: string; // ISO string
  isCached: boolean;
  isStale: boolean;
  dataSource: 'openweather' | 'cache_fallback';
}

export interface WeatherCacheEntry {
  data: NormalizedWeather;
  cachedAt: number;
  expiresAt: number;
}
