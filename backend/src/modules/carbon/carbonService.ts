import { db } from '../../config/database';
import { env } from '../../config/env';
import {
  computeTripEmissions,
  calculateEmpiricalVehicleConsumption,
  kgToTonnes,
  calculatePeriodDelta,
  evaluateDataConfidence,
  getBaselineConsumptionRate,
  calculateDistanceBasedEmissions,
  getEmissionFactor,
  normalizeFuelType,
  REGIONAL_FUEL_PRICE_INR,
} from './carbonEngine';
import {
  detectTripCarbonAnomalies,
  detectVehicleEfficiencyDegradation,
  detectFleetWideAnomalies,
} from './carbonAnomalyService';
import { getCarbonAdvisorInsights } from './carbonAdvisorService';
import {
  CarbonOverviewResponse,
  VehicleCarbonSummary,
  TripCarbonRecord,
  DriverCarbonSummary,
  FuelTypeBreakdown,
  CarbonTimeSeriesPoint,
  SustainabilityTarget,
  EcoRouteComparisonResult,
  EcoRouteCandidate,
  SustainabilityReportData,
  FuelType,
} from './types';

export interface CarbonQueryOptions {
  orgId?: string;
  startDate?: string;
  endDate?: string;
  vehicleId?: string;
  driverId?: string;
}

