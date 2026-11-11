// ==============================================================================
// LogiSphere AI — Fleet & Driver Management Services
// Connects to /api/vehicle and /api/user endpoints
// ==============================================================================

import { apiClient } from './apiClient';
import type { Vehicle, Driver } from '../types';

export const fleetService = {
  // Vehicle Operations
  async getVehicles(): Promise<Vehicle[]> {
    const response = await apiClient.get('/api/vehicle');
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.serviceResult)) return data.serviceResult;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.vehicles)) return data.vehicles;
    return [];
  },

  async registerVehicle(payload: {
    name: string;
    registrationNumber: string;
    type: string;
    maxLoadCapacity: number;
    odometer?: number;
    acquisitionCost?: number;
    status?: string;
  }): Promise<Vehicle> {
    const response = await apiClient.post('/api/vehicle/create', payload);
    const data = response.data;
    return data?.serviceResult || data?.data || data?.vehicle || data;
  },

  async updateVehicle(id: string, payload: Partial<Vehicle>): Promise<Vehicle> {
    const response = await apiClient.put('/api/vehicle/update', payload, {
      params: { id },
    });
    const data = response.data;
    return data?.serviceResult || data?.data || data?.vehicle || data;
  },

  async deleteVehicle(id: string, confirm: boolean = true): Promise<void> {
    await apiClient.delete('/api/vehicle/delete', {
      params: { id, confirm },
    });
  },

  // Driver Operations
  async getDrivers(): Promise<Driver[]> {
    const response = await apiClient.get('/api/user', {
      params: { role: 'ROLE_DRIVER' },
    });
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.serviceResult)) return data.serviceResult;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.drivers)) return data.drivers;
    if (Array.isArray(data?.users)) return data.users;
    return [];
  },

  async registerDriver(payload: {
    name: string;
    email: string;
    phoneNo?: string;
    licenseNumber?: string;
    licenseExpiry?: string;
    assignedVehicleId?: string;
    driverScore?: number;
    status?: string;
  }): Promise<{ driver: Driver; credentials?: { email: string; temporaryPassword: string }; temporaryPassword?: string }> {
    const response = await apiClient.post('/api/user/create', {
      ...payload,
      role: 'ROLE_DRIVER',
    });
    const data = response.data;
    const driver = data?.serviceResult || data?.data || data?.user || data?.driver || data;
    const credentials = data?.credentials || data?.serviceResult?.credentials || (data?.temporaryPassword ? { email: payload.email, temporaryPassword: data.temporaryPassword } : undefined);
    return { driver, credentials, temporaryPassword: credentials?.temporaryPassword };
  },

  async updateDriver(id: string, payload: Partial<Driver>): Promise<Driver> {
    const response = await apiClient.put('/api/user/update', payload, {
      params: { id },
    });
    const data = response.data;
    return data?.serviceResult || data?.data || data?.user || data?.driver || data;
  },

  async deleteDriver(id: string, confirm: boolean = true): Promise<void> {
    await apiClient.delete('/api/user/delete', {
      params: { id, confirm },
    });
  },
};
