// ==============================================================================
// LogiSphere AI — Vehicle Maintenance & Health Service
// Connects to /api/maintenance, /api/maintenance/create, /api/maintenance/:id/complete,
// /api/analytics/maintenance-forecast
// ==============================================================================

import { apiClient } from './apiClient';
import type { MaintenanceRecord } from '../types';

export interface MaintenanceForecastItem {
  vehicleID: string;
  name?: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  projectedCost: number;
  recommendedAction?: string;
  predictedServiceDate?: string;
}

export const maintenanceService = {
  async getMaintenance(): Promise<MaintenanceRecord[]> {
    const response = await apiClient.get('/api/maintenance');
    const data = response.data;
    const rawList = Array.isArray(data)
      ? data
      : Array.isArray(data?.serviceResult)
      ? data.serviceResult
      : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.maintenanceRecords)
      ? data.maintenanceRecords
      : [];

    return rawList.map((r: any) => {
      const rawStatus = String(r.status || 'COMPLETED').toUpperCase();
      const status = rawStatus === 'ACTIVE' || rawStatus === 'IN SHOP' ? 'Active' : 'Completed';
      return {
        id: String(r.id || r.maintenanceID || Math.random()),
        maintenanceID: String(r.maintenanceID || r.id || ''),
        vehicleID: String(r.vehicleID || r.vehicleid || ''),
        vehicle: String(r.vehicle || r.vehicleName || r.vehicleID || 'Vehicle'),
        serviceType: String(r.serviceType || r.service || 'Scheduled Inspection'),
        cost: Number(r.cost) || 0,
        date: r.date ? String(r.date).slice(0, 10) : new Date().toISOString().slice(0, 10),
        status,
        rawStatus,
      };
    });
  },

  async createMaintenance(payload: {
    vehicleID: string;
    serviceType: string;
    cost: number;
    date: string;
    status?: 'ACTIVE' | 'COMPLETED' | string;
  }): Promise<MaintenanceRecord> {
    const response = await apiClient.post('/api/maintenance/create', {
      status: payload.status || 'ACTIVE',
      ...payload,
    });
    const data = response.data?.serviceResult || response.data?.data || response.data;
    return {
      id: String(data?.id || data?.maintenanceID || Math.random()),
      vehicleID: String(data?.vehicleID || payload.vehicleID),
      vehicle: String(data?.vehicle || payload.vehicleID),
      serviceType: String(data?.serviceType || payload.serviceType),
      cost: Number(data?.cost ?? payload.cost),
      date: String(data?.date || payload.date).slice(0, 10),
      status: (payload.status === 'ACTIVE' || !payload.status) ? 'Active' : 'Completed',
    };
  },

  async scheduleService(payload: {
    vehicleID: string;
    serviceType: string;
    cost: number;
    date: string;
    status?: 'ACTIVE' | 'COMPLETED' | string;
  }): Promise<MaintenanceRecord> {
    return this.createMaintenance(payload);
  },

  async completeMaintenance(id: string): Promise<any> {
    const cleanId = encodeURIComponent(String(id || '').trim().replace(/^#/, ''));
    const response = await apiClient.post(`/api/maintenance/${cleanId}/complete`);
    return response.data;
  },

  async completeService(id: string): Promise<any> {
    return this.completeMaintenance(id);
  },

  async getMaintenanceForecast(): Promise<MaintenanceForecastItem[]> {
    const response = await apiClient.get('/api/analytics/maintenance-forecast');
    const data = response.data?.data || response.data?.serviceResult || response.data?.forecast || response.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.forecast)) return data.forecast;
    if (Array.isArray(data?.vehicles)) return data.vehicles;
    return [];
  },
};
