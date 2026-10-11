import { create } from 'zustand';
import client from '../api/axiosClient';
import { GetLiveTracking, WS_TRACKING_URL } from '../api/apiPath';
import { tokenStorage } from '../services/storage/tokenStorage';
import { supabase } from '../services/supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface LiveVehicle {
  tripID: string;
  vehicleID: string;
  vehicleName: string;
  registrationNumber: string;
  driverID: string;
  driverName: string;
  driverPhone?: string;
  source: string;
  destination: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
  speed: number;
  accuracy: number | null;
  heading: number | null;
  isLive: boolean;
  freshness: 'LIVE' | 'UPDATING' | 'STALE' | 'NO_SIGNAL';
  lastUpdated: string | null;
}

interface TrackingState {
  liveFleet: LiveVehicle[];
  selectedTrip: LiveVehicle | null;
  loading: boolean;
  error: string | null;
  isConnected: boolean;

  fetchLiveFleet: () => Promise<void>;
  setSelectedTrip: (trip: LiveVehicle | null) => void;
  updateLocationLocally: (update: Partial<LiveVehicle> & { tripID: string }) => void;
  removeTripFromFleet: (tripID: string) => void;
  subscribeRealtime: () => Promise<void>;
  unsubscribeRealtime: () => void;
}

let trackingWs: WebSocket | null = null;
let reconnectTimeout: any = null;
let supabaseChannel: RealtimeChannel | null = null;
let isSubscribing = false;

