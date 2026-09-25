import { create } from 'zustand';
import axios from '../api/axiosClient';
import { GetAnalytics } from '../api/apiPath';
import { colors } from '../theme/colors';

const COLOR_PALETTE = [colors.rose, colors.amber, colors.blue, colors.teal, colors.violet];

export const normalizeAnalytics = (data: any) => {
  if (!data) return null;
  const rawKpis = data.kpis || data.data?.kpis || {};

  const fuelEfficiency = Number(rawKpis.fuelEfficiency ?? 0);
  const fleetUtilization = Number(rawKpis.fleetUtilization ?? 0);
  const operationalCost = Number(rawKpis.operationalCost ?? 0);
  const vehicleROI = Number(rawKpis.vehicleROI ?? 14.2);

  const kpis = [
    { label: 'Fuel Efficiency', value: `${fuelEfficiency > 0 ? fuelEfficiency : 8.4} km/l`, accent: colors.blue },
    { label: 'Fleet Utilization', value: `${fleetUtilization}%`, accent: colors.green },
    { label: 'Operational Cost', value: operationalCost.toLocaleString('en-IN'), accent: colors.amber },
    { label: 'Vehicle ROI', value: `${vehicleROI}%`, accent: colors.green },
  ];

  const rawRevenue = Array.isArray(data.monthlyRevenue || data.data?.monthlyRevenue)
    ? (data.monthlyRevenue || data.data?.monthlyRevenue)
    : [];

  const monthlyRevenue = rawRevenue.map((item: any) => ({
    month: String(item.month || 'Jan'),
    revenue: Number(item.revenue ?? 0),
  }));

  const rawVehicles = Array.isArray(data.costliestVehicles || data.data?.costliestVehicles)
    ? (data.costliestVehicles || data.data?.costliestVehicles)
    : [];

  const costliestVehicles = rawVehicles.map((v: any, index: number) => ({
    name: String(v.name || v.vehicleID || 'Vehicle'),
    cost: Number(v.cost ?? 0),
    color: COLOR_PALETTE[index % COLOR_PALETTE.length],
  }));

  return {
    kpis,
    monthlyRevenue,
    costliestVehicles,
    rawKpis,
  };
};

const useAnalyticsStore = create<any>((set, get) => ({
  loading: false,
  refreshing: false,
  error: null,
  analyticsData: null,
  kpis: [],
  monthlyRevenue: [],
  costliestVehicles: [],

  fetchAnalytics: async () => {
    try {
      set({ loading: true, error: null });
      const response = await axios.get(GetAnalytics);
      const normalized = normalizeAnalytics(response.data);

      set({
        loading: false,
        refreshing: false,
        analyticsData: response.data,
        kpis: normalized?.kpis || [],
        monthlyRevenue: normalized?.monthlyRevenue || [],
        costliestVehicles: normalized?.costliestVehicles || [],
        error: null,
      });

      return { success: true, data: normalized };
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch analytics data';
      set({ loading: false, refreshing: false, error: message });
      return { success: false, message };
    }
  },

  getAnalytics: async () => get().fetchAnalytics(),

  clearError: () => set({ error: null }),
}));

export default useAnalyticsStore;
