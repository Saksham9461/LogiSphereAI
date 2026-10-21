import { create } from 'zustand';
import axios from '../api/axiosClient';
import {
  GetCarbonOverview,
  GetCarbonVehicles,
  GetCarbonTrips,
  GetCarbonTargets,
  SetCarbonTarget,
  CompareEcoRoute,
  GetCarbonReport,
} from '../api/apiPath';

export interface VehicleCarbonItem {
  vehicleID: string;
  registrationNumber: string;
  name: string;
  type: string;
  fuelType: string;
  totalTrips: number;
  completedTrips: number;
  totalDistanceKm: number;
  totalFuelBurnedLiters: number;
  totalCo2Kg: number;
  totalCo2Tonnes: number;
  actualCo2Kg: number;
  estimatedCo2Kg: number;
  avgEmissionsPerKm: number | null;
  baselineEmissionsPerKm: number | null;
  efficiencyRating: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'POOR';
  rank: number;
  anomaliesCount: number;
}

export interface TripCarbonItem {
  tripID: string;
  vehicleID: string;
  vehicleName: string;
  vehicleType: string;
  driverName?: string;
  source: string;
  destination: string;
  distanceKm: number;
  fuelConsumedLiters: number | null;
  fuelType: string;
  co2EmissionsKg: number;
  emissionsPerKm: number | null;
  method: 'ACTUAL_FUEL' | 'ESTIMATED_DISTANCE' | 'UNAVAILABLE_DATA';
  isEstimated: boolean;
  date: string;
  status: string;
}

export interface CarbonAnomalyItem {
  id: string;
  type: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  vehicleID: string;
  vehicleName: string;
  metricObserved: string;
  baselineExpected: string;
  deviationPercent: number;
  evidenceReason: string;
  operationalImpact: string;
  date: string;
  navigationTarget?: {
    screen: string;
    id?: string;
  };
}

export interface AdvisorRecommendationItem {
  id: string;
  title: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  area: string;
  evidence: string;
  operationalImpact: string;
  actionableStep: string;
  estimatedCo2SavingsKg: number | null;
  estimatedCostSavingsINR: number | null;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  assumptions: string;
  navigationTarget?: {
    screen: string;
    id?: string;
  };
}

export interface SustainabilityTargetItem {
  id: string;
  period: string;
  targetCo2Kg: number;
  alertThresholdPercent: number;
  emissionsToDateKg: number;
  remainingAllowanceKg: number;
  percentageConsumed: number;
  projectedPeriodEndKg: number;
  status: 'ON_TRACK' | 'AT_RISK' | 'EXCEEDED';
  isThresholdCrossed: boolean;
  isBudgetExceeded: boolean;
  notes?: string;
}

export interface EcoRouteResult {
  primaryRouteId: string;
  recommendedEcoRouteId: string;
  routes: Array<{
    id: string;
    label: string;
    distanceKm: number;
    durationSeconds: number;
    estimatedFuelLiters: number;
    estimatedCo2Kg: number;
    estimatedFuelCostINR: number;
    isGreenest: boolean;
    co2DifferenceKgVsPrimary?: number;
    costDifferenceINRVsPrimary?: number;
    timeDifferenceMinutesVsPrimary?: number;
  }>;
  summary: {
    potentialCo2SavingsKg: number;
    potentialFuelSavingsLiters: number;
    potentialCostSavingsINR: number;
    timeTradeoffMinutes: number;
  };
  tradeoffExplanation: string;
  assumptions: string;
}

interface CarbonState {
  loading: boolean;
  refreshing: boolean;
  submittingTarget: boolean;
  comparingRoute: boolean;
  error: string | null;
  periodKey: '7D' | '30D' | '90D' | 'ALL';
  overview: any | null;
  kpis: any | null;
  vehicles: VehicleCarbonItem[];
  trips: TripCarbonItem[];
  anomalies: CarbonAnomalyItem[];
  recommendations: AdvisorRecommendationItem[];
  target: SustainabilityTargetItem | null;
  timeSeries: Array<{ date: string; co2Kg: number; actualCo2Kg: number; estimatedCo2Kg: number; distanceKm: number }>;
  ecoRouteComparison: EcoRouteResult | null;

