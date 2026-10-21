import { env } from '../../config/env';
import {
  EmissionFactors,
  FuelType,
  CalculationMethod,
  TripCarbonRecord,
  ConfidenceLevel,
} from './types';

/**
 * ==============================================================================
 * LogiSphere AI Carbon Calculation Engine
 * 
 * METHODOLOGY & ASSUMPTIONS:
 * 1. Combustion Emission Factors:
 *    - Diesel: 2.68 kg CO2 / liter (based on UK DEFRA / GHG Protocol direct combustion standards)
 *    - Petrol: 2.31 kg CO2 / liter
 *    - CNG: 1.82 kg CO2 / kg
 *    *Note: These are direct tailpipe (Tank-to-Wheel) combustion factors, not full lifecycle
 *     (Well-to-Wheel) factors, adhering to corporate fleet operational reporting standards.
 * 
 * 2. Nominal Default Consumption Rates (liters / 100 km):
 *    - TRUCK: 25.0 L/100 km (~4.0 km/L)
 *    - VAN: 11.0 L/100 km (~9.1 km/L)
 *    - MINI: 7.5 L/100 km (~13.3 km/L)
 * 
 * 3. Distance Estimation Fallback:
 *    Estimated fuel (liters) = Distance (km) * Consumption (liters / 100 km) / 100
 *    Estimated CO2 (kg) = Estimated fuel (liters) * Fuel factor
 * 
 * 4. Data Quality & Distinction:
 *    Never silently substitutes estimated data for actual. All records tag calculation
 *    method as ACTUAL_FUEL or ESTIMATED_DISTANCE.
 * ==============================================================================
 */

export const DEFAULT_EMISSION_FACTORS: EmissionFactors = {
  diesel: Number(process.env.CARBON_FACTOR_DIESEL) || 2.68,
  petrol: Number(process.env.CARBON_FACTOR_PETROL) || 2.31,
  cng: Number(process.env.CARBON_FACTOR_CNG) || 1.82,
};

export const DEFAULT_CONSUMPTION_L_PER_100KM: Record<string, number> = {
  TRUCK: 25.0,
  VAN: 11.0,
  MINI: 7.5,
};

export const REGIONAL_FUEL_PRICE_INR: Record<FuelType, number> = {
  DIESEL: 92.5,
  PETROL: 101.5,
  CNG: 78.0,
  ELECTRIC: 9.0, // per kWh
  UNKNOWN: 92.5,
};

/**
 * Normalizes fuel type string to FuelType enum.
 */
export function normalizeFuelType(rawType?: string, vehicleCategory?: string): FuelType {
  const f = String(rawType || '').toUpperCase().trim();
  if (f.includes('DIESEL')) return 'DIESEL';
  if (f.includes('PETROL') || f.includes('GASOLINE')) return 'PETROL';
  if (f.includes('CNG')) return 'CNG';
  if (f.includes('ELEC')) return 'ELECTRIC';

  // Infer default from vehicle category if fuel type not explicitly given
  const cat = String(vehicleCategory || '').toUpperCase().trim();
  if (cat.includes('TRUCK')) return 'DIESEL';
  if (cat.includes('VAN')) return 'DIESEL';
  if (cat.includes('MINI')) return 'PETROL';

  return 'DIESEL'; // Fleet standard default
}

/**
 * Returns combustion CO2 emission factor for a given fuel type.
 */
export function getEmissionFactor(fuelType: FuelType, customFactors?: Partial<EmissionFactors>): number {
  const factors = { ...DEFAULT_EMISSION_FACTORS, ...customFactors };
  switch (fuelType) {
    case 'DIESEL':
      return factors.diesel;
    case 'PETROL':
      return factors.petrol;
    case 'CNG':
      return factors.cng;
    case 'ELECTRIC':
      return 0.72; // Average grid intensity kg CO2/kWh for commercial charging
    default:
      return factors.diesel;
  }
}

/**
 * Returns consumption rate in Liters / 100 km for vehicle type.
 */
export function getBaselineConsumptionRate(vehicleType?: string): number {
  const t = String(vehicleType || '').toUpperCase().trim();
  if (t.includes('TRUCK')) return DEFAULT_CONSUMPTION_L_PER_100KM.TRUCK;
  if (t.includes('MINI')) return DEFAULT_CONSUMPTION_L_PER_100KM.MINI;
  return DEFAULT_CONSUMPTION_L_PER_100KM.VAN;
}

