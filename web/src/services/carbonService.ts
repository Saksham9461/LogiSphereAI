// ==============================================================================
// LogiSphere AI — Carbon Intelligence & Sustainability Service
// Backed strictly by existing backend endpoints mounted at /api/carbon
// ==============================================================================

import { apiClient } from './apiClient';

export interface CarbonKPIs {
  totalCo2Kg: number;
  totalDistanceKm: number;
  emissionsPerKm: number;
  fleetEfficiencyRating: string;
  totalFuelLiters: number;
  avgFuelEconomyKmpl: number;
  periodLabel: string;
}

export interface VehicleEmissionsRank {
  vehicleId: string;
  name: string;
  registrationNumber: string;
  type: string;
  totalCo2Kg: number;
  totalDistanceKm: number;
  co2PerKm: number;
  fuelConsumedLiters: number;
  efficiencyRating: 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'POOR';
}

export interface CarbonAdvisorAdvisory {
  summary: string;
  potentialReductionKg: number;
  potentialCostSavings: number;
  actionItems: Array<{
    title: string;
    impact: 'HIGH' | 'MEDIUM' | 'LOW';
    description: string;
    targetVehicle?: string;
  }>;
}

export interface CarbonOverviewData {
  kpis: CarbonKPIs;
  breakdowns: {
    topEmittingVehicles: VehicleEmissionsRank[];
    topEmittingTrips: any[];
  };
  targetStatus: {
    targetCo2Kg: number;
    currentCo2Kg: number;
    percentUsed: number;
    status: 'ON_TRACK' | 'AT_RISK' | 'EXCEEDED';
    period: string;
  };
  advisorAdvisory: CarbonAdvisorAdvisory;
  anomaliesSummary: {
    totalAnomalies: number;
    recentAnomalies: any[];
  };
}

export const carbonService = {
  /**
   * Fetch complete Carbon Intelligence Overview
   * GET /api/carbon/overview
   */
  async getCarbonOverview(params?: {
    startDate?: string;
    endDate?: string;
    vehicleId?: string;
    driverId?: string;
  }): Promise<CarbonOverviewData> {
    const res = await apiClient.get<{ success: boolean; data: CarbonOverviewData }>('/api/carbon/overview', {
      params,
    });
    return res.data.data;
  },

  /**
   * Fetch vehicle carbon emissions ranking
   * GET /api/carbon/vehicles
   */
  async getVehicleEmissions(): Promise<VehicleEmissionsRank[]> {
    const res = await apiClient.get<{ success: boolean; data: VehicleEmissionsRank[] }>('/api/carbon/vehicles');
    return res.data.data;
  },

  /**
   * Set or update monthly sustainability targets
   * POST /api/carbon/targets
   */
  async setSustainabilityTarget(data: {
    targetCo2Kg: number;
    period?: string;
    alertThresholdPercent?: number;
    notes?: string;
  }): Promise<any> {
    const res = await apiClient.post('/api/carbon/targets', data);
    return res.data;
  },
};

