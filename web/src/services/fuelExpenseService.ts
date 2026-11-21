// ==============================================================================
// LogiSphere AI — Fuel & Expense Accounting Service
// Connects to /api/fuel, /api/expenses, and PDF export endpoints
// ==============================================================================

import { apiClient, getApiBaseUrl } from './apiClient';
import type { FuelLog, ExpenseRecord } from '../types';

export const fuelExpenseService = {
  // Fuel Logs
  async getFuelLogs(): Promise<FuelLog[]> {
    const response = await apiClient.get('/api/fuel');
    const data = response.data;
    const rawList = Array.isArray(data)
      ? data
      : Array.isArray(data?.serviceResult)
      ? data.serviceResult
      : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.fuelLogs)
      ? data.fuelLogs
      : [];

    return rawList.map((f: any) => ({
      id: String(f.id || f.fuelLogId || Math.random()),
      fuelLogId: String(f.fuelLogId || f.id || ''),
      vehicleID: String(f.vehicleID || f.vehicleid || ''),
      vehicle: String(f.vehicle || f.vehicleName || f.vehicleID || 'Vehicle'),
      date: f.date ? String(f.date).slice(0, 10) : new Date().toISOString().slice(0, 10),
      liters: Number(f.liters) || 0,
      cost: Number(f.cost ?? f.fuelCost) || 0,
      odometer: f.odometer ? Number(f.odometer) : undefined,
      createdAt: f.createdAt,
    }));
  },

  async registerFuel(payload: {
    vehicleID: string;
    liters: number;
    cost: number;
    date: string;
    odometer?: number;
  }): Promise<FuelLog> {
    const response = await apiClient.post('/api/fuel/create', payload);
    const data = response.data?.serviceResult || response.data?.data || response.data;
    return {
      id: String(data?.id || Math.random()),
      vehicleID: payload.vehicleID,
      liters: payload.liters,
      cost: payload.cost,
      date: payload.date,
      odometer: payload.odometer,
    };
  },

  async createFuelLog(payload: {
    vehicleID: string;
    liters: number;
    cost: number;
    date: string;
    odometer?: number;
  }): Promise<FuelLog> {
    return this.registerFuel(payload);
  },

  // Operational Expenses
  async getExpenses(): Promise<ExpenseRecord[]> {
    const response = await apiClient.get('/api/expenses');
    const data = response.data;
    const rawList = Array.isArray(data)
      ? data
      : Array.isArray(data?.serviceResult)
      ? data.serviceResult
      : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.expenses)
      ? data.expenses
      : [];

    return rawList.map((e: any) => {
      const tollVal = Number(e.toll) || 0;
      const otherVal = Number(e.other) || 0;
      const maintVal = Number(e.maint) || 0;
      return {
        id: String(e.id || e.expenseId || Math.random()),
        expenseId: String(e.expenseId || e.id || ''),
        vehicleID: String(e.vehicleID || e.vehicleid || ''),
        tripID: String(e.tripID || e.tripid || e.trip || ''),
        vehicle: String(e.vehicle || e.vehicleName || e.vehicleID || 'Vehicle'),
        trip: String(e.trip || e.tripID || 'Trip'),
        toll: tollVal,
        other: otherVal,
        maint: maintVal,
        total: tollVal + otherVal + maintVal,
        createdAt: e.createdAt,
      };
    });
  },

  async registerExpense(payload: {
    vehicleID: string;
    tripID?: string;
    toll: number;
    other: number;
    maint: number;
  }): Promise<ExpenseRecord> {
    const response = await apiClient.post('/api/expenses/create', payload);
    const data = response.data?.serviceResult || response.data?.data || response.data;
    return {
      id: String(data?.id || Math.random()),
      vehicleID: payload.vehicleID,
      tripID: payload.tripID,
      toll: payload.toll,
      other: payload.other,
      maint: payload.maint,
      total: payload.toll + payload.other + payload.maint,
    };
  },

  async createExpense(payload: {
    vehicleID: string;
    tripID?: string;
    toll: number;
    other: number;
    maint: number;
  }): Promise<ExpenseRecord> {
    return this.registerExpense(payload);
  },

  async exportFuelPdf(): Promise<Blob> {
    const response = await apiClient.get('/api/fuel/report/export-pdf', {
      responseType: 'blob',
    });
    return response.data;
  },

  async exportExpensesPdf(): Promise<Blob> {
    const response = await apiClient.get('/api/expenses/report/export-pdf', {
      responseType: 'blob',
    });
    return response.data;
  },

  getFuelExportPdfUrl(): string {
    const baseUrl = getApiBaseUrl();
    const token = localStorage.getItem('token') || '';
    const orgId = localStorage.getItem('organizationId') || '';

    const queryParams = new URLSearchParams({
      token,
      ...(orgId ? { organizationId: orgId } : {}),
    });

    return `${baseUrl}/api/fuel/report/export-pdf?${queryParams.toString()}`;
  },
};
