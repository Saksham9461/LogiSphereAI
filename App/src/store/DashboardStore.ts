import { create } from 'zustand';
import axios from '../api/axiosClient';
import { GetDashboardSummary } from '../api/apiPath';
import { colors } from '../theme/colors';

const STATUS_COLORS: Record<string, string> = {
  Available: colors.success,
  'On Trip': colors.teal,
  'In Shop': colors.amber,
  'Not Avail': colors.rose,
};

export const normalizeDashboardSummary = (data: any) => {
  if (!data) return null;
  const rawData = data.data || data;

  const activeVehicles = Number(rawData.activeVehicles ?? 0);
  const availableVehicles = Number(rawData.availableVehicles ?? 0);
  const vehiclesInMaintenance = Number(rawData.vehiclesInMaintenance ?? 0);
  const activeTrips = Number(rawData.activeTrips ?? 0);
  const previousTrips = Number(rawData.previousTrips ?? 0);
  const driversOnDuty = Number(rawData.driversOnDuty ?? 0);
  const fleetUtilization = Number(rawData.fleetUtilization ?? 0);

  const stats = {
    activeVehicles,
    availableVehicles,
    vehiclesInMaintenance,
    activeTrips,
    previousTrips,
    driversOnDuty,
    fleetUtilization,
  };

  const rawBreakdown = Array.isArray(rawData.statusBreakdown) ? rawData.statusBreakdown : [];
  const maxVehicles = Math.max(activeVehicles, availableVehicles + activeTrips + vehiclesInMaintenance, 1);

  const vehicleStatus = rawBreakdown.map((item: any) => ({
    label: String(item.label || 'Status'),
    value: Number(item.value ?? 0),
    max: maxVehicles,
    color: STATUS_COLORS[item.label] || colors.teal,
  }));

  return {
    stats,
    vehicleStatus: vehicleStatus.length > 0 ? vehicleStatus : [
      { label: 'Available', value: availableVehicles, max: maxVehicles, color: colors.success },
      { label: 'On Trip', value: activeTrips, max: maxVehicles, color: colors.teal },
      { label: 'In Shop', value: vehiclesInMaintenance, max: maxVehicles, color: colors.amber },
      { label: 'Not Avail', value: 0, max: maxVehicles, color: colors.rose },
    ],
  };
};

const useDashboardStore = create<any>((set, get) => ({
  loading: false,
  refreshing: false,
  error: null,
  summary: null,
  stats: {
    activeVehicles: 0,
    availableVehicles: 0,
    vehiclesInMaintenance: 0,
    activeTrips: 0,
    previousTrips: 0,
    driversOnDuty: 0,
    fleetUtilization: 0,
  },
  vehicleStatus: [],

  fetchDashboardSummary: async () => {
    try {
      set({ loading: true, error: null });
      const response = await axios.get(GetDashboardSummary);
      const normalized = normalizeDashboardSummary(response.data);

      set({
        loading: false,
        refreshing: false,
        summary: response.data,
        stats: normalized?.stats || get().stats,
        vehicleStatus: normalized?.vehicleStatus || [],
        error: null,
      });

      return { success: true, data: normalized };
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch dashboard summary';
      set({ loading: false, refreshing: false, error: message });
      return { success: false, message };
    }
  },

  getDashboardSummary: async () => get().fetchDashboardSummary(),

  clearError: () => set({ error: null }),
}));

export default useDashboardStore;
