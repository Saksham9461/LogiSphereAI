// ==============================================================================
// LogiSphere AI — Executive Dashboard & Analytics Service
// Backed by GET /api/dashboard/summary and GET /api/analytics
// ==============================================================================

import { apiClient } from './apiClient';
import type { Trip } from '../types';

export interface ManagerDashboardSummary {
  isDriver?: false;
  activeVehicles: number;
  availableVehicles: number;
  vehiclesInMaintenance: number;
  activeTrips: number;
  previousTrips: number;
  driversOnDuty: number;
  fleetUtilization: number;
  statusBreakdown: Array<{
    label: string;
    value: number;
  }>;
  recentTrips: Trip[];
}

export interface DriverDashboardSummary {
  isDriver: true;
  activeTrips: number;
  previousTrips: number;
  tripsCompleted: number;
  safetyScore: number;
  status: string;
  recentTrips: Trip[];
}

export type DashboardSummary = ManagerDashboardSummary | DriverDashboardSummary;

export interface FleetAnalyticsData {
  totalDistance: number;
  totalTrips: number;
  completedTrips: number;
  fuelCost: number;
  maintCost: number;
  otherExpense: number;
  totalExpense: number;
  costPerKm: number;
  costliestVehicles: Array<{
    vehicleID: string;
    name?: string;
    totalCost: number;
    distance: number;
    costPerKm: number;
  }>;
}

export const dashboardService = {
  /**
   * Fetch role-aware operational dashboard summary
   * GET /api/dashboard/summary
   */
  async getSummary(): Promise<DashboardSummary> {
    const res = await apiClient.get<DashboardSummary>('/api/dashboard/summary');
    return res.data;
  },

  /**
   * Fetch financial & operational fleet analytics
   * GET /api/analytics
   */
  async getAnalytics(): Promise<FleetAnalyticsData> {
    const res = await apiClient.get<FleetAnalyticsData>('/api/analytics');
    return res.data;
  },
};