/**
 * Fuel-based calculation:
 * CO2 emissions (kg) = Fuel consumed (litres) * Fuel factor (kg CO2/litre)
 */
export function calculateFuelBasedEmissions(
  fuelConsumedLiters: number,
  fuelType: FuelType = 'DIESEL',
  customFactors?: Partial<EmissionFactors>
): number {
  if (fuelConsumedLiters <= 0 || !isFinite(fuelConsumedLiters)) {
    return 0;
  }
  const factor = getEmissionFactor(fuelType, customFactors);
  const co2 = fuelConsumedLiters * factor;
  return Number(co2.toFixed(3));
}

/**
 * Distance-based estimation:
 * Estimated fuel (litres) = Distance (km) * Consumption (litres/100 km) / 100
 * CO2 emissions (kg) = Estimated fuel (litres) * Fuel factor
 */
export function calculateDistanceBasedEmissions(
  distanceKm: number,
  consumptionLitersPer100Km: number,
  fuelType: FuelType = 'DIESEL',
  customFactors?: Partial<EmissionFactors>
): { co2Kg: number; estimatedFuelLiters: number } {
  if (distanceKm <= 0 || consumptionLitersPer100Km <= 0 || !isFinite(distanceKm) || !isFinite(consumptionLitersPer100Km)) {
    return { co2Kg: 0, estimatedFuelLiters: 0 };
  }

  const estimatedFuelLiters = (distanceKm * consumptionLitersPer100Km) / 100;
  const factor = getEmissionFactor(fuelType, customFactors);
  const co2Kg = estimatedFuelLiters * factor;

  return {
    co2Kg: Number(co2Kg.toFixed(3)),
    estimatedFuelLiters: Number(estimatedFuelLiters.toFixed(3)),
  };
}

/**
 * Computes authoritative emissions for a single trip record.
 */
