import { WeatherAdvisory } from './weatherTypes';

interface WeatherAdvisoryInput {
  conditionMain?: string;
  conditionDescription?: string;
  conditionId?: number;
  temperatureCurrent?: number;
  windSpeedKmh?: number;
  visibilityKm?: number | null;
  precipitationMm?: number | null;
}

/**
 * Deterministically derives a compact, safety-oriented travel advisory
 * based strictly on validated real weather metrics.
 * 
 * NOTE: This is purely deterministic rule-based advice.
 * It never calls LLMs, never invents delay durations, and does not alter ETAs.
 */
export function generateDeterministicWeatherAdvisory(input: WeatherAdvisoryInput): WeatherAdvisory {
  const {
    conditionMain = '',
    conditionDescription = '',
    conditionId = 0,
    temperatureCurrent,
    windSpeedKmh,
    visibilityKm,
    precipitationMm,
  } = input;

  const main = conditionMain.toLowerCase();
  const desc = conditionDescription.toLowerCase();

  // If core weather metrics are completely absent
  if (!main && temperatureCurrent === undefined) {
    return {
      severity: 'NORMAL',
      message: 'Weather advisory unavailable.',
    };
  }

  // 1. Severe Weather: Thunderstorm / Squall / Tornado (OpenWeather 2xx or 771/781)
  if ((conditionId >= 200 && conditionId < 300) || main.includes('thunderstorm') || desc.includes('squall') || desc.includes('tornado')) {
    return {
      severity: 'ALERT',
      message: 'Severe thunderstorm reported at destination. Exercise heightened caution and observe road safety protocols.',
    };
  }

  // 2. Freezing / Snow / Ice (OpenWeather 6xx or sub-zero with precipitation)
  if ((conditionId >= 600 && conditionId < 700) || main.includes('snow') || desc.includes('sleet') || desc.includes('blizzard') || (temperatureCurrent !== undefined && temperatureCurrent <= 0)) {
    return {
      severity: 'WARNING',
      message: 'Near-freezing temperatures or snow reported at destination. Watch for potential slick roadway surfaces.',
    };
  }

  // 3. Heavy Rain or High Precipitation Volume
  if ((precipitationMm !== null && precipitationMm !== undefined && precipitationMm >= 5) || desc.includes('heavy') || desc.includes('extreme') || desc.includes('torrential')) {
    return {
      severity: 'WARNING',
      message: 'Heavy rainfall reported at destination. Reduced traction and wet roadways expected; increase safe braking distance.',
    };
  }

  // 4. Low Visibility (< 2 km)
  if (visibilityKm !== null && visibilityKm !== undefined && visibilityKm < 2) {
    return {
      severity: 'WARNING',
      message: 'Reduced visibility (<2 km) due to fog, mist, or haze at destination. Reduce speed and utilize low-beam headlights.',
    };
  }

  // 5. Moderate Rain / Drizzle (OpenWeather 3xx or 5xx)
  if ((conditionId >= 300 && conditionId < 600) || main.includes('rain') || main.includes('drizzle')) {
    return {
      severity: 'ADVISORY',
      message: 'Active precipitation reported at destination. Maintain windshield visibility and keep headlights active.',
    };
  }

  // 6. High Winds (> 50 km/h)
  if (windSpeedKmh !== undefined && windSpeedKmh >= 50) {
    return {
      severity: 'ADVISORY',
      message: 'High crosswinds (>50 km/h) reported near destination. Exercise steering caution, especially for high-profile vehicles.',
    };
  }

  // 7. Extreme Ambient Heat (> 42°C)
  if (temperatureCurrent !== undefined && temperatureCurrent >= 42) {
    return {
      severity: 'ADVISORY',
      message: 'Extreme ambient heat (>42°C) at destination. Monitor vehicle coolant temperatures and tire pressure.',
    };
  }

  // 8. Normal / Favorable Conditions
  return {
    severity: 'NORMAL',
    message: 'Favorable travel conditions reported at destination. Transit corridors appear clear.',
  };
}
