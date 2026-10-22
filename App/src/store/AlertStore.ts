import { create } from 'zustand';
import client from '../api/axiosClient';
import {
  GetAlerts,
  GetAlertsCount,
  GetAlertDetails,
  AcknowledgeAlert,
  ResolveAlert,
} from '../api/apiPath';
import useAuthStore from './AuthStore';

export interface EmergencyAlert {
  id: string;
  driverId: string;
  driverName: string;
  businessId?: string;
  tripId?: string | null;
  vehicleId?: string | null;
  latitude: number | null;
  longitude: number | null;
  locationAccuracy?: number | null;
  locationCapturedAt?: string | null;
  locationStatus: 'PRECISE' | 'LAST_KNOWN' | 'UNAVAILABLE';
  message: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  acknowledgedBy?: string | null;
  acknowledgedByName?: string | null;
  acknowledgedAt?: string | null;
  resolvedBy?: string | null;
  resolvedByName?: string | null;
  resolvedAt?: string | null;
  resolutionNote?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AlertStatusFilter = 'ALL' | 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';

interface AlertState {
  alerts: EmergencyAlert[];
  activeCount: number;
  totalCount: number;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  statusFilter: AlertStatusFilter;
  searchQuery: string;
  isManager: boolean;
  selectedAlert: EmergencyAlert | null;
  activeBannerAlert: EmergencyAlert | null;

