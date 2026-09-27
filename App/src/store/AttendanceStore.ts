import { create } from 'zustand';
import axios from '../api/axiosClient';
import { GetAttendanceStatus, ClockIn, ClockOut } from '../api/apiPath';

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
  
  // Actions
  setStatus: (status: AttendanceStatus) => void;
  fetchStatus: () => Promise<{ success: boolean; data?: any; message?: string }>;
  clockIn: (lat: number, lon: number, distance: number, locationName: string) => Promise<{ success: boolean; data?: any; message?: string; errorData?: any }>;
  clockOut: () => Promise<{ success: boolean; data?: any; message?: string }>;
}

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  status: 'NOT_CLOCKED_IN',
  clockInTime: null,
  latitude: null,
  longitude: null,
  distanceFromOffice: null,
  history: [],
  loading: false,
  error: null,

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
}));

