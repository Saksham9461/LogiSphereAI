import { create } from 'zustand';
import { Linking, Alert, Platform } from 'react-native';
import axios from '../api/axiosClient';
import { GetAttendanceStatus, ClockIn, ClockOut, GetAttendanceReport, ExportAttendancePdf } from '../api/apiPath';
import useAuthStore from './AuthStore';

export type AttendanceStatus = 'NOT_CLOCKED_IN' | 'CHECKING_LOCATION' | 'CLOCKED_IN' | 'OUTSIDE_GEOFENCE' | 'LOCATION_UNAVAILABLE';

export interface AttendanceRecord {
  id: string;
  userId?: string;
  date: string;
  clockInTime: string;
  clockOutTime: string | null;
  locationName: string;
  distanceFromOffice: number;
  status: string;
  latitude?: number;
  longitude?: number;
  autoClockOut?: boolean;
  clockOutType?: 'MANUAL' | 'AUTOMATIC' | null;
}

export interface AttendanceSessionReportItem {
  id: string;
  sessionNumber: number;
  clockInTime: string;
  clockOutTime: string | null;
  durationMinutes: number;
  duration: string;
  clockOutType: 'MANUAL' | 'AUTOMATIC' | 'IN_PROGRESS';
  autoClockOut: boolean;
  locationName: string;
  distanceFromOffice: number;
  status: string;
}

export interface GroupedAttendanceReportItem {
  id: string;
  userId: string;
  staffName: string;
  staffEmail: string;
  staffRole: string;
  date: string;
  dateKey: string;
  totalWorkedMinutes: number;
  totalWorkedDuration: string;
  sessionsCount: number;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'AUTO_CLOSED';
  hasAutoClockOut: boolean;
  sessions: AttendanceSessionReportItem[];
}

export interface AttendanceReportMetrics {
  totalStaff: number;
  totalDays: number;
  totalSessions: number;
  totalWorkedMinutes: number;
  totalWorkedHours: string;
  totalAutoClosed: number;
}

export interface AttendanceReportFilter {
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

interface AttendanceState {
  status: AttendanceStatus;
  clockInTime: string | null;
  latitude: number | null;
  longitude: number | null;
  distanceFromOffice: number | null;
  history: AttendanceRecord[];
  loading: boolean;
  error: string | null;

  // Report State
  reportItems: GroupedAttendanceReportItem[];
  reportMetrics: AttendanceReportMetrics | null;
  reportTotal: number;
  reportPage: number;
  reportTotalPages: number;
  reportLoading: boolean;
  reportExporting: boolean;
  reportError: string | null;
  expandedRowIds: Record<string, boolean>;
  isManager: boolean;
  userRole: string;
  reportFilters: AttendanceReportFilter;

  // Core Actions
  setStatus: (status: AttendanceStatus) => void;
  fetchStatus: () => Promise<{ success: boolean; data?: any; message?: string }>;
  clockIn: (lat: number, lon: number, distance: number, locationName: string) => Promise<{ success: boolean; data?: any; message?: string; errorData?: any }>;
  clockOut: () => Promise<{ success: boolean; data?: any; message?: string }>;

  // Report Actions
  setReportFilters: (filters: Partial<AttendanceReportFilter>) => void;
  resetReportFilters: () => void;
  fetchReport: (filters?: Partial<AttendanceReportFilter>) => Promise<{ success: boolean; data?: any; message?: string }>;
  toggleRowExpansion: (rowId: string) => void;
  expandAllRows: () => void;
  collapseAllRows: () => void;
  getExportPdfUrl: () => string;
  exportPdf: () => Promise<{ success: boolean; url?: string; message?: string }>;
}

const DEFAULT_FILTERS: AttendanceReportFilter = {
  search: '',
  status: 'ALL',
  startDate: '',
  endDate: '',
  page: 1,
  limit: 50,
};

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  status: 'NOT_CLOCKED_IN',
  clockInTime: null,
  latitude: null,
  longitude: null,
  distanceFromOffice: null,
  history: [],
  loading: false,
  error: null,

  // Report initial state
  reportItems: [],
  reportMetrics: null,
  reportTotal: 0,
  reportPage: 1,
  reportTotalPages: 1,
  reportLoading: false,
  reportExporting: false,
  reportError: null,
  expandedRowIds: {},
  isManager: false,
  userRole: '',
  reportFilters: DEFAULT_FILTERS,

  setStatus: (status) => set({ status }),

  fetchStatus: async () => {
    try {
      set({ loading: true, error: null });
      const response = await axios.get(GetAttendanceStatus);
      const data = response.data;
      if (data?.success) {
        const activeRec = data.record;
        set({
          loading: false,
          status: data.status || (activeRec ? 'CLOCKED_IN' : 'NOT_CLOCKED_IN'),
          clockInTime: activeRec?.clockInTime || null,
          latitude: activeRec?.latitude ?? null,
          longitude: activeRec?.longitude ?? null,
          distanceFromOffice: activeRec?.distanceFromOffice ?? null,
          history: Array.isArray(data.history) ? data.history : [],
          error: null,
        });
        return { success: true, data };
      }
      set({ loading: false });
      return { success: false, message: data?.message || 'Failed to fetch attendance status' };
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Network error fetching attendance status';
      set({ loading: false, error: msg });
      return { success: false, message: msg };
    }
  },