export class CarbonService {
  /**
   * Main Carbon Intelligence Overview & Analytics
   */
  async getCarbonOverview(options: CarbonQueryOptions): Promise<CarbonOverviewResponse> {
    const orgId = options.orgId || '00000000-0000-0000-0000-000000000001';
    const orgFilter = orgId ? { organization_id: orgId } : undefined;

    // 1. Load fleet resources concurrently with tenant isolation
    const [rawVehicles, rawTrips, rawFuel, rawUsers, rawTargets] = await Promise.all([
      db.list('vehicles', orgFilter),
      db.list('trips', orgFilter),
      db.list('fuel_logs', orgFilter),
      db.list('users', orgFilter),
      db.list('sustainability_targets', orgFilter),
    ]);

    const orgVehicles = rawVehicles.filter((v: any) => {
      const vOrg = v.organization_id || v.organizationId || v.businessId;
      if (vOrg && vOrg !== orgId) return false;
      if (!vOrg && orgId !== '00000000-0000-0000-0000-000000000001') return false;
      return true;
    });

    const vehiclesMap = new Map<string, any>();
    orgVehicles.forEach((v: any) => {
      const vId = v.vehicleID || v.vehicleid || v.id;
      if (vId) vehiclesMap.set(String(vId).toLowerCase(), v);
    });

    const usersMap = new Map<string, any>();
    rawUsers.forEach((u: any) => {
      const uId = u.id || u.userID || u.driverID;
      if (uId) usersMap.set(String(uId).toLowerCase(), u);
    });

    // 2. Determine date filter boundaries (default: past 30 days)
    const now = new Date();
    const periodDays = 30;
    const defaultStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const startDate = options.startDate ? new Date(options.startDate) : defaultStart;
    const endDate = options.endDate ? new Date(options.endDate) : now;

    // Previous window for period-over-period comparison
    const windowDurationMs = endDate.getTime() - startDate.getTime();
    const prevWindowStart = new Date(startDate.getTime() - windowDurationMs);
    const prevWindowEnd = new Date(startDate.getTime());

    // 3. Filter trips by date, scope, and organization
    const filterTripInWindow = (t: any, start: Date, end: Date) => {
      const tOrg = t.organization_id || t.organizationId || t.businessId;
      if (tOrg && tOrg !== orgId) return false;
      if (!tOrg && orgId !== '00000000-0000-0000-0000-000000000001') return false;
      const tripDate = t.createdAt ? new Date(t.createdAt) : new Date();
      if (tripDate < start || tripDate > end) return false;
      if (options.vehicleId && String(t.vehicleID || t.vehicleid).toLowerCase() !== options.vehicleId.toLowerCase()) {
        return false;
      }
      if (options.driverId && String(t.driverID || t.driverid).toLowerCase() !== options.driverId.toLowerCase()) {
        return false;
      }
      return true;
    };

    const currentTrips = rawTrips.filter((t: any) => filterTripInWindow(t, startDate, endDate));
    const previousTrips = rawTrips.filter((t: any) => filterTripInWindow(t, prevWindowStart, prevWindowEnd));

    // 4. Compute empirical vehicle consumption baselines
    const vehicleEmpiricalRates = new Map<string, number>();
    for (const v of orgVehicles) {
      const vId = String(v.vehicleID || v.vehicleid || v.id).toLowerCase();
      const vTrips = rawTrips.filter((t: any) => {
        const tOrg = t.organization_id || t.organizationId || t.businessId;
        if (tOrg && tOrg !== orgId) return false;
        return String(t.vehicleID || t.vehicleid).toLowerCase() === vId;
      });
      const rate = calculateEmpiricalVehicleConsumption(vTrips);
      if (rate) vehicleEmpiricalRates.set(vId, rate);
    }

    // 5. Compute emissions for current window trips
    const calculatedTrips: TripCarbonRecord[] = currentTrips.map((t: any) => {
      const vId = String(t.vehicleID || t.vehicleid || '').toLowerCase();
      const veh = vehiclesMap.get(vId);
      const empiricalRate = vehicleEmpiricalRates.get(vId);
      const driver = t.driverID ? usersMap.get(String(t.driverID).toLowerCase()) : null;
      const tripRecord = computeTripEmissions(t, veh, empiricalRate);
      if (driver && driver.name) {
        tripRecord.driverName = driver.name;
      }
      return tripRecord;
    });

    // Compute previous window emissions for delta
    let previousTotalCo2Kg = 0;
    let previousTotalDistKm = 0;
    for (const t of previousTrips) {
      const vId = String(t.vehicleID || t.vehicleid || '').toLowerCase();
      const veh = vehiclesMap.get(vId);
      const empiricalRate = vehicleEmpiricalRates.get(vId);
      const r = computeTripEmissions(t, veh, empiricalRate);
      previousTotalCo2Kg += r.co2EmissionsKg;
      previousTotalDistKm += r.distanceKm;
    }

    // 6. Aggregate Core Fleet Metrics
    let totalCo2Kg = 0;
    let actualCo2Kg = 0;
    let estimatedCo2Kg = 0;
    let actualFuelTripsCount = 0;
    let totalDistanceKm = 0;
    let totalFuelBurnedLiters = 0;

    for (const ct of calculatedTrips) {
      totalCo2Kg += ct.co2EmissionsKg;
      totalDistanceKm += ct.distanceKm;
      if (ct.method === 'ACTUAL_FUEL') {
        actualCo2Kg += ct.co2EmissionsKg;
        actualFuelTripsCount += 1;
      } else {
        estimatedCo2Kg += ct.co2EmissionsKg;
      }
      if (ct.fuelConsumedLiters) {
        totalFuelBurnedLiters += ct.fuelConsumedLiters;
      }
    }

    totalCo2Kg = Number(totalCo2Kg.toFixed(2));
    actualCo2Kg = Number(actualCo2Kg.toFixed(2));
    estimatedCo2Kg = Number(estimatedCo2Kg.toFixed(2));
    totalDistanceKm = Number(totalDistanceKm.toFixed(1));
    totalFuelBurnedLiters = Number(totalFuelBurnedLiters.toFixed(1));

    const totalCo2Tonnes = kgToTonnes(totalCo2Kg);
    const emissionsPerKm = totalDistanceKm > 0 ? Number((totalCo2Kg / totalDistanceKm).toFixed(3)) : 0;
    const actualDataPercentage = calculatedTrips.length > 0 ? Math.round((actualFuelTripsCount / calculatedTrips.length) * 100) : 0;
    const periodDelta = calculatePeriodDelta(totalCo2Kg, previousTotalCo2Kg);

    // Fuel cost aggregation from logs in window or estimated burn
    const currentFuelLogs = rawFuel.filter((f: any) => {
      const fDate = f.date ? new Date(f.date) : (f.createdAt ? new Date(f.createdAt) : new Date());
      return fDate >= startDate && fDate <= endDate;
    });
    const loggedFuelCost = currentFuelLogs.reduce((acc: number, f: any) => acc + Number(f.cost ?? 0), 0);
    const estimatedBurnCost = Math.round(totalFuelBurnedLiters * REGIONAL_FUEL_PRICE_INR.DIESEL);
    const totalFuelCostINR = loggedFuelCost > 0 ? loggedFuelCost : estimatedBurnCost;

    const { score: confidenceScore, rating: confidenceRating } = evaluateDataConfidence(
      calculatedTrips.length,
      actualFuelTripsCount,
      totalDistanceKm
    );

    // 7. Vehicle-Level Summaries & Rankings
    const vehicleMapSummaries = new Map<string, VehicleCarbonSummary>();
    for (const v of orgVehicles) {
      const vId = String(v.vehicleID || v.vehicleid || v.id);
      const vKey = vId.toLowerCase();
      const vTrips = calculatedTrips.filter((t) => t.vehicleID.toLowerCase() === vKey);
      const vCompletedTrips = vTrips.filter((t) => t.status === 'COMPLETED' || t.status === 'DELIVERED').length;

      let vDist = 0;
      let vCo2 = 0;
      let vActualCo2 = 0;
      let vEstCo2 = 0;
      let vFuel = 0;

      for (const vt of vTrips) {
        vDist += vt.distanceKm;
        vCo2 += vt.co2EmissionsKg;
        vFuel += vt.fuelConsumedLiters || 0;
        if (vt.method === 'ACTUAL_FUEL') vActualCo2 += vt.co2EmissionsKg;
        else vEstCo2 += vt.co2EmissionsKg;
      }

      const avgRate = vDist > 0 ? Number((vCo2 / vDist).toFixed(3)) : null;
      const vType = String(v.type || 'VAN').toUpperCase();
      const nominalRate = (getBaselineConsumptionRate(vType) / 100) * getEmissionFactor('DIESEL');
      const baselineRate = vehicleEmpiricalRates.get(vKey)
        ? Number(((vehicleEmpiricalRates.get(vKey)! / 100) * getEmissionFactor('DIESEL')).toFixed(3))
        : Number(nominalRate.toFixed(3));

      let rating: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'POOR' = 'GOOD';
      if (avgRate && baselineRate) {
        if (avgRate <= baselineRate * 0.90) rating = 'EXCELLENT';
        else if (avgRate <= baselineRate * 1.08) rating = 'GOOD';
        else if (avgRate <= baselineRate * 1.25) rating = 'AVERAGE';
        else rating = 'POOR';
      }

      vehicleMapSummaries.set(vKey, {
        vehicleID: vId,
        registrationNumber: v.registrationNumber || vId,
        name: v.name || v.registrationNumber || vId,
        type: vType,
        fuelType: normalizeFuelType(v.fuelType, vType),
        totalTrips: vTrips.length,
        completedTrips: vCompletedTrips,
        totalDistanceKm: Number(vDist.toFixed(1)),
        totalFuelBurnedLiters: Number(vFuel.toFixed(1)),
        totalCo2Kg: Number(vCo2.toFixed(2)),
        totalCo2Tonnes: kgToTonnes(vCo2),
        actualCo2Kg: Number(vActualCo2.toFixed(2)),
        estimatedCo2Kg: Number(vEstCo2.toFixed(2)),
        avgEmissionsPerKm: avgRate,
        baselineEmissionsPerKm: baselineRate,
        efficiencyRating: rating,
        rank: 1,
        anomaliesCount: 0,
      });
    }

    const sortedVehicles = Array.from(vehicleMapSummaries.values())
      .filter((v) => v.totalTrips > 0 || v.totalDistanceKm > 0)
      .sort((a, b) => b.totalCo2Kg - a.totalCo2Kg)
      .map((v, idx) => ({ ...v, rank: idx + 1 }));

    // 8. Fuel Type Breakdown
    const fuelTypeTotals: Record<FuelType, { fuel: number; co2: number }> = {
      DIESEL: { fuel: 0, co2: 0 },
      PETROL: { fuel: 0, co2: 0 },
      CNG: { fuel: 0, co2: 0 },
      ELECTRIC: { fuel: 0, co2: 0 },
      UNKNOWN: { fuel: 0, co2: 0 },
    };

    for (const ct of calculatedTrips) {
      const ft = ct.fuelType;
      fuelTypeTotals[ft].co2 += ct.co2EmissionsKg;
      fuelTypeTotals[ft].fuel += ct.fuelConsumedLiters || 0;
    }

    const fuelTypeBreakdowns: FuelTypeBreakdown[] = Object.entries(fuelTypeTotals)
      .filter(([_, data]) => data.co2 > 0 || data.fuel > 0)
      .map(([type, data]) => ({
        fuelType: type as FuelType,
        totalFuelLiters: Number(data.fuel.toFixed(1)),
        totalCo2Kg: Number(data.co2.toFixed(2)),
        percentageOfTotal: totalCo2Kg > 0 ? Math.round((data.co2 / totalCo2Kg) * 100) : 0,
      }));

    // 9. Time Series Aggregation (Daily points)
    const timeSeriesMap = new Map<string, { co2: number; actual: number; est: number; dist: number }>();
    for (const ct of calculatedTrips) {
      const d = ct.date;
      const cur = timeSeriesMap.get(d) || { co2: 0, actual: 0, est: 0, dist: 0 };
      cur.co2 += ct.co2EmissionsKg;
      cur.dist += ct.distanceKm;
      if (ct.method === 'ACTUAL_FUEL') cur.actual += ct.co2EmissionsKg;
      else cur.est += ct.co2EmissionsKg;
      timeSeriesMap.set(d, cur);
    }

    const timeSeries: CarbonTimeSeriesPoint[] = Array.from(timeSeriesMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        co2Kg: Number(data.co2.toFixed(2)),
        actualCo2Kg: Number(data.actual.toFixed(2)),
        estimatedCo2Kg: Number(data.est.toFixed(2)),
        distanceKm: Number(data.dist.toFixed(1)),
      }));

    // 10. Anomaly Detection
    const baselineMap = new Map<string, number>();
    sortedVehicles.forEach((v) => {
      if (v.baselineEmissionsPerKm) baselineMap.set(v.vehicleID, v.baselineEmissionsPerKm);
    });

    const tripAnomalies = detectTripCarbonAnomalies(calculatedTrips, baselineMap);
    const vehicleAnomalies = detectVehicleEfficiencyDegradation(sortedVehicles);
    const fleetAnomalies = detectFleetWideAnomalies(
      { co2Kg: totalCo2Kg, distanceKm: totalDistanceKm },
      { co2Kg: previousTotalCo2Kg, distanceKm: previousTotalDistKm }
    );
    const allAnomalies = [...tripAnomalies, ...vehicleAnomalies, ...fleetAnomalies];

    // Update anomaly counts on vehicles
    for (const anom of allAnomalies) {
      const v = sortedVehicles.find((sv) => sv.vehicleID === anom.vehicleID);
      if (v) v.anomaliesCount += 1;
    }

    // 11. Sustainability Target Progress
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const targetRow = rawTargets.find((t: any) => t.period === currentMonthKey || t.period === 'MONTHLY');
    let targetStatus: SustainabilityTarget | null = null;

    if (targetRow) {
      const targetKg = Number(targetRow.target_co2_kg ?? targetRow.targetCo2Kg ?? 1000);
      const thresholdPercent = Number(targetRow.alert_threshold_percent ?? targetRow.alertThresholdPercent ?? 80);
      const remainingKg = Math.max(0, Number((targetKg - totalCo2Kg).toFixed(1)));
      const pctConsumed = Math.round((totalCo2Kg / targetKg) * 100);

      // Linear extrapolation to month end
      const dayOfMonth = now.getDate();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const projectedEndKg = dayOfMonth > 0 ? Number(((totalCo2Kg / dayOfMonth) * daysInMonth).toFixed(1)) : totalCo2Kg;

      let status: 'ON_TRACK' | 'AT_RISK' | 'EXCEEDED' = 'ON_TRACK';
      if (pctConsumed >= 100) status = 'EXCEEDED';
      else if (pctConsumed >= thresholdPercent || projectedEndKg > targetKg) status = 'AT_RISK';

      targetStatus = {
        id: targetRow.id || `target-${currentMonthKey}`,
        organization_id: orgId,
        period: targetRow.period || currentMonthKey,
        targetCo2Kg: targetKg,
        alertThresholdPercent: thresholdPercent,
        emissionsToDateKg: totalCo2Kg,
        remainingAllowanceKg: remainingKg,
        percentageConsumed: pctConsumed,
        projectedPeriodEndKg: projectedEndKg,
        status,
        isThresholdCrossed: pctConsumed >= thresholdPercent,
        isBudgetExceeded: pctConsumed >= 100,
        notes: targetRow.notes,
        createdAt: targetRow.created_at || targetRow.createdAt,
      };
    }

    // 12. Potential vs Realized Savings Estimation
    const potentialSavingsKg = Number(
      (
        sortedVehicles.filter((v) => v.efficiencyRating === 'POOR').reduce((acc, v) => acc + v.totalCo2Kg * 0.15, 0) +
        tripAnomalies.length * 8.5
      ).toFixed(1)
    );
    // Realized savings: measured when period-over-period delta is negative (reduced emissions)
    const realizedSavingsKg = periodDelta.deltaKg < 0 ? Math.abs(periodDelta.deltaKg) : 0;

    // 13. AI Carbon Advisor Insights
    const advisorInput = {
      orgId,
      totalCo2Kg,
      totalDistanceKm,
      totalFuelCostINR,
      topVehicles: sortedVehicles,
      topTrips: calculatedTrips.sort((a, b) => b.co2EmissionsKg - a.co2EmissionsKg).slice(0, 5),
      anomalies: allAnomalies,
      potentialSavingsKg,
    };
    const advisorAdvisory = await getCarbonAdvisorInsights(advisorInput);

    return {
      reportingPeriod: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        periodDays: Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))),
        periodLabel: options.startDate ? `${options.startDate} to ${options.endDate}` : 'Last 30 Days',
      },
      kpis: {
        totalCo2Kg,
        totalCo2Tonnes,
        actualCo2Kg,
        estimatedCo2Kg,
        actualDataPercentage,
        emissionsPerKm,
        totalDistanceKm,
        totalFuelLiters: totalFuelBurnedLiters,
        totalFuelCostINR,
        periodOverPeriodDeltaCo2Kg: periodDelta.deltaKg,
        periodOverPeriodDeltaPercent: periodDelta.deltaPercent,
        potentialSavingsKg,
        realizedSavingsKg,
        dataConfidenceScore: confidenceScore,
        confidenceRating,
      },
      breakdowns: {
        fuelTypes: fuelTypeBreakdowns,
        topEmittingVehicles: sortedVehicles.slice(0, 10),
        topEmittingTrips: calculatedTrips.sort((a, b) => b.co2EmissionsKg - a.co2EmissionsKg).slice(0, 10),
      },
      timeSeries,
      targetStatus,
      anomaliesSummary: {
        totalAnomalies: allAnomalies.length,
        highSeverityCount: allAnomalies.filter((a) => a.severity === 'HIGH').length,
        recentAnomalies: allAnomalies.slice(0, 10),
      },
      advisorAdvisory,
      methodologyNotes: [
        'Emission factors: Diesel 2.68 kg CO2/L, Petrol 2.31 kg CO2/L, CNG 1.82 kg CO2/kg (Direct combustion standards).',
        'Actual fuel burned takes strict precedence over distance estimations when logged.',
        'Estimations utilize vehicle empirical baseline when >=2 sample trips exist, or nominal vehicle type baselines.',
        '1 metric tonne = 1,000 kg CO2.',
      ],
    };
  }

  /**
   * Set or update Sustainability Target for an Organization
   */
  async setSustainabilityTarget(data: {
    orgId: string;
    period: string;
    targetCo2Kg: number;
    alertThresholdPercent?: number;
    notes?: string;
    userId?: string;
  }): Promise<SustainabilityTarget> {
    const existingTargets = await db.list('sustainability_targets', {
      organization_id: data.orgId,
      period: data.period,
    });

    const targetPayload = {
      organization_id: data.orgId,
      period: data.period,
      target_co2_kg: Number(data.targetCo2Kg),
      targetCo2Kg: Number(data.targetCo2Kg),
      alert_threshold_percent: Number(data.alertThresholdPercent ?? 80),
      alertThresholdPercent: Number(data.alertThresholdPercent ?? 80),
      notes: data.notes || '',
      created_by: data.userId || null,
      updated_at: new Date().toISOString(),
    };

    let savedRow: any;
    if (existingTargets.length > 0) {
      const existingId = existingTargets[0].id;
      savedRow = await db.update('sustainability_targets', { id: existingId }, targetPayload);
    } else {
      savedRow = await db.insert('sustainability_targets', {
        id: `target-${Date.now()}`,
        ...targetPayload,
      });
    }

    // Recalculate dynamic target progress
    const overview = await this.getCarbonOverview({ orgId: data.orgId });
    return overview.targetStatus || {
      id: savedRow.id,
      organization_id: data.orgId,
      period: data.period,
      targetCo2Kg: data.targetCo2Kg,
      alertThresholdPercent: data.alertThresholdPercent ?? 80,
      emissionsToDateKg: overview.kpis.totalCo2Kg,
      remainingAllowanceKg: Math.max(0, data.targetCo2Kg - overview.kpis.totalCo2Kg),
      percentageConsumed: Math.round((overview.kpis.totalCo2Kg / data.targetCo2Kg) * 100),
      projectedPeriodEndKg: overview.kpis.totalCo2Kg,
      status: overview.kpis.totalCo2Kg >= data.targetCo2Kg ? 'EXCEEDED' : 'ON_TRACK',
      isThresholdCrossed: (overview.kpis.totalCo2Kg / data.targetCo2Kg) * 100 >= (data.alertThresholdPercent ?? 80),
      isBudgetExceeded: overview.kpis.totalCo2Kg >= data.targetCo2Kg,
    };
  }

  /**
   * Eco-Route Comparison Engine
   */
  async compareEcoRoutes(input: {
    tripID?: string;
    vehicleID?: string;
    vehicleType?: string;
    candidateRoutes: Array<{
      id: string;
      label: string;
      distanceMeters: number;
      durationSeconds: number;
      trafficDelaySeconds?: number;
      encodedPolyline?: string;
    }>;
  }): Promise<EcoRouteComparisonResult> {
    const vType = String(input.vehicleType || 'VAN').toUpperCase();
    const fuelType: FuelType = normalizeFuelType(undefined, vType);
    const consumptionRate = getBaselineConsumptionRate(vType); // L / 100km
    const fuelPrice = REGIONAL_FUEL_PRICE_INR[fuelType] || 92.5;

    if (!input.candidateRoutes || input.candidateRoutes.length === 0) {
      throw new Error('Candidate routes are required for eco-route comparison');
    }

    // Evaluate each route's fuel, emissions, and cost
    const evaluatedRoutes: EcoRouteCandidate[] = input.candidateRoutes.map((r, idx) => {
      const distanceKm = Number((r.distanceMeters / 1000).toFixed(1));
      const trafficDelaySec = r.trafficDelaySeconds || 0;

      // Fuel consumption includes steady travel plus an empirical traffic idling penalty
      // (approx 1.5 L/hr of additional fuel burned during severe stop-and-go delays)
      const baseFuelLiters = (distanceKm * consumptionRate) / 100;
      const idlingPenaltyLiters = (trafficDelaySec / 3600) * 1.5;
      const estimatedFuelLiters = Number((baseFuelLiters + idlingPenaltyLiters).toFixed(2));

      const estimatedCo2Kg = Number((estimatedFuelLiters * getEmissionFactor(fuelType)).toFixed(2));
      const estimatedFuelCostINR = Math.round(estimatedFuelLiters * fuelPrice);

      return {
        id: r.id || `route_${idx + 1}`,
        label: r.label || `Route ${idx + 1}`,
        distanceMeters: r.distanceMeters,
        distanceKm,
        durationSeconds: r.durationSeconds,
        trafficDelaySeconds: trafficDelaySec,
        estimatedFuelLiters,
        estimatedCo2Kg,
        estimatedFuelCostINR,
        encodedPolyline: r.encodedPolyline,
        isGreenest: false,
      };
    });

    // Determine the greenest route (lowest estimated CO2 kg)
    const sortedByEmissions = [...evaluatedRoutes].sort((a, b) => a.estimatedCo2Kg - b.estimatedCo2Kg);
    const greenestRoute = sortedByEmissions[0];
    greenestRoute.isGreenest = true;

    // Primary route is route 1 or first candidate
    const primaryRoute = evaluatedRoutes[0];
    for (const r of evaluatedRoutes) {
      r.co2DifferenceKgVsPrimary = Number((r.estimatedCo2Kg - primaryRoute.estimatedCo2Kg).toFixed(2));
      r.costDifferenceINRVsPrimary = r.estimatedFuelCostINR - primaryRoute.estimatedFuelCostINR;
      r.timeDifferenceMinutesVsPrimary = Math.round((r.durationSeconds - primaryRoute.durationSeconds) / 60);
    }

    const co2Savings = Math.max(0, Number((primaryRoute.estimatedCo2Kg - greenestRoute.estimatedCo2Kg).toFixed(2)));
    const fuelSavings = Math.max(0, Number((primaryRoute.estimatedFuelLiters - greenestRoute.estimatedFuelLiters).toFixed(2)));
    const costSavings = Math.max(0, primaryRoute.estimatedFuelCostINR - greenestRoute.estimatedFuelCostINR);
    const timeDiffMinutes = Math.round((greenestRoute.durationSeconds - primaryRoute.durationSeconds) / 60);

    const isPrimaryAlreadyGreenest = primaryRoute.id === greenestRoute.id;
    let tradeoffExplanation = '';
    if (isPrimaryAlreadyGreenest) {
      tradeoffExplanation = `The primary route is already the most fuel-efficient option, generating ${primaryRoute.estimatedCo2Kg} kg CO2 with optimal traffic flow.`;
    } else {
      tradeoffExplanation = `Choosing "${greenestRoute.label}" avoids ${co2Savings} kg CO2 and saves ₹${costSavings} in fuel. ${
        timeDiffMinutes > 0
          ? `It requires approximately ${timeDiffMinutes} additional minutes of travel time due to a longer bypass path.`
          : `It is also faster or equal in travel time due to lower traffic delays.`
      }`;
    }

    return {
      tripID: input.tripID,
      vehicleID: input.vehicleID,
      vehicleType: vType,
      fuelType,
      primaryRouteId: primaryRoute.id,
      recommendedEcoRouteId: greenestRoute.id,
      routes: evaluatedRoutes,
      summary: {
        potentialCo2SavingsKg: co2Savings,
        potentialFuelSavingsLiters: fuelSavings,
        potentialCostSavingsINR: costSavings,
        timeTradeoffMinutes: timeDiffMinutes,
      },
      tradeoffExplanation,
      assumptions: `Based on ${fuelType} emission factor of ${getEmissionFactor(fuelType)} kg CO2/L and ${vType} baseline consumption of ${consumptionRate} L/100km, plus traffic delay idling adjustments.`,
      source: 'deterministic_fallback',
    };
  }

  /**
   * Generates a formal, structured Sustainability Report for export
   */
  async generateSustainabilityReport(options: CarbonQueryOptions): Promise<SustainabilityReportData> {
    const overview = await this.getCarbonOverview(options);
    const orgId = options.orgId || '00000000-0000-0000-0000-000000000001';
    const reportId = `rep-co2-${Date.now()}`;

    return {
      reportId,
      organizationId: orgId,
      generatedAt: new Date().toISOString(),
      period: overview.reportingPeriod.periodLabel,
      title: `LogiSphere AI — Fleet Carbon Intelligence & Sustainability Report`,
      executiveSummary: overview.advisorAdvisory.executiveSummary,
      overview,
      vehicleRankings: overview.breakdowns.topEmittingVehicles,
      anomalies: overview.anomaliesSummary.recentAnomalies,
      recommendations: overview.advisorAdvisory.recommendations,
      targetProgress: overview.targetStatus,
      dataQualityLimitations: [
        `${overview.kpis.actualDataPercentage}% of trip emissions were computed from verified actual fuel readings; ${100 - overview.kpis.actualDataPercentage}% utilized distance-based model estimations.`,
        'Calculations reflect direct Tank-to-Wheel operational combustion emissions.',
        'Tire degradation, mechanical idling, and driver speed variations are derived from telemetry and refueling clustering.',
      ],
      disclaimer: 'This operational sustainability report is compiled for internal fleet management optimization and fuel conservation. It does not constitute a certified third-party GHG audit without statutory verification.',
    };
  }
}

export const carbonService = new CarbonService();
