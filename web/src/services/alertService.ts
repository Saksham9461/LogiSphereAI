// ==============================================================================
// LogiSphere AI — Emergency SOS & Fleet Alerts Service
// Connects to /api/alerts, /api/sos, and /ws/alerts WebSocket stream
// ==============================================================================

import { apiClient, getWsBaseUrl } from './apiClient';
import type { EmergencyAlert } from '../types';

export interface AlertWsCallbacks {
  onConnected?: () => void;
  onDisconnected?: () => void;
  onAlertCreated?: (alert: EmergencyAlert) => void;
  onAlertAcknowledged?: (alert: EmergencyAlert) => void;
  onAlertResolved?: (alert: EmergencyAlert) => void;
  onAlertEvent?: (alert: EmergencyAlert) => void;
}

// Global shared WebSocket manager to prevent duplicate connections or premature StrictMode unmount closures
let sharedAlertWs: WebSocket | null = null;
const alertSubscribers = new Set<AlertWsCallbacks>();
let alertReconnectTimer: any = null;

function ensureAlertsWsConnection() {
  if (typeof window === 'undefined') return;
  if (alertSubscribers.size === 0) return;
  if (sharedAlertWs && (sharedAlertWs.readyState === WebSocket.OPEN || sharedAlertWs.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
  const wsUrl = `${getWsBaseUrl()}/ws/alerts?token=${encodeURIComponent(token)}`;

  try {
    const ws = new WebSocket(wsUrl);
    sharedAlertWs = ws;

    ws.onopen = () => {
      alertSubscribers.forEach((cb) => {
        try {
          cb.onConnected?.();
        } catch {
          // ignore callback error
        }
      });
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const type = payload.type || payload.event;
        const data = payload.data || payload.payload;

        if (data) {
          alertSubscribers.forEach((cb) => {
            try {
              cb.onAlertEvent?.(data);

              // Handle alert creation events (backend emits 'alert:emergency_created')
              if (
                type === 'alert:emergency_created' ||
                type === 'alerts:sos_broadcast' ||
                type === 'alert:created' ||
                type === 'alert:sos'
              ) {
                cb.onAlertCreated?.(data);
              } else if (
                type === 'alert:emergency_updated' ||
                type === 'alert:updated' ||
                type === 'alert:acknowledged' ||
                type === 'alert:resolved'
              ) {
                if (data?.status === 'RESOLVED' || type === 'alert:resolved') {
                  cb.onAlertResolved?.(data);
                } else if (data?.status === 'ACKNOWLEDGED' || type === 'alert:acknowledged') {
                  cb.onAlertAcknowledged?.(data);
                } else {
                  cb.onAlertEvent?.(data);
                }
              }
            } catch {
              // ignore callback error
            }
          });
        }
      } catch {
        // silent parse error
      }
    };

    ws.onerror = () => {
      // Intentionally silent: prevent console noise
    };

    ws.onclose = () => {
      if (sharedAlertWs === ws) {
        sharedAlertWs = null;
      }
      alertSubscribers.forEach((cb) => {
        try {
          cb.onDisconnected?.();
        } catch {
          // ignore callback error
        }
      });

      if (alertSubscribers.size > 0 && !alertReconnectTimer) {
        alertReconnectTimer = setTimeout(() => {
          alertReconnectTimer = null;
          ensureAlertsWsConnection();
        }, 5000);
      }
    };
  } catch {
    // Intentionally silent
  }
}

export const alertService = {
  async getAlerts(params?: {
    status?: string;
    driverId?: string;
    limit?: number;
    offset?: number;
  }): Promise<EmergencyAlert[]> {
    const response = await apiClient.get('/api/alerts', { params });
    const data = response.data;
    const rawList = Array.isArray(data)
      ? data
      : Array.isArray(data?.serviceResult)
      ? data.serviceResult
      : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.alerts)
      ? data.alerts
      : [];

    return rawList.map((a: any) => ({
      id: String(a.id || a.alertID || a.alert_id || ''),
      driverId: String(a.driverId || a.driver_id || a.driverID || ''),
      driverName: a.driverName || a.driver_name || a.driver?.name || 'Driver',
      tripId: a.tripId || a.trip_id || null,
      vehicleId: a.vehicleId || a.vehicle_id || null,
      latitude: a.latitude !== undefined && a.latitude !== null ? Number(a.latitude) : null,
      longitude: a.longitude !== undefined && a.longitude !== null ? Number(a.longitude) : null,
      locationStatus: a.locationStatus || a.location_status || 'PRECISE',
      message: a.message || 'Emergency distress signal triggered',
      status: (a.status || 'ACTIVE').toUpperCase(),
      acknowledgedByName: a.acknowledgedByName || a.acknowledged_by_name || null,
      acknowledgedAt: a.acknowledgedAt || a.acknowledged_at || null,
      resolvedByName: a.resolvedByName || a.resolved_by_name || null,
      resolvedAt: a.resolvedAt || a.resolved_at || null,
      resolutionNote: a.resolutionNote || a.resolution_note || null,
      createdAt: a.createdAt || a.created_at || new Date().toISOString(),
      updatedAt: a.updatedAt || a.updated_at || new Date().toISOString(),
    }));
  },

  async getActiveCount(): Promise<number> {
    const response = await apiClient.get('/api/alerts/count');
    return Number(response.data?.count ?? response.data?.activeCount ?? 0);
  },

  async acknowledgeAlert(id: string): Promise<any> {
    const cleanId = encodeURIComponent(String(id || '').trim().replace(/^#/, ''));
    const response = await apiClient.post(`/api/alerts/${cleanId}/acknowledge`);
    return response.data;
  },

  async resolveAlert(id: string, note?: string): Promise<any> {
    const cleanId = encodeURIComponent(String(id || '').trim().replace(/^#/, ''));
    const response = await apiClient.post(`/api/alerts/${cleanId}/resolve`, {
      note: note || 'Resolved by fleet operations dispatcher',
    });
    return response.data;
  },

  async triggerSos(payload: {
    latitude?: number | null;
    longitude?: number | null;
    message?: string;
  }): Promise<any> {
    const response = await apiClient.post('/api/sos/trigger', {
      latitude: payload.latitude,
      longitude: payload.longitude,
      message: payload.message || 'Emergency assistance requested via operations console',
    });
    return response.data;
  },

  async triggerSOS(payload: {
    latitude?: number | null;
    longitude?: number | null;
    message?: string;
  }): Promise<any> {
    return this.triggerSos(payload);
  },

  connectAlertsWs(callbacks?: AlertWsCallbacks): () => void {
    if (typeof window === 'undefined') return () => {};

    if (callbacks) {
      alertSubscribers.add(callbacks);
      if (sharedAlertWs && sharedAlertWs.readyState === WebSocket.OPEN) {
        try {
          callbacks.onConnected?.();
        } catch {
          // ignore
        }
      }
    }

    ensureAlertsWsConnection();

    return () => {
      if (callbacks) {
        alertSubscribers.delete(callbacks);
      }
      if (alertSubscribers.size === 0) {
        if (alertReconnectTimer) {
          clearTimeout(alertReconnectTimer);
          alertReconnectTimer = null;
        }
        if (sharedAlertWs) {
          const wsToClose = sharedAlertWs;
          sharedAlertWs = null;
          try {
            if (wsToClose.readyState === WebSocket.OPEN) {
              wsToClose.close(1000, 'Normal Closure');
            } else if (wsToClose.readyState === WebSocket.CONNECTING) {
              // Wait for connection to open before closing, avoiding browser "closed before established" error
              wsToClose.onopen = () => {
                try {
                  wsToClose.close(1000, 'Normal Closure');
                } catch {
                  // ignore
                }
              };
              wsToClose.onerror = () => {};
              wsToClose.onclose = () => {};
            }
          } catch {
            // ignore
          }
        }
      }
    };
  },
};
