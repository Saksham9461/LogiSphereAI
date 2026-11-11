// ==============================================================================
// LogiSphere AI — Live GIS Telematics & WebSocket Service
// Connects to /api/tracking/live and ws:// /ws/tracking?token=:token
// ==============================================================================

import { apiClient, getWsBaseUrl } from './apiClient';
import type { LiveVehicle } from '../types';

export interface TrackingWsCallbacks {
  onConnected?: () => void;
  onDisconnected?: () => void;
  onLocationUpdate?: (data: Partial<LiveVehicle> & { tripID: string; vehicleID: string }) => void;
  onTripEnded?: (tripID: string) => void;
}

export const trackingService = {
  async getLiveFleet(): Promise<LiveVehicle[]> {
    const response = await apiClient.get('/api/tracking/live');
    const raw = response.data;
    const rawFleet: any[] = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.data)
      ? raw.data
      : Array.isArray(raw?.vehicles)
      ? raw.vehicles
      : [];

    return rawFleet.map((item: any) => ({
      tripID: String(item.tripID || item.tripid || item.id || ''),
      vehicleID: String(item.vehicleID || item.vehicleid || item.vehicle || 'Vehicle'),
      vehicleName: String(item.vehicleName || item.registrationNumber || item.vehicleID || 'Vehicle'),
      registrationNumber: String(item.registrationNumber || item.reg || ''),
      driverID: String(item.driverID || item.driverid || 'Driver'),
      driverName: String(item.driverName || item.driver || 'Assigned Driver'),
      driverPhone: item.driverPhone || item.phoneNo,
      source: String(item.source || 'Depot A'),
      destination: String(item.destination || 'Delivery Terminal'),
      status: String(item.status || 'IN_TRANSIT'),
      latitude: item.latitude !== null && item.latitude !== undefined ? Number(item.latitude) : 23.0225,
      longitude: item.longitude !== null && item.longitude !== undefined ? Number(item.longitude) : 72.5714,
      speed: Number(item.speed ?? 45),
      accuracy: item.accuracy ? Number(item.accuracy) : null,
      heading: item.heading ? Number(item.heading) : 0,
      isLive: Boolean(item.isLive ?? true),
      freshness: item.freshness || 'LIVE',
      lastUpdated: item.lastUpdated || item.updatedAt || new Date().toISOString(),
    }));
  },

  async getLiveLocations(): Promise<LiveVehicle[]> {
    return this.getLiveFleet();
  },

  connectTrackingWs(
    tokenOrCallbacks?: string | TrackingWsCallbacks,
    onLocationUpdate?: (data: Partial<LiveVehicle> & { tripID: string; vehicleID: string }) => void,
    onTripEnded?: (tripID: string) => void,
    onConnectionChange?: (connected: boolean) => void
  ): () => void {
    if (typeof window === 'undefined') return () => {};

    let token = '';
    let callbacks: TrackingWsCallbacks = {};

    if (typeof tokenOrCallbacks === 'string') {
      token = tokenOrCallbacks;
      callbacks = {
        onLocationUpdate,
        onTripEnded,
        onConnected: () => onConnectionChange?.(true),
        onDisconnected: () => onConnectionChange?.(false),
      };
    } else if (tokenOrCallbacks) {
      callbacks = tokenOrCallbacks;
      token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
    } else {
      token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
    }

    const wsUrl = `${getWsBaseUrl()}/ws/tracking?token=${encodeURIComponent(token)}`;
    let ws: WebSocket | null = null;
    let isClosedIntentionally = false;

    try {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        callbacks.onConnected?.();
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const type = payload.type || payload.event;
          const data = payload.data || payload.payload;

          if (type === 'tracking:location_update' || type === 'location:update') {
            callbacks.onLocationUpdate?.(data);
          } else if (type === 'tracking:trip_ended') {
            callbacks.onTripEnded?.(data?.tripID);
          }
        } catch (e) {
          console.warn('[Tracking WS] Message parse error:', e);
        }
      };

      ws.onclose = () => {
        callbacks.onDisconnected?.();
        if (!isClosedIntentionally) {
          setTimeout(() => {
            if (!isClosedIntentionally) {
              trackingService.connectTrackingWs(callbacks);
            }
          }, 5000);
        }
      };
    } catch (e) {
      console.warn('[Tracking WS] Connection error:', e);
    }

    return () => {
      isClosedIntentionally = true;
      if (ws) ws.close();
    };
  },
};
