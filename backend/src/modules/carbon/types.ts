export type FuelType = 'DIESEL' | 'PETROL' | 'CNG' | 'ELECTRIC' | 'UNKNOWN';

export type CalculationMethod = 'ACTUAL_FUEL' | 'ESTIMATED_DISTANCE' | 'UNAVAILABLE_DATA';

export type AnomalySeverity = 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface EmissionFactors {
  diesel: number;  // kg CO2 per liter (default 2.68)
  petrol: number;  // kg CO2 per liter (default 2.31)
  cng: number;     // kg CO2 per kg (default 1.82)
}

export interface TripCarbonRecord {
  tripID: string;
  vehicleID: string;
  vehicleName: string;
  vehicleType: string;
  driverID: string | null;
  driverName?: string;
  source: string;
  destination: string;
  distanceKm: number;
  fuelConsumedLiters: number | null;
  fuelType: FuelType;
  co2EmissionsKg: number;
  emissionsPerKm: number | null;
  method: CalculationMethod;
  isEstimated: boolean;
  date: string;
  status: string;
}

export interface VehicleCarbonSummary {
  vehicleID: string;
  registrationNumber: string;
  name: string;
  type: string;
  fuelType: FuelType;
  totalTrips: number;
  completedTrips: number;
  totalDistanceKm: number;
  totalFuelBurnedLiters: number;
  totalCo2Kg: number;
  totalCo2Tonnes: number;
  actualCo2Kg: number;
  estimatedCo2Kg: number;
  avgEmissionsPerKm: number | null; // kg CO2 / km
  baselineEmissionsPerKm: number | null;
  efficiencyRating: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'POOR';
  rank: number;
  anomaliesCount: number;
}

export interface DriverCarbonSummary {
  driverID: string;
  name: string;
  tripsCount: number;
  totalDistanceKm: number;
  totalCo2Kg: number;
  avgEmissionsPerKm: number | null;
  ecoScore: number; // 0 - 100
}

export interface FuelTypeBreakdown {
  fuelType: FuelType;
  totalFuelLiters: number;
  totalCo2Kg: number;
  percentageOfTotal: number;
}

export interface CarbonTimeSeriesPoint {
  date: string; // YYYY-MM-DD or Month label
  co2Kg: number;
  actualCo2Kg: number;
  estimatedCo2Kg: number;
  distanceKm: number;
}

export interface CarbonAnomaly {
  id: string;
  type: 'EXCESSIVE_EMISSIONS_PER_KM' | 'EFFICIENCY_DEGRADATION' | 'IDLING_OR_CONGESTION_PENALTY' | 'FLEET_EMISSION_SPIKE';
  severity: AnomalySeverity;
  vehicleID: string;
  vehicleName: string;
  tripID?: string;
  metricObserved: string;
  baselineExpected: string;
  deviationPercent: number;
  evidenceReason: string;
  operationalImpact: string;
  date: string;
  navigationTarget?: {
    screen: string;
    id: string;
  };
}

export interface CarbonAdvisorRecommendation {
  id: string;
  title: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  category: 'VEHICLE_MAINTENANCE' | 'ROUTE_OPTIMIZATION' | 'DRIVER_BEHAVIOR' | 'FLEET_ALLOCATION' | 'SPEED_AND_IDLING';
  area: string;
  evidence: string;
  operationalImpact: string;
  actionableStep: string;
  estimatedCo2SavingsKg: number | null;
  estimatedCostSavingsINR: number | null;
  confidence: ConfidenceLevel;
  assumptions: string;
  navigationTarget?: {
    screen: string;
    id?: string;
  };
}

export interface SustainabilityTarget {
  id: string;
  organization_id: string;
  period: string; // e.g. '2026-10' or '2026-Q4'
  targetCo2Kg: number;
  alertThresholdPercent: number; // e.g. 80%
  emissionsToDateKg: number;
  remainingAllowanceKg: number;
  percentageConsumed: number;
  projectedPeriodEndKg: number;
  status: 'ON_TRACK' | 'AT_RISK' | 'EXCEEDED';
  isThresholdCrossed: boolean;
  isBudgetExceeded: boolean;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EcoRouteCandidate {
  id: string;
  label: string;
  distanceMeters: number;
  distanceKm: number;
  durationSeconds: number;
  trafficDelaySeconds: number;
  estimatedFuelLiters: number;
  estimatedCo2Kg: number;
  estimatedFuelCostINR: number;
  encodedPolyline?: string;
  isGreenest: boolean;
  co2DifferenceKgVsPrimary?: number;
  costDifferenceINRVsPrimary?: number;
  timeDifferenceMinutesVsPrimary?: number;
}

export interface EcoRouteComparisonResult {
  tripID?: string;
  vehicleID?: string;
  vehicleType: string;
  fuelType: FuelType;
  primaryRouteId: string;
  recommendedEcoRouteId: string;
  routes: EcoRouteCandidate[];
  summary: {
    potentialCo2SavingsKg: number;
    potentialFuelSavingsLiters: number;
    potentialCostSavingsINR: number;
    timeTradeoffMinutes: number;
  };
  tradeoffExplanation: string;
  assumptions: string;
  source: 'gemini' | 'deterministic_fallback';
}

export interface CarbonOverviewResponse {
  reportingPeriod: {
    startDate: string;
    endDate: string;
    periodDays: number;
    periodLabel: string;
  };
  kpis: {
    totalCo2Kg: number;
    totalCo2Tonnes: number;
    actualCo2Kg: number;
    estimatedCo2Kg: number;
    actualDataPercentage: number;
    emissionsPerKm: number; // kg CO2 / km
    totalDistanceKm: number;
    totalFuelLiters: number;
    totalFuelCostINR: number;
    periodOverPeriodDeltaCo2Kg: number;
    periodOverPeriodDeltaPercent: number;
    potentialSavingsKg: number;
    realizedSavingsKg: number;
    dataConfidenceScore: number; // 0 - 100
    confidenceRating: ConfidenceLevel;
  };
  breakdowns: {
    fuelTypes: FuelTypeBreakdown[];
    topEmittingVehicles: VehicleCarbonSummary[];
    topEmittingTrips: TripCarbonRecord[];
  };
  timeSeries: CarbonTimeSeriesPoint[];
  targetStatus: SustainabilityTarget | null;
  anomaliesSummary: {
    totalAnomalies: number;
    highSeverityCount: number;
    recentAnomalies: CarbonAnomaly[];
  };
  advisorAdvisory: {
    source: 'gemini' | 'deterministic_fallback';
    recommendations: CarbonAdvisorRecommendation[];
    executiveSummary: string;
  };
  methodologyNotes: string[];
}

export interface SustainabilityReportData {
  reportId: string;
  organizationId: string;
  generatedAt: string;
  period: string;
  title: string;
  executiveSummary: string;
  overview: CarbonOverviewResponse;
  vehicleRankings: VehicleCarbonSummary[];
  anomalies: CarbonAnomaly[];
  recommendations: CarbonAdvisorRecommendation[];
  targetProgress: SustainabilityTarget | null;
  dataQualityLimitations: string[];
  disclaimer: string;
}
