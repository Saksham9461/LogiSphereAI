// ==============================================================================
// LogiSphere AI — Geofenced Attendance & Shift Verification Service
// Connects to /api/attendance/status, /api/attendance/clock-in, /api/attendance/clock-out,
// /api/attendance/report, /api/attendance/report/export-pdf
// ==============================================================================

import { apiClient, getApiBaseUrl } from './apiClient';
import type { AttendanceStatusResponse, AttendanceRecord } from '../types';

export const attendanceService = {
  async getStatus(): Promise<AttendanceStatusResponse> {
    const response = await apiClient.get('/api/attendance/status');
    const data = response.data?.data || response.data?.serviceResult || response.data || {};

    const rawHistory = Array.isArray(data.history)
      ? data.history
      : Array.isArray(data.records)
      ? data.records
      : [];

    const history: AttendanceRecord[] = rawHistory.map((r: any) => ({
      id: String(r.id || Math.random()),
      userId: r.userId || r.user_id,
      date: r.date ? String(r.date).slice(0, 10) : new Date().toISOString().slice(0, 10),
      clockInTime: r.clockInTime || r.clock_in_time || '08:00 AM',
      clockOutTime: r.clockOutTime || r.clock_out_time || null,
      locationName: r.locationName || r.location_name || 'Depot A Main Perimeter',
      distanceFromOffice: Number(r.distanceFromOffice ?? r.distance_from_office ?? 14),
      status: r.status || (r.clockOutTime ? 'COMPLETED' : 'CLOCKED_IN'),
      latitude: r.latitude ? Number(r.latitude) : undefined,
      longitude: r.longitude ? Number(r.longitude) : undefined,
    }));

    return {
      clockedIn: Boolean(data.clockedIn || data.isClockedIn || data.status === 'CLOCKED_IN'),
      activeRecord: data.activeRecord || data.activeShift || null,
      geofence: data.geofence || {
        latitude: 23.0225,
        longitude: 72.5714,
        geofenceRadius: 500,
        organizationName: 'LogiSphere Fleet Headquarters',
      },
      history,
    };
  },

  async clockIn(payload: {
    latitude: number;
    longitude: number;
    locationName?: string;
    distanceFromOffice?: number;
  }): Promise<any> {
    const response = await apiClient.post('/api/attendance/clock-in', payload);
    return response.data?.data || response.data?.serviceResult || response.data;
  },

  async clockOut(payload: {
    latitude: number;
    longitude: number;
  }): Promise<any> {
    const response = await apiClient.post('/api/attendance/clock-out', payload);
    return response.data?.data || response.data?.serviceResult || response.data;
  },

  async getAttendanceReport(filters?: {
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<AttendanceRecord[]> {
    const response = await apiClient.get('/api/attendance/report', {
      params: filters,
    });
    const data = response.data?.data || response.data?.serviceResult || response.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.records)) return data.records;
    if (Array.isArray(data?.history)) return data.history;
    return [];
  },

  async exportReportPdf(filters?: Record<string, any>): Promise<Blob> {
    const response = await apiClient.get('/api/attendance/report/export-pdf', {
      params: filters,
      responseType: 'blob',
    });
    return response.data;
  },

  getExportPdfUrl(filters?: Record<string, any>): string {
    const baseUrl = getApiBaseUrl();
    const token = localStorage.getItem('token') || '';
    const orgId = localStorage.getItem('organizationId') || '';

    const queryParams = new URLSearchParams({
      token,
      ...(orgId ? { organizationId: orgId } : {}),
      ...(filters || {}),
    });

    return `${baseUrl}/api/attendance/report/export-pdf?${queryParams.toString()}`;
  },
};
