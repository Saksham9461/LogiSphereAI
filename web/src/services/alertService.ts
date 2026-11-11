// ==============================================================================
// LogiSphere AI — Emergency SOS & Fleet Alerts Service
// Connects to /api/alerts, /api/sos, and /ws/alerts WebSocket stream
// ==============================================================================

import { apiClient } from './apiClient';
import type { EmergencyAlert } from '../types';

function getWsBaseUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  return `${protocol}//${host}`;
}

export interface AlertWsCallbacks {
  onConnected?: () => void;
  onDisconnected?: () => void;
  onAlertCreated?: (alert: EmergencyAlert) => void;
  onAlertAcknowledged?: (alert: EmergencyAlert) => void;
  onAlertResolved?: (alert: EmergencyAlert) => void;
  onAlertEvent?: (alert: EmergencyAlert) => void;
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

    const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
    const wsUrl = `${getWsBaseUrl()}/ws/alerts?token=${encodeURIComponent(token)}`;
    let ws: WebSocket | null = null;
    let isClosedIntentionally = false;

    try {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        callbacks?.onConnected?.();
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const type = payload.type || payload.event;
          const data = payload.data || payload.payload;

          if (data) {
            callbacks?.onAlertEvent?.(data);

            if (type === 'alerts:sos_broadcast' || type === 'alert:created') {
              callbacks?.onAlertCreated?.(data);
            } else if (type === 'alert:acknowledged') {
              callbacks?.onAlertAcknowledged?.(data);
            } else if (type === 'alert:resolved') {
              callbacks?.onAlertResolved?.(data);
            }
          }
        } catch (e) {
          console.warn('[Alerts WS] Parse error:', e);
        }
      };

      ws.onclose = () => {
        callbacks?.onDisconnected?.();
        if (!isClosedIntentionally) {
          setTimeout(() => {
            if (!isClosedIntentionally) {
              alertService.connectAlertsWs(callbacks);
            }
          }, 5000);
        }
      };
    } catch (e) {
      console.warn('[Alerts WS] Connection error:', e);
    }

    return () => {
      isClosedIntentionally = true;
      if (ws) ws.close();
    };
  },
};
