import { db } from '../../config/database';
import { env } from '../../config/env';
import { executeResilientAi } from '../ai/orchestrator';
import { callGemini } from '../ai/geminiClient';

// --- CONFIGURABLE REFERENCE VALUES (Benchmarking, Not Verified Facts) ---
export const NOMINAL_TANK_CAPACITIES_LITERS: Record<string, number> = {
  MINI: 45,
  VAN: 65,
  TRUCK: 250,
};

export const REGIONAL_FUEL_PRICE_REFERENCE = {
  minPricePerLiter: 85.0,
  maxPricePerLiter: 110.0,
  currency: 'INR',
};

export type AnomalySeverity = 'NORMAL' | 'LOW' | 'MODERATE' | 'HIGH';
export type FuelDataStatus = 'ADEQUATE' | 'INSUFFICIENT_DATA';

export interface FuelAnomalyItem {
  id: string;
  vehicleID: string;
  vehicleName: string;
  vehicleType: string;
  anomalyType: 'CONSUMPTION_DEVIATION' | 'TANK_CAPACITY_OVERFLOW' | 'PRICING_DEVIATION' | 'REFUEL_CLUSTERING';
  severity: AnomalySeverity;
  metricObserved: string;
  baselineExpected: string;
  deviationPercent?: number;
  evidenceReason: string;
  date: string;
}

export interface VehicleFuelProfile {
  vehicleID: string;
  vehicleName: string;
  vehicleType: string;
  registrationNumber: string;
  status: FuelDataStatus;
  sampleCount: number;
  baselineKmPerL: number | null;
  observedRecentKmPerL: number | null;
  totalFuelPurchasedLiters: number;
  totalFuelExpenseINR: number;
  avgCostPerLiter: number | null;
  anomalies: FuelAnomalyItem[];
  highestSeverity: AnomalySeverity;
}

export interface FleetFuelAnomalyReport {
  timestamp: string;
  evaluationTimestamp?: string;
  fleetSummary: {
    totalVehicles: number;
    vehiclesWithAdequateData: number;
    vehiclesWithInsufficientData: number;
    highRiskVehiclesCount: number;
    moderateRiskVehiclesCount: number;
    normalVehiclesCount: number;
    fleetAverageKmPerL: number | null;
    totalAnomaliesDetected: number;
  };
  summary?: any;
  vehicles: VehicleFuelProfile[];
  reports?: any[];
  anomalies: FuelAnomalyItem[];
  aiAdvisory: {
    source: 'gemini' | 'deterministic_fallback';
    executiveSummary: string;
    actionableChecks: string[];
    riskObservation: string;
  };
}

/**
 * Standardize vehicle type to uppercase category
 */
function normalizeVehicleType(rawType?: string): string {
  const t = String(rawType || '').toUpperCase().trim();
  if (t.includes('TRUCK')) return 'TRUCK';
  if (t.includes('MINI')) return 'MINI';
  return 'VAN';
}

/**
 * Validates and extracts completed trip distance and fuel consumed
 */
interface ValidTripConsumption {
  tripID: string;
  vehicleID: string;
  actualDistanceKm: number;
  isEstimatedDistance: boolean;
  fuelConsumedLiters: number;
  kmPerL: number;
  date: string;
}

