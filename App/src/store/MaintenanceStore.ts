import { create } from 'zustand';
import axios from '../api/axiosClient';
import { GetMaintenance, RegisterMaintenance } from '../api/apiPath';

const extractList = (data: any) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.serviceResult)) return data.serviceResult;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.maintenanceRecords)) return data.maintenanceRecords;
  if (Array.isArray(data?.records)) return data.records;
  return [];
};

const extractItem = (data: any) => {
  if (!data) return null;
  if (data?.record) return data.record;
  if (data?.maintenanceRecord) return data.maintenanceRecord;
  if (data?.serviceResult && !Array.isArray(data.serviceResult)) return data.serviceResult;
  if (data?.data && !Array.isArray(data.data)) return data.data;
  return data;
};

export const normalizeRecord = (r: any) => {
  if (!r) return null;
  const rawStatus = String(r.status || r.rawStatus || 'COMPLETED').toUpperCase();
  const statusStr = (rawStatus === 'ACTIVE' || r.status === 'Active' || r.status === 'In Shop') ? 'Active' : 'Completed';
  
  return {
    id: String(r.id || r.maintenanceID || Math.random()),
    vehicleID: String(r.vehicleID || r.vehicleId || ''),
    vehicle: String(r.vehicle || r.vehicleName || r.vehicleID || 'Vehicle'),
    serviceType: String(r.serviceType || r.service || ''),
    service: String(r.service || r.serviceType || ''),
    cost: Number(r.cost) || 0,
    date: r.date ? String(r.date).slice(0, 10) : new Date().toISOString().slice(0, 10),
    status: statusStr,
    rawStatus: statusStr === 'Active' ? 'ACTIVE' : 'COMPLETED',
  };
};

const useMaintenanceStore = create<any>((set, get) => ({
  loading: false,
  maintenanceRecords: [],
  error: null,

  fetchMaintenance: async () => {
    try {
      set({ loading: true, error: null });
      const response = await axios.get(GetMaintenance);
      const rawList = extractList(response.data);
      const normalizedList = rawList.map(normalizeRecord).filter(Boolean);
      set({ loading: false, maintenanceRecords: normalizedList, error: null });
      return { success: true, data: normalizedList };
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch maintenance records';
      set({ loading: false, error: message });
      return { success: false, message };
    }
  },

  getMaintenance: async () => get().fetchMaintenance(),

  createMaintenance: async (payload: {
    vehicleID: string;
    serviceType: string;
    cost: number;
    date: string;
    status: 'ACTIVE' | 'COMPLETED';
  }) => {
    try {
      set({ loading: true, error: null });
      const response = await axios.post(RegisterMaintenance, payload);
      const rawItem = extractItem(response.data);
      const item = normalizeRecord(rawItem);
      
      set((state: any) => ({
        loading: false,
        maintenanceRecords: item ? [item, ...state.maintenanceRecords] : state.maintenanceRecords,
        error: null,
      }));
      return { success: true, data: item };
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create maintenance record';
      set({ loading: false, error: message });
      return { success: false, message };
    }
  },

  addMaintenance: async (payload: any) => get().createMaintenance(payload),

  clearMaintenance: () => set({ maintenanceRecords: [], error: null }),
}));

export default useMaintenanceStore;