  fetchCarbonOverview: (period?: '7D' | '30D' | '90D' | 'ALL') => Promise<void>;
  setPeriodKey: (period: '7D' | '30D' | '90D' | 'ALL') => void;
  saveTarget: (targetCo2Kg: number, alertThresholdPercent?: number, notes?: string) => Promise<boolean>;
  compareEcoRoute: (tripID: string, vehicleType: string, candidateRoutes: any[]) => Promise<void>;
  clearError: () => void;
}

export const useCarbonStore = create<CarbonState>((set, get) => ({
  loading: false,
  refreshing: false,
  submittingTarget: false,
  comparingRoute: false,
  error: null,
  periodKey: '30D',
  overview: null,
  kpis: null,
  vehicles: [],
  trips: [],
  anomalies: [],
  recommendations: [],
  target: null,
  timeSeries: [],
  ecoRouteComparison: null,

  setPeriodKey: (period) => {
    set({ periodKey: period });
    get().fetchCarbonOverview(period);
  },

  fetchCarbonOverview: async (period) => {
    const activePeriod = period || get().periodKey;
    try {
      set({ loading: true, error: null });

      // Compute date boundaries
      const now = new Date();
      let days = 30;
      if (activePeriod === '7D') days = 7;
      else if (activePeriod === '90D') days = 90;
      else if (activePeriod === 'ALL') days = 365;

      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = now.toISOString().split('T')[0];

      const res = await axios.get(`${GetCarbonOverview}?startDate=${startDate}&endDate=${endDate}`);
      const data = res.data?.data;

      if (data) {
        set({
          overview: data,
          kpis: data.kpis || null,
          vehicles: data.breakdowns?.topEmittingVehicles || [],
          trips: data.breakdowns?.topEmittingTrips || [],
          anomalies: data.anomaliesSummary?.recentAnomalies || [],
          recommendations: data.advisorAdvisory?.recommendations || [],
          target: data.targetStatus || null,
          timeSeries: data.timeSeries || [],
          loading: false,
          refreshing: false,
          error: null,
        });
      } else {
        set({ loading: false, refreshing: false });
      }
    } catch (err: any) {
      console.error('[CarbonStore] Fetch error:', err?.response?.data?.message || err?.message);
      set({
        loading: false,
        refreshing: false,
        error: err?.response?.data?.message || 'Failed to load carbon intelligence data',
      });
    }
  },

  saveTarget: async (targetCo2Kg: number, alertThresholdPercent = 80, notes = '') => {
    try {
      set({ submittingTarget: true });
      const now = new Date();
      const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const res = await axios.post(SetCarbonTarget, {
        period,
        targetCo2Kg: Number(targetCo2Kg),
        alertThresholdPercent: Number(alertThresholdPercent),
        notes,
      });

      if (res.data?.success && res.data?.data) {
        set({ target: res.data.data, submittingTarget: false });
        // Refresh overview to update KPI target status
        get().fetchCarbonOverview();
        return true;
      }
      set({ submittingTarget: false });
      return false;
    } catch (err: any) {
      console.error('[CarbonStore] Target save error:', err?.response?.data?.message || err?.message);
      set({
        submittingTarget: false,
        error: err?.response?.data?.message || 'Failed to save sustainability target',
      });
      return false;
    }
  },

  compareEcoRoute: async (tripID: string, vehicleType: string, candidateRoutes: any[]) => {
    try {
      set({ comparingRoute: true, error: null });
      const res = await axios.post(CompareEcoRoute, {
        tripID,
        vehicleType,
        candidateRoutes,
      });

      if (res.data?.success && res.data?.data) {
        set({ ecoRouteComparison: res.data.data, comparingRoute: false });
      } else {
        set({ comparingRoute: false });
      }
    } catch (err: any) {
      console.error('[CarbonStore] Compare route error:', err?.response?.data?.message || err?.message);
      set({
        comparingRoute: false,
        error: err?.response?.data?.message || 'Failed to compare eco-routes',
      });
    }
  },

  clearError: () => set({ error: null }),
}));

export default useCarbonStore;