function extractValidTripConsumption(trips: any[]): ValidTripConsumption[] {
  const results: ValidTripConsumption[] = [];

  for (const t of trips) {
    const vId = t.vehicleID || t.vehicleid;
    if (!vId) continue;

    const status = String(t.status || '').toUpperCase();
    // Only completed/delivered trips have terminal odometer and fuel consumed
    if (!['DELIVERED', 'COMPLETED'].includes(status)) {
      continue;
    }

    const startingOdo = Number(t.startingOdometer ?? t.startingodometer ?? 0);
    const finalOdo =
      t.finalOdometer !== null && t.finalOdometer !== undefined
        ? Number(t.finalOdometer)
        : t.finalodometer !== null && t.finalodometer !== undefined
        ? Number(t.finalodometer)
        : null;

    const fuelConsumed =
      t.fuelConsumed !== null && t.fuelConsumed !== undefined
        ? Number(t.fuelConsumed)
        : t.fuelconsumed !== null && t.fuelconsumed !== undefined
        ? Number(t.fuelconsumed)
        : null;

    const plannedDist = Number(t.plannedDistance ?? t.planneddistance ?? 0);

    // Fuel consumed must be positive and non-zero
    if (fuelConsumed === null || isNaN(fuelConsumed) || fuelConsumed <= 0) {
      continue;
    }

    let actualDistance = 0;
    let isEstimated = false;

    if (finalOdo !== null && !isNaN(finalOdo) && finalOdo > startingOdo) {
      actualDistance = finalOdo - startingOdo;
    } else if (plannedDist > 0) {
      actualDistance = plannedDist;
      isEstimated = true;
    } else {
      continue;
    }

    // Sanity check: Discard physically absurd values (e.g. 100,000 km or < 1 km)
    if (actualDistance <= 0 || actualDistance > 5000) {
      continue;
    }

    const kmPerL = actualDistance / fuelConsumed;
    // Discard physically impossible efficiency outliers (e.g. < 0.5 km/L or > 45 km/L)
    if (kmPerL < 0.5 || kmPerL > 45.0) {
      continue;
    }

    results.push({
      tripID: t.tripID || t.tripid || t.id,
      vehicleID: vId,
      actualDistanceKm: Number(actualDistance.toFixed(1)),
      isEstimatedDistance: isEstimated,
      fuelConsumedLiters: Number(fuelConsumed.toFixed(1)),
      kmPerL: Number(kmPerL.toFixed(2)),
      date: (t.updatedAt || t.updatedat || t.createdAt || t.createdat || new Date().toISOString()).slice(0, 10),
    });
  }

  return results;
}

/**
 * Calculates deterministic Fuel Anomaly & Efficiency Intelligence report.
 */