export const useTrackingStore = create<TrackingState>((set, get) => ({
  liveFleet: [],
  selectedTrip: null,
  loading: false,
  error: null,
  isConnected: false,

  fetchLiveFleet: async () => {
    try {
      set({ loading: true, error: null });
      const res = await client.get(GetLiveTracking);
      const raw = res.data;
      const rawFleet: any[] = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.data)
        ? raw.data
        : [];

      const normalizedFleet: LiveVehicle[] = rawFleet.map((item: any) => ({
        tripID: String(item.tripID || item.tripid || item.id || ''),
        vehicleID: String(item.vehicleID || item.vehicleid || item.vehicle || 'Vehicle'),
        vehicleName: String(item.vehicleName || item.registrationNumber || item.vehicleID || 'Vehicle'),
        registrationNumber: String(item.registrationNumber || ''),
        driverID: String(item.driverID || item.driverid || item.driver || 'Driver'),
        driverName: String(item.driverName || 'Driver'),
        driverPhone: item.driverPhone || item.driverphone || '',
        source: String(item.source || ''),
        destination: String(item.destination || ''),
        status: String(item.status || ''),
        latitude: item.latitude !== undefined && item.latitude !== null ? Number(item.latitude) : null,
        longitude: item.longitude !== undefined && item.longitude !== null ? Number(item.longitude) : null,
        speed: Number(item.speed ?? 0),
        accuracy: item.accuracy ? Number(item.accuracy) : null,
        heading: item.heading ? Number(item.heading) : null,
        isLive: Boolean(item.isLive),
        freshness: item.freshness || (item.isLive ? 'LIVE' : 'NO_SIGNAL'),
        lastUpdated: item.lastUpdated || item.updatedAt || null,
      }));

      set({ liveFleet: normalizedFleet, loading: false });

      // If a vehicle was previously selected, keep it synced with updated data
      const currentSelected = get().selectedTrip;
      if (currentSelected) {
        const updated = normalizedFleet.find(
          (v) => v.tripID.toLowerCase() === currentSelected.tripID.toLowerCase()
        );
        if (updated) {
          set({ selectedTrip: updated });
        }
      }
    } catch (err: any) {
      console.warn('[TrackingStore] fetchLiveFleet error:', err?.message);
      set({ loading: false, error: err?.response?.data?.message || err?.message });
    }
  },

  setSelectedTrip: (trip: LiveVehicle | null) => {
    set({ selectedTrip: trip });
  },

  updateLocationLocally: (update) => {
    const { liveFleet, selectedTrip } = get();
    const tripId = update.tripID;
    if (!tripId) return;

    const existingIndex = liveFleet.findIndex(
      (v) => v.tripID.toLowerCase() === tripId.toLowerCase()
    );

    let updatedFleet: LiveVehicle[];

    if (existingIndex >= 0) {
      const existing = liveFleet[existingIndex];
      const updatedVehicle: LiveVehicle = {
        ...existing,
        ...update,
        latitude: update.latitude !== undefined ? Number(update.latitude) : existing.latitude,
        longitude: update.longitude !== undefined ? Number(update.longitude) : existing.longitude,
        speed: update.speed !== undefined ? Number(update.speed) : existing.speed,
        accuracy: update.accuracy !== undefined ? update.accuracy : existing.accuracy,
        heading: update.heading !== undefined ? update.heading : existing.heading,
        isLive: true,
        freshness: 'LIVE',
        lastUpdated: update.lastUpdated || new Date().toISOString(),
      };

      updatedFleet = [...liveFleet];
      updatedFleet[existingIndex] = updatedVehicle;
    } else {
      // New vehicle packet received
      const newVehicle: LiveVehicle = {
        tripID: tripId,
        vehicleID: update.vehicleID || 'Vehicle',
        vehicleName: update.vehicleName || update.vehicleID || 'Vehicle',
        registrationNumber: update.registrationNumber || '',
        driverID: update.driverID || 'Driver',
        driverName: update.driverName || 'Driver',
        source: update.source || '',
        destination: update.destination || '',
        status: update.status || 'IN_TRANSIT',
        latitude: Number(update.latitude),
        longitude: Number(update.longitude),
        speed: Number(update.speed ?? 0),
        accuracy: update.accuracy ?? null,
        heading: update.heading ?? null,
        isLive: true,
        freshness: 'LIVE',
        lastUpdated: update.lastUpdated || new Date().toISOString(),
      };
      updatedFleet = [newVehicle, ...liveFleet];
    }

    set({ liveFleet: updatedFleet });

    // Update selectedTrip if matches
    if (selectedTrip && selectedTrip.tripID.toLowerCase() === tripId.toLowerCase()) {
      set({
        selectedTrip: {
          ...selectedTrip,
          ...update,
          latitude: update.latitude !== undefined ? Number(update.latitude) : selectedTrip.latitude,
          longitude: update.longitude !== undefined ? Number(update.longitude) : selectedTrip.longitude,
          speed: update.speed !== undefined ? Number(update.speed) : selectedTrip.speed,
          isLive: true,
          freshness: 'LIVE',
          lastUpdated: update.lastUpdated || new Date().toISOString(),
        },
      });
    }
  },

  removeTripFromFleet: (tripID: string) => {
    const { liveFleet, selectedTrip } = get();
    const updatedFleet = liveFleet.filter(
      (v) => v.tripID.toLowerCase() !== tripID.toLowerCase()
    );
    set({
      liveFleet: updatedFleet,
      selectedTrip:
        selectedTrip && selectedTrip.tripID.toLowerCase() === tripID.toLowerCase()
          ? null
          : selectedTrip,
    });
  },

  subscribeRealtime: async () => {
    if (isSubscribing || trackingWs?.readyState === WebSocket.OPEN) {
      return;
    }
    isSubscribing = true;

    try {
      const token = await tokenStorage.getToken();
      if (!token) {
        isSubscribing = false;
        return;
      }

      // 1. Establish primary WebSocket tracking channel
      const wsUrl = `${WS_TRACKING_URL}?token=${encodeURIComponent(token)}`;
      const ws = new WebSocket(wsUrl);
      trackingWs = ws;

      ws.onopen = () => {
        isSubscribing = false;
        set({ isConnected: true });
        console.log('[TrackingStore] Connected to live tracking WebSocket channel');
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'tracking:location_update' && payload.data) {
            get().updateLocationLocally(payload.data);
          } else if (payload.type === 'tracking:trip_ended' && payload.data?.tripID) {
            get().removeTripFromFleet(payload.data.tripID);
          }
        } catch (err) {
          console.warn('[TrackingStore] Malformed WebSocket message:', err);
        }
      };

      ws.onclose = () => {
        set({ isConnected: false });
        isSubscribing = false;
        trackingWs = null;
        console.log('[TrackingStore] WebSocket closed. Scheduling reconnection in 5s...');
        if (!reconnectTimeout) {
          reconnectTimeout = setTimeout(() => {
            reconnectTimeout = null;
            get().subscribeRealtime();
          }, 5000);
        }
      };

      ws.onerror = (err) => {
        console.warn('[TrackingStore] WebSocket error:', err);
      };

      // 2. Secondary fallback: Supabase Realtime on tracking_locations
      if (supabase && !supabaseChannel) {
        supabaseChannel = supabase
          .channel('tracking_locations_realtime')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'tracking_locations' },
            (payload: any) => {
              if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                const row = payload.new;
                if (row) {
                  get().updateLocationLocally({
                    tripID: row.tripID || row.tripid,
                    latitude: Number(row.latitude),
                    longitude: Number(row.longitude),
                    speed: Number(row.speed ?? 0),
                    accuracy: row.accuracy ? Number(row.accuracy) : null,
                    heading: row.heading ? Number(row.heading) : null,
                    lastUpdated: row.updatedAt || row.updatedat || row.receivedAt || row.receivedat,
                  });
                }
              } else if (payload.eventType === 'DELETE') {
                const oldRow = payload.old;
                if (oldRow?.tripID || oldRow?.tripid) {
                  get().removeTripFromFleet(oldRow.tripID || oldRow.tripid);
                }
              }
            }
          )
          .subscribe();
      }
    } catch (err) {
      isSubscribing = false;
      console.warn('[TrackingStore] subscribeRealtime error:', err);
    }
  },

  unsubscribeRealtime: () => {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    if (trackingWs) {
      try {
        trackingWs.close();
      } catch (_) {}
      trackingWs = null;
    }
    if (supabaseChannel && supabase) {
      try {
        supabase.removeChannel(supabaseChannel);
      } catch (_) {}
      supabaseChannel = null;
    }
    set({ isConnected: false });
  },
}));

export default useTrackingStore;