  // Actions
  setStatusFilter: (filter: AlertStatusFilter) => void;
  setSearchQuery: (query: string) => void;
  setSelectedAlert: (alert: EmergencyAlert | null) => void;
  dismissBannerAlert: () => void;
  fetchAlerts: (isRefreshing?: boolean) => Promise<void>;
  fetchActiveCount: () => Promise<void>;
  acknowledgeAlert: (alertId: string) => Promise<{ success: boolean; message?: string }>;
  resolveAlert: (alertId: string, note?: string) => Promise<{ success: boolean; message?: string }>;
  handleRealtimeAlert: (incoming: EmergencyAlert) => void;
  resetState: () => void;
}

export const useAlertStore = create<AlertState>((set, get) => ({
  alerts: [],
  activeCount: 0,
  totalCount: 0,
  loading: false,
  refreshing: false,
  error: null,
  statusFilter: 'ALL',
  searchQuery: '',
  isManager: false,
  selectedAlert: null,
  activeBannerAlert: null,

  setStatusFilter: (statusFilter) => {
    set({ statusFilter });
    get().fetchAlerts();
  },

  setSearchQuery: (searchQuery) => {
    set({ searchQuery });
  },

  setSelectedAlert: (selectedAlert) => {
    set({ selectedAlert });
  },

  dismissBannerAlert: () => {
    set({ activeBannerAlert: null });
  },

  resetState: () => {
    set({
      alerts: [],
      activeCount: 0,
      totalCount: 0,
      loading: false,
      refreshing: false,
      error: null,
      selectedAlert: null,
      activeBannerAlert: null,
    });
  },

  fetchAlerts: async (isRefreshing = false) => {
    try {
      if (isRefreshing) {
        set({ refreshing: true, error: null });
      } else {
        set({ loading: true, error: null });
      }

      const { statusFilter, searchQuery } = get();
      const params: any = {};
      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const response = await client.get(GetAlerts, { params });
      const data = response.data;

      if (data?.success && Array.isArray(data.alerts)) {
        set({
          alerts: data.alerts,
          totalCount: data.total ?? data.alerts.length,
          activeCount: data.activeCount ?? data.alerts.filter((a: any) => a.status === 'ACTIVE').length,
          isManager: Boolean(data.isManager),
          loading: false,
          refreshing: false,
          error: null,
        });
      } else {
        set({ loading: false, refreshing: false });
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to fetch emergency alerts';
      set({ loading: false, refreshing: false, error: msg });
    }
  },

  fetchActiveCount: async () => {
    try {
      const res = await client.get(GetAlertsCount);
      if (res.data?.success) {
        set({
          activeCount: Number(res.data.activeCount ?? 0),
          totalCount: Number(res.data.totalCount ?? 0),
          isManager: Boolean(res.data.isManager),
        });
      }
    } catch (_) {}
  },

  acknowledgeAlert: async (alertId: string) => {
    const previousAlerts = get().alerts;
    const currentAlert = previousAlerts.find((a) => a.id === alertId);
    if (!currentAlert) return { success: false, message: 'Alert not found' };

    const currentUser = useAuthStore.getState().user;
    const nowIso = new Date().toISOString();

    // Optimistic local update
    const updatedAlerts = previousAlerts.map((a) =>
      a.id === alertId
        ? {
            ...a,
            status: 'ACKNOWLEDGED' as const,
            acknowledgedBy: currentUser?.id || currentUser?.userId || 'Manager',
            acknowledgedAt: nowIso,
          }
        : a
    );

    const newActiveCount = updatedAlerts.filter((a) => a.status === 'ACTIVE').length;
    set({ alerts: updatedAlerts, activeCount: newActiveCount });

    try {
      const res = await client.patch(AcknowledgeAlert(alertId));
      if (res.data?.success && res.data?.data) {
        const serverAlert = res.data.data;
        set((state) => ({
          alerts: state.alerts.map((a) => (a.id === alertId ? serverAlert : a)),
          selectedAlert: state.selectedAlert?.id === alertId ? serverAlert : state.selectedAlert,
        }));
        return { success: true };
      }
      // Revert on error
      set({ alerts: previousAlerts, activeCount: previousAlerts.filter((a) => a.status === 'ACTIVE').length });
      return { success: false, message: res.data?.message || 'Server rejected acknowledgement' };
    } catch (err: any) {
      // Revert on network exception
      set({ alerts: previousAlerts, activeCount: previousAlerts.filter((a) => a.status === 'ACTIVE').length });
      const msg = err?.response?.data?.message || err?.message || 'Acknowledgement failed';
      return { success: false, message: msg };
    }
  },

  resolveAlert: async (alertId: string, note?: string) => {
    const previousAlerts = get().alerts;
    const currentAlert = previousAlerts.find((a) => a.id === alertId);
    if (!currentAlert) return { success: false, message: 'Alert not found' };

    const currentUser = useAuthStore.getState().user;
    const nowIso = new Date().toISOString();

    // Optimistic local update
    const updatedAlerts = previousAlerts.map((a) =>
      a.id === alertId
        ? {
            ...a,
            status: 'RESOLVED' as const,
            resolvedBy: currentUser?.id || currentUser?.userId || 'Manager',
            resolvedAt: nowIso,
            resolutionNote: note || 'Resolved by fleet manager',
          }
        : a
    );

    const newActiveCount = updatedAlerts.filter((a) => a.status === 'ACTIVE').length;
    set({ alerts: updatedAlerts, activeCount: newActiveCount });

    try {
      const res = await client.patch(ResolveAlert(alertId), {
        resolutionNote: note || 'Resolved by fleet manager',
      });

      if (res.data?.success && res.data?.data) {
        const serverAlert = res.data.data;
        set((state) => ({
          alerts: state.alerts.map((a) => (a.id === alertId ? serverAlert : a)),
          selectedAlert: state.selectedAlert?.id === alertId ? serverAlert : state.selectedAlert,
        }));
        return { success: true };
      }
      set({ alerts: previousAlerts, activeCount: previousAlerts.filter((a) => a.status === 'ACTIVE').length });
      return { success: false, message: res.data?.message || 'Server rejected resolution' };
    } catch (err: any) {
      set({ alerts: previousAlerts, activeCount: previousAlerts.filter((a) => a.status === 'ACTIVE').length });
      const msg = err?.response?.data?.message || err?.message || 'Resolution failed';
      return { success: false, message: msg };
    }
  },

  handleRealtimeAlert: (incoming: EmergencyAlert) => {
    if (!incoming || !incoming.id) return;

    const currentUser = useAuthStore.getState().user;
    if (!currentUser) return;

    const role = String(currentUser.role || '').toUpperCase();
    const isDriver = role === 'ROLE_DRIVER' || role === 'DRIVER';
    const currentUserId = String(currentUser.id || currentUser.userId || '').toLowerCase();

    // Strict driver isolation: drivers can ONLY receive and merge their own alerts
    if (isDriver && String(incoming.driverId).toLowerCase() !== currentUserId) {
      return;
    }

    // Strict manager isolation: managers can ONLY receive alerts from their own organization
    const managerOrg = currentUser.organization_id || currentUser.organizationId || currentUser.businessId || currentUser.business_id;
    const alertOrg = incoming.organization_id || (incoming as any).organizationId || incoming.businessId;
    if (!isDriver && managerOrg && alertOrg && String(managerOrg).toLowerCase() !== String(alertOrg).toLowerCase()) {
      return;
    }

    set((state) => {
      const existsIndex = state.alerts.findIndex((a) => a.id === incoming.id);
      let nextAlerts: EmergencyAlert[];

      if (existsIndex >= 0) {
        // Update existing alert by ID
        nextAlerts = state.alerts.map((a, idx) => (idx === existsIndex ? incoming : a));
      } else {
        // Prepend brand new alert at the top
        nextAlerts = [incoming, ...state.alerts];
      }

      // Sort newest first
      nextAlerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const activeCount = nextAlerts.filter((a) => a.status === 'ACTIVE').length;

      // Attention banner for new ACTIVE emergency alert
      return {
        alerts: nextAlerts,
        activeCount,
        totalCount: Math.max(state.totalCount, nextAlerts.length),
        activeBannerAlert: incoming.status === 'ACTIVE' ? incoming : state.activeBannerAlert,
        selectedAlert: state.selectedAlert?.id === incoming.id ? incoming : state.selectedAlert,
      };
    });
  },
}));

// Clean up when user logs out or session changes
useAuthStore.subscribe((state, prevState) => {
  if (!state.user && prevState?.user) {
    useAlertStore.getState().resetState();
  } else if (state.user && (!prevState?.user || state.user?.id !== prevState?.user?.id)) {
    useAlertStore.getState().fetchAlerts();
    useAlertStore.getState().fetchActiveCount();
  }
});