export function computeTripEmissions(
  trip: any,
  vehicle?: any,
  empiricalConsumptionL100Km?: number,
  customFactors?: Partial<EmissionFactors>
): TripCarbonRecord {
  const tripID = String(trip.tripID || trip.tripid || trip.id || 'TRP-UNKNOWN');
  const vehicleID = String(trip.vehicleID || trip.vehicleid || vehicle?.vehicleID || vehicle?.vehicleid || 'UNKNOWN');
  const vehicleName = vehicle?.name || vehicle?.registrationNumber || vehicleID;
  const vehicleType = String(vehicle?.type || trip.vehicleType || 'VAN').toUpperCase();
  const driverID = trip.driverID || trip.driverid || null;
  const driverName = trip.driverName || undefined;
  const source = String(trip.source || 'Origin');
  const destination = String(trip.destination || 'Destination');
  const status = String(trip.status || '').toUpperCase();
  const date = trip.createdAt ? new Date(trip.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

  const fuelType = normalizeFuelType(vehicle?.fuelType || trip.fuelType, vehicleType);
  const consumptionRate = empiricalConsumptionL100Km && empiricalConsumptionL100Km > 0
    ? empiricalConsumptionL100Km
    : getBaselineConsumptionRate(vehicleType);

  // Determine actual distance
  let distanceKm = 0;
  if (trip.finalOdometer && trip.startingOdometer && Number(trip.finalOdometer) > Number(trip.startingOdometer)) {
    distanceKm = Number(trip.finalOdometer) - Number(trip.startingOdometer);
  } else if (trip.plannedDistance && Number(trip.plannedDistance) > 0) {
    distanceKm = Number(trip.plannedDistance);
  }

  // Handle actual fuel consumed
  const rawFuelConsumed = Number(trip.fuelConsumed ?? trip.fuelconsumed ?? 0);
  const hasActualFuel = rawFuelConsumed > 0 && isFinite(rawFuelConsumed);

  let co2EmissionsKg = 0;
  let method: CalculationMethod = 'UNAVAILABLE_DATA';
  let isEstimated = true;
  let fuelConsumedLiters: number | null = null;

  if (hasActualFuel) {
    fuelConsumedLiters = rawFuelConsumed;
    co2EmissionsKg = calculateFuelBasedEmissions(rawFuelConsumed, fuelType, customFactors);
    method = 'ACTUAL_FUEL';
    isEstimated = false;
  } else if (distanceKm > 0) {
    const estimated = calculateDistanceBasedEmissions(distanceKm, consumptionRate, fuelType, customFactors);
    fuelConsumedLiters = estimated.estimatedFuelLiters;
    co2EmissionsKg = estimated.co2Kg;
    method = 'ESTIMATED_DISTANCE';
    isEstimated = true;
  } else {
    method = 'UNAVAILABLE_DATA';
    isEstimated = true;
  }

  const emissionsPerKm = distanceKm > 0 && co2EmissionsKg > 0
    ? Number((co2EmissionsKg / distanceKm).toFixed(4))
    : null;

  return {
    tripID,
    vehicleID,
    vehicleName,
    vehicleType,
    driverID,
    driverName,
    source,
    destination,
    distanceKm: Number(distanceKm.toFixed(1)),
    fuelConsumedLiters: fuelConsumedLiters !== null ? Number(fuelConsumedLiters.toFixed(2)) : null,
    fuelType,
    co2EmissionsKg,
    emissionsPerKm,
    method,
    isEstimated,
    date,
    status,
  };
}

/**
 * Calculates empirical historical consumption (Liters / 100 km) for a vehicle from completed trips.
 */
export function calculateEmpiricalVehicleConsumption(vehicleTrips: any[]): number | null {
  const validTrips = vehicleTrips.filter((t) => {
    const s = String(t.status || '').toUpperCase();
    if (s === 'CANCELLED' || s === 'DRAFT') return false;
    const fuel = Number(t.fuelConsumed ?? t.fuelconsumed ?? 0);
    let dist = 0;
    if (t.finalOdometer && t.startingOdometer && Number(t.finalOdometer) > Number(t.startingOdometer)) {
      dist = Number(t.finalOdometer) - Number(t.startingOdometer);
    } else if (t.plannedDistance && Number(t.plannedDistance) > 0) {
      dist = Number(t.plannedDistance);
    }
    return fuel > 0 && dist >= 5; // Require at least 5 km to avoid noisy fractions
  });

  if (validTrips.length < 2) {
    return null; // Insufficient sample size for reliable empirical baseline
  }

  let totalFuel = 0;
  let totalDist = 0;
  for (const t of validTrips) {
    const fuel = Number(t.fuelConsumed ?? t.fuelconsumed ?? 0);
    let dist = 0;
    if (t.finalOdometer && t.startingOdometer) {
      dist = Number(t.finalOdometer) - Number(t.startingOdometer);
    } else {
      dist = Number(t.plannedDistance);
    }
    totalFuel += fuel;
    totalDist += dist;
  }

  if (totalDist <= 0) return null;
  const lPer100Km = (totalFuel / totalDist) * 100;
  return Number(lPer100Km.toFixed(2));
}

/**
 * Converts kg CO2 to metric tonnes (1 tonne = 1,000 kg).
 */
export function kgToTonnes(kg: number): number {
  if (kg <= 0 || !isFinite(kg)) return 0;
  return Number((kg / 1000).toFixed(3));
}

/**
 * Calculates period-over-period percentage delta and absolute delta.
 */
export function calculatePeriodDelta(currentCo2Kg: number, previousCo2Kg: number): {
  deltaKg: number;
  deltaPercent: number;
} {
  const deltaKg = Number((currentCo2Kg - previousCo2Kg).toFixed(2));
  if (previousCo2Kg <= 0) {
    return {
      deltaKg,
      deltaPercent: currentCo2Kg > 0 ? 100 : 0,
    };
  }
  const deltaPercent = Number((((currentCo2Kg - previousCo2Kg) / previousCo2Kg) * 100).toFixed(1));
  return { deltaKg, deltaPercent };
}

/**
 * Determines data confidence score (0 - 100) and rating based on data completeness.
 */
export function evaluateDataConfidence(
  totalTrips: number,
  actualFuelTripsCount: number,
  totalDistanceKm: number
): { score: number; rating: ConfidenceLevel } {
  if (totalTrips === 0 || totalDistanceKm === 0) {
    return { score: 0, rating: 'LOW' };
  }

  const actualRatio = actualFuelTripsCount / totalTrips;
  let score = Math.round(actualRatio * 70); // Up to 70 points from actual fuel readings

  if (totalTrips >= 5) score += 15;
  else score += totalTrips * 3;

  if (totalDistanceKm >= 100) score += 15;
  else score += Math.round((totalDistanceKm / 100) * 15);

  score = Math.min(100, Math.max(0, score));

  let rating: ConfidenceLevel = 'LOW';
  if (score >= 75) rating = 'HIGH';
  else if (score >= 45) rating = 'MEDIUM';

  return { score, rating };
}