export async function calculateFuelAnomalies(): Promise<FleetFuelAnomalyReport> {
  const [vehicles, trips, fuelLogs] = await Promise.all([
    db.list('vehicles'),
    db.list('trips'),
    db.list('fuel_logs'),
  ]);

  const validTrips = extractValidTripConsumption(trips);

  const vehicleProfiles: VehicleFuelProfile[] = [];
  const allAnomalies: FuelAnomalyItem[] = [];

  for (const v of vehicles) {
    const vId = v.vehicleID || v.vehicleid || v.id;
    const vName = v.name || v.registrationNumber || vId;
    const vType = normalizeVehicleType(v.type);
    const regNo = v.registrationNumber || v.registrationnumber || 'UNKNOWN';

    // 1. Vehicle-specific fuel logs
    const vFuel = (fuelLogs || []).filter(
      (f: any) => String(f.vehicleID || f.vehicleid || '').toLowerCase() === String(vId).toLowerCase()
    );

    // 2. Vehicle-specific trip consumptions
    const vTrips = validTrips.filter(
      (t) => String(t.vehicleID).toLowerCase() === String(vId).toLowerCase()
    );

    // Calculations
    const totalLiters = vFuel.reduce((sum: number, f: any) => sum + Number(f.liters ?? 0), 0);
    const totalExpense = vFuel.reduce((sum: number, f: any) => sum + Number(f.cost ?? f.fuelCost ?? 0), 0);
    const avgCostPerL = totalLiters > 0 ? Number((totalExpense / totalLiters).toFixed(2)) : null;

    const vAnomalies: FuelAnomalyItem[] = [];

    // Check A: Physical Tank Capacity Bounds
    const nominalCapacity = NOMINAL_TANK_CAPACITIES_LITERS[vType] || 65;
    const tankToleranceLimit = nominalCapacity * 1.15; // +15% expansion headroom

    for (const f of vFuel) {
      const liters = Number(f.liters ?? 0);
      const fDate = String(f.date || '').slice(0, 10);
      const logId = f.fuelLogId || f.fuellogid || f.id;

      if (liters > tankToleranceLimit) {
        const excessPercent = Math.round(((liters - nominalCapacity) / nominalCapacity) * 100);
        vAnomalies.push({
          id: `anom-tank-${logId}`,
          vehicleID: vId,
          vehicleName: vName,
          vehicleType: vType,
          anomalyType: 'TANK_CAPACITY_OVERFLOW',
          severity: excessPercent > 40 ? 'HIGH' : 'MODERATE',
          metricObserved: `${liters.toFixed(1)} L`,
          baselineExpected: `Max ${nominalCapacity} L (${vType})`,
          deviationPercent: excessPercent,
          evidenceReason: `Logged refueling volume (${liters}L) exceeds reference tank capacity (${nominalCapacity}L) by ${excessPercent}%. Verify billing meter accuracy.`,
          date: fDate,
        });
      }

      // Check B: Unit Price Discrepancy
      const cost = Number(f.cost ?? f.fuelCost ?? 0);
      if (liters > 0 && cost > 0) {
        const ratePerL = cost / liters;
        if (ratePerL > REGIONAL_FUEL_PRICE_REFERENCE.maxPricePerLiter * 1.3) {
          const markupPercent = Math.round(
            ((ratePerL - REGIONAL_FUEL_PRICE_REFERENCE.maxPricePerLiter) /
              REGIONAL_FUEL_PRICE_REFERENCE.maxPricePerLiter) *
              100
          );
          vAnomalies.push({
            id: `anom-price-${logId}`,
            vehicleID: vId,
            vehicleName: vName,
            vehicleType: vType,
            anomalyType: 'PRICING_DEVIATION',
            severity: markupPercent > 40 ? 'HIGH' : 'MODERATE',
            metricObserved: `₹${ratePerL.toFixed(1)}/L`,
            baselineExpected: `₹${REGIONAL_FUEL_PRICE_REFERENCE.minPricePerLiter} - ₹${REGIONAL_FUEL_PRICE_REFERENCE.maxPricePerLiter}/L`,
            deviationPercent: markupPercent,
            evidenceReason: `Unit price (₹${ratePerL.toFixed(1)}/L) is ${markupPercent}% higher than expected reference range. Check for premium fuel or invoice discrepancy.`,
            date: fDate,
          });
        }
      }
    }

    // Check C: Refueling Clustering (Multiple refuels in same 24 hours)
    const dateCounts: Record<string, number> = {};
    for (const f of vFuel) {
      const d = String(f.date || '').slice(0, 10);
      if (d) dateCounts[d] = (dateCounts[d] || 0) + 1;
    }
    for (const [dateStr, count] of Object.entries(dateCounts)) {
      if (count >= 2) {
        vAnomalies.push({
          id: `anom-cluster-${vId}-${dateStr}`,
          vehicleID: vId,
          vehicleName: vName,
          vehicleType: vType,
          anomalyType: 'REFUEL_CLUSTERING',
          severity: count >= 3 ? 'HIGH' : 'LOW',
          metricObserved: `${count} refuels on ${dateStr}`,
          baselineExpected: 'Max 1 refuel / day',
          evidenceReason: `Vehicle recorded ${count} separate refueling transactions on ${dateStr}. Confirm if operating consecutive double-shifts.`,
          date: dateStr,
        });
      }
    }

    // Check D: Statistical Consumption Efficiency (km/L)
    const tripSampleCount = vTrips.length;
    let baselineKmPerL: number | null = null;
    let recentKmPerL: number | null = null;
    let status: FuelDataStatus = 'INSUFFICIENT_DATA';

    // Requirement: Must have at least 3 valid consumption trips to establish baseline
    if (tripSampleCount >= 3) {
      status = 'ADEQUATE';
      // Sort chronologically
      vTrips.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const sumKmPerL = vTrips.reduce((acc, t) => acc + t.kmPerL, 0);
      baselineKmPerL = Number((sumKmPerL / tripSampleCount).toFixed(2));

      // Recent trip consumption (latest trip)
      const latestTrip = vTrips[vTrips.length - 1];
      recentKmPerL = latestTrip.kmPerL;

      // Check all trips for significant efficiency drops below baseline (>30% drop)
      for (const trip of vTrips) {
        if (trip.kmPerL < baselineKmPerL * 0.7) {
          const dropPercent = Math.round(((baselineKmPerL - trip.kmPerL) / baselineKmPerL) * 100);
          const estNote = trip.isEstimatedDistance ? ' (based on planned route distance)' : '';
          vAnomalies.push({
            id: `anom-eff-${trip.tripID}`,
            vehicleID: vId,
            vehicleName: vName,
            vehicleType: vType,
            anomalyType: 'CONSUMPTION_DEVIATION',
            severity: dropPercent > 45 ? 'HIGH' : 'MODERATE',
            metricObserved: `${trip.kmPerL.toFixed(1)} km/L`,
            baselineExpected: `${baselineKmPerL.toFixed(1)} km/L baseline`,
            deviationPercent: dropPercent,
            evidenceReason: `Fuel economy on trip ${trip.tripID} dropped by ${dropPercent}% below vehicle baseline${estNote}. Factors: high idling, cargo overload, or mechanical resistance.`,
            date: trip.date,
          });
        }
      }
    }

    // Highest severity for vehicle
    const severities = vAnomalies.map((a) => a.severity);
    let highestSeverity: AnomalySeverity = 'NORMAL';
    if (severities.includes('HIGH')) highestSeverity = 'HIGH';
    else if (severities.includes('MODERATE')) highestSeverity = 'MODERATE';
    else if (severities.includes('LOW')) highestSeverity = 'LOW';

    vehicleProfiles.push({
      vehicleID: vId,
      vehicleName: vName,
      vehicleType: vType,
      registrationNumber: regNo,
      status,
      sampleCount: tripSampleCount,
      baselineKmPerL,
      observedRecentKmPerL: recentKmPerL,
      totalFuelPurchasedLiters: Number(totalLiters.toFixed(1)),
      totalFuelExpenseINR: Math.round(totalExpense),
      avgCostPerLiter: avgCostPerL,
      anomalies: vAnomalies,
      highestSeverity,
    });

    allAnomalies.push(...vAnomalies);
  }

  // Fleet-wide calculations
  const vehiclesWithAdequate = vehicleProfiles.filter((v) => v.status === 'ADEQUATE');
  const validBaselines = vehiclesWithAdequate
    .map((v) => v.baselineKmPerL)
    .filter((b): b is number => b !== null && b > 0);

  const fleetAvgKmPerL =
    validBaselines.length > 0
      ? Number((validBaselines.reduce((a, b) => a + b, 0) / validBaselines.length).toFixed(2))
      : null;

  const highCount = vehicleProfiles.filter((v) => v.highestSeverity === 'HIGH').length;
  const modCount = vehicleProfiles.filter((v) => v.highestSeverity === 'MODERATE').length;
  const normalCount = vehicleProfiles.filter(
    (v) => v.highestSeverity === 'NORMAL' || v.highestSeverity === 'LOW'
  ).length;

  const fleetSummary = {
    totalVehicles: vehicleProfiles.length,
    vehiclesWithAdequateData: vehiclesWithAdequate.length,
    vehiclesWithInsufficientData: vehicleProfiles.length - vehiclesWithAdequate.length,
    highRiskVehiclesCount: highCount,
    moderateRiskVehiclesCount: modCount,
    normalVehiclesCount: normalCount,
    fleetAverageKmPerL: fleetAvgKmPerL,
    totalAnomaliesDetected: allAnomalies.length,
  };

  // --- DETERMINISTIC FALLBACK FOR AI ADVISORY ---
  const fallbackAdvisory = {
    source: 'deterministic_fallback' as const,
    executiveSummary:
      allAnomalies.length > 0
        ? `Identified ${allAnomalies.length} operational fuel deviation(s) across ${highCount + modCount} vehicle(s). Top focus: ${allAnomalies.slice(0, 2).map((a) => `${a.vehicleName} (${a.anomalyType.replace(/_/g, ' ')})`).join(', ')}.`
        : `Fleet fuel efficiency is stable across ${vehiclesWithAdequate.length} calibrated vehicles with no critical consumption or tank volume deviations.`,
    actionableChecks: [
      allAnomalies.some((a) => a.anomalyType === 'TANK_CAPACITY_OVERFLOW')
        ? 'Cross-check fuel pump volume meters against physical vehicle tank capacities.'
        : 'Verify driver pre-trip tire pressure logs to ensure minimal rolling drag.',
      allAnomalies.some((a) => a.anomalyType === 'CONSUMPTION_DEVIATION')
        ? 'Review engine diagnostic logs and idle-time telemetry for vehicles with lower burn rates.'
        : 'Maintain standard preventive fuel injector cleaning intervals.',
      'Audit bulk fuel purchase receipts against reported pump dispensing slips.',
    ],
    riskObservation:
      highCount > 0
        ? `${highCount} vehicle(s) require management review due to significant efficiency or volume deviations.`
        : 'Overall fleet fuel risk index is low.',
  };

  // --- RESILIENT GEMINI ENRICHMENT (Optional natural language explanation) ---
  const apiKey = env.GEMINI_API_KEY || env.AI_API_KEY;
  if (!apiKey || allAnomalies.length === 0) {
    return {
      timestamp: new Date().toISOString(),
      fleetSummary,
      vehicles: vehicleProfiles,
      anomalies: allAnomalies,
      aiAdvisory: fallbackAdvisory,
    };
  }

  const promptData = {
    fleetSummary,
    topAnomalies: allAnomalies.slice(0, 5).map((a) => ({
      vehicle: a.vehicleName,
      type: a.vehicleType,
      deviation: a.anomalyType,
      severity: a.severity,
      evidence: a.evidenceReason,
    })),
  };

  const systemPrompt = `
You are LogiSphere AI's Chief Fleet Fuel & Efficiency Auditor.
Analyze the supplied deterministic fuel anomaly data.
Rules:
1. Use ONLY the supplied data; do NOT fabricate fuel logs or numbers.
2. NEVER accuse drivers of theft, fraud, or siphoning; use objective technical terms like "mechanical resistance", "prolonged idling", "cargo overload", or "dispenser meter discrepancy".
3. Return STRICT JSON conforming to:
{
  "executiveSummary": "2-3 concise sentences summarizing fleet fuel anomalies.",
  "actionableChecks": ["Check 1 for fleet manager", "Check 2 for fleet manager", "Check 3 for fleet manager"],
  "riskObservation": "1 sentence summarizing operational risk."
}
`;

  const aiAdvisory = await executeResilientAi<{
    source: 'gemini' | 'deterministic_fallback';
    executiveSummary: string;
    actionableChecks: string[];
    riskObservation: string;
  }>({
    feature: 'FUEL_ANOMALY_DETECTION',
    normalizedInput: {
      highCount,
      modCount,
      anomalyCount: allAnomalies.length,
      anomaliesHash: allAnomalies.map((a) => `${a.vehicleID}:${a.anomalyType}:${a.severity}`).join('|'),
    },
    executeGemini: async () => {
      const response = await callGemini<any>({
        systemPrompt,
        userPrompt: `Fuel Data: ${JSON.stringify(promptData)}`,
        responseMimeType: 'application/json',
        temperature: 0.15,
        maxOutputTokens: 1000,
        timeoutMs: 15000,
      });

      const parsed = response.data;
      if (
        parsed &&
        typeof parsed.executiveSummary === 'string' &&
        Array.isArray(parsed.actionableChecks)
      ) {
        return {
          source: 'gemini' as const,
          executiveSummary: parsed.executiveSummary.trim(),
          actionableChecks: parsed.actionableChecks.map((c: any) => String(c).trim()).slice(0, 3),
          riskObservation: String(parsed.riskObservation || fallbackAdvisory.riskObservation).trim(),
        };
      }
      throw new Error('Malformed Gemini fuel anomaly response');
    },
    validateResponse: (res) =>
      Boolean(res && res.executiveSummary && Array.isArray(res.actionableChecks)),
    getFallback: () => fallbackAdvisory,
  });

  const nowIso = new Date().toISOString();
  return {
    timestamp: nowIso,
    evaluationTimestamp: nowIso,
    fleetSummary,
    summary: {
      totalVehiclesAnalyzed: fleetSummary.totalVehicles,
      vehiclesWithAnomalies: highCount + modCount,
      highRiskCount: highCount,
      moderateRiskCount: modCount,
      insufficientDataCount: fleetSummary.vehiclesWithInsufficientData,
      fleetAverageKmPerLiter: fleetSummary.fleetAverageKmPerL,
    },
    vehicles: vehicleProfiles,
    reports: vehicleProfiles.map((v) => ({
      vehicleId: v.vehicleID,
      vehicleName: v.vehicleName,
      registrationNumber: v.registrationNumber,
      vehicleType: v.vehicleType,
      nominalTankCapacityLiters: 50,
      dataQuality: v.status === 'ADEQUATE' ? ('SUFFICIENT' as const) : ('INSUFFICIENT_DATA' as const),
      tripsAnalyzedCount: v.sampleCount,
      fuelLogsCount: 0,
      baselineKmPerLiter: v.baselineKmPerL,
      latestTripKmPerLiter: v.observedRecentKmPerL,
      latestTripEstimatedDistance: false,
      status: (v.highestSeverity === 'HIGH'
        ? 'HIGH_ANOMALY'
        : v.highestSeverity === 'MODERATE'
        ? 'MODERATE_ANOMALY'
        : v.status === 'INSUFFICIENT_DATA'
        ? 'INSUFFICIENT_DATA'
        : 'NORMAL') as any,
      anomalies: v.anomalies.map((a) => ({
        type: a.anomalyType,
        severity: a.severity,
        metric: a.metricObserved,
        observedValue: 0,
        referenceValue: 0,
        unit: 'km/L',
        description: a.evidenceReason,
        date: a.date,
      })),
    })),
    anomalies: allAnomalies,
    aiAdvisory,
  };
}