  clockIn: async (lat, lon, distance, locationName) => {
    try {
      set({ loading: true, error: null });
      const response = await axios.post(ClockIn, {
        latitude: lat,
        longitude: lon,
        distanceFromOffice: distance,
        locationName,
      });
      const data = response.data;
      if (data?.success) {
        const activeRec = data.record;
        set({
          loading: false,
          status: 'CLOCKED_IN',
          clockInTime: activeRec?.clockInTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          latitude: lat,
          longitude: lon,
          distanceFromOffice: distance,
          history: Array.isArray(data.history) ? data.history : get().history,
          error: null,
        });
        return { success: true, data: data.record || data };
      }
      set({ loading: false, status: 'NOT_CLOCKED_IN', error: data?.message || 'Clock in failed' });
      return { success: false, message: data?.message || 'Clock in failed' };
    } catch (err: any) {
      const errorData = err?.response?.data;
      const msg = errorData?.message || err?.message || 'Clock in failed on server';
      set({ loading: false, status: 'NOT_CLOCKED_IN', error: msg });
      return { success: false, message: msg, errorData };
    }
  },

  clockOut: async () => {
    try {
      set({ loading: true, error: null });
      const response = await axios.post(ClockOut);
      const data = response.data;
      if (data?.success) {
        set({
          loading: false,
          status: 'NOT_CLOCKED_IN',
          clockInTime: null,
          latitude: null,
          longitude: null,
          distanceFromOffice: null,
          history: Array.isArray(data.history) ? data.history : get().history,
          error: null,
        });
        return { success: true, data: data.record || data };
      }
      set({ loading: false, error: data?.message || 'Clock out failed' });
      return { success: false, message: data?.message || 'Clock out failed' };
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Clock out failed on server';
      set({ loading: false, error: msg });
      return { success: false, message: msg };
    }
  },

  setReportFilters: (newFilters) => {
    const updated = { ...get().reportFilters, ...newFilters };
    set({ reportFilters: updated });
  },

  resetReportFilters: () => {
    set({ reportFilters: DEFAULT_FILTERS });
    get().fetchReport(DEFAULT_FILTERS);
  },

  fetchReport: async (overrideFilters) => {
    try {
      set({ reportLoading: true, reportError: null });
      const currentFilters = { ...get().reportFilters, ...(overrideFilters || {}) };
      
      const queryParams = new URLSearchParams();
      if (currentFilters.search?.trim()) {
        queryParams.append('search', currentFilters.search.trim());
      }
      if (currentFilters.status && currentFilters.status !== 'ALL') {
        queryParams.append('status', currentFilters.status);
      }
      if (currentFilters.startDate) {
        queryParams.append('startDate', currentFilters.startDate);
      }
      if (currentFilters.endDate) {
        queryParams.append('endDate', currentFilters.endDate);
      }
      if (currentFilters.page) {
        queryParams.append('page', String(currentFilters.page));
      }
      if (currentFilters.limit) {
        queryParams.append('limit', String(currentFilters.limit));
      }

      const queryString = queryParams.toString();
      const url = queryString ? `${GetAttendanceReport}?${queryString}` : GetAttendanceReport;

      const response = await axios.get(url);
      const resData = response.data;

      if (resData?.success) {
        const payload = resData.data || {};
        set({
          reportLoading: false,
          reportItems: Array.isArray(payload.items) ? payload.items : [],
          reportMetrics: payload.metrics || null,
          reportTotal: payload.total || 0,
          reportPage: payload.page || 1,
          reportTotalPages: payload.totalPages || 1,
          isManager: Boolean(payload.isManager),
          userRole: payload.userRole || '',
          reportError: null,
          reportFilters: currentFilters,
        });
        return { success: true, data: payload };
      }

      set({ reportLoading: false, reportError: resData?.message || 'Failed to load report' });
      return { success: false, message: resData?.message || 'Failed to load report' };
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Network error fetching report';
      set({ reportLoading: false, reportError: msg });
      return { success: false, message: msg };
    }
  },

  toggleRowExpansion: (rowId: string) => {
    const current = get().expandedRowIds;
    set({
      expandedRowIds: {
        ...current,
        [rowId]: !current[rowId],
      },
    });
  },

  expandAllRows: () => {
    const items = get().reportItems;
    const next: Record<string, boolean> = {};
    items.forEach((item) => {
      next[item.id] = true;
    });
    set({ expandedRowIds: next });
  },

  collapseAllRows: () => {
    set({ expandedRowIds: {} });
  },

  getExportPdfUrl: () => {
    const filters = get().reportFilters;
    const token = useAuthStore.getState().token;
    const queryParams = new URLSearchParams();

    if (token) queryParams.append('token', token);
    if (filters.search?.trim()) queryParams.append('search', filters.search.trim());
    if (filters.status && filters.status !== 'ALL') queryParams.append('status', filters.status);
    if (filters.startDate) queryParams.append('startDate', filters.startDate);
    if (filters.endDate) queryParams.append('endDate', filters.endDate);

    const queryString = queryParams.toString();
    return queryString ? `${ExportAttendancePdf}?${queryString}` : ExportAttendancePdf;
  },

  exportPdf: async () => {
    try {
      set({ reportExporting: true });
      const downloadUrl = get().getExportPdfUrl();
      const supported = await Linking.canOpenURL(downloadUrl);
      
      if (supported || Platform.OS === 'android' || Platform.OS === 'ios') {
        await Linking.openURL(downloadUrl);
        set({ reportExporting: false });
        return {
          success: true,
          url: downloadUrl,
          message: 'PDF report generation initiated. Check your device Downloads/Browser.',
        };
      } else {
        throw new Error('Device cannot open PDF download URL');
      }
    } catch (err: any) {
      const msg = err?.message || 'Failed to export PDF';
      set({ reportExporting: false });
      Alert.alert('Export Failed', msg);
      return { success: false, message: msg };
    }
  },
}));
