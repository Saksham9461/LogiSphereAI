// ==============================================================================
// LogiSphere AI — Trip Dispatch & Lifecycle Service
// Connects to /api/trip, /api/trip/:id/delay-insights, /api/trip/:id/destination-weather
// ==============================================================================

import { apiClient } from './apiClient';
import type { Trip } from '../types';

export const tripService = {
  async getTrips(): Promise<Trip[]> {
    const response = await apiClient.get('/api/trip');
    const data = response.data;
    const rawList = Array.isArray(data)
      ? data
      : Array.isArray(data?.serviceResult)
      ? data.serviceResult
      : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.trips)
      ? data.trips
      : [];

    return rawList.map((t: any) => ({
      id: String(t.tripID || t.tripid || t.id || ''),
      tripID: String(t.tripID || t.tripid || t.id || ''),
      vehicleID: String(t.vehicleID || t.vehicleid || ''),
      vehicleName: t.vehicleName || t.vehicle?.name || t.vehicleID,
      driverID: String(t.driverID || t.driverid || ''),
      driverName: t.driverName || t.driver?.name || t.driverID,
      source: t.source || 'Depot',
      destination: t.destination || 'Delivery Terminal',
      cargoWeight: t.cargoWeight || t.weight || '1,000 kg',
      status: t.status || 'PENDING_APPROVAL',
      progressPercent: Number(t.progressPercent ?? (t.status === 'DELIVERED' ? 100 : t.status === 'IN_TRANSIT' ? 50 : 0)),
      plannedDistance: t.plannedDistance || '45 km',
      completedDistance: t.completedDistance || (t.status === 'DELIVERED' ? t.plannedDistance : '15 km'),
      eta: t.eta || 'On Schedule',
      createdAt: t.createdAt || t.created_at,
    }));
  },

  async registerTrip(payload: {
    vehicleID: string;
    driverID: string;
    source: string;
    destination: string;
    cargoWeight?: string | number;
    distanceKm?: number;
    status?: string;
  }): Promise<Trip> {
    const response = await apiClient.post('/api/trip/create', {
      status: 'PENDING_APPROVAL',
      ...payload,
    });
    const data = response.data;
    return data?.serviceResult || data?.data || data?.trip || data;
  },

  async createTrip(payload: {
    vehicleID: string;
    driverID: string;
    source: string;
    destination: string;
    cargoWeight?: string | number;
    distanceKm?: number;
    status?: string;
  }): Promise<Trip> {
    return this.registerTrip(payload);
  },

  async updateTripStatus(
    tripID: string,
    status: string,
    extraData?: { finalOdometer?: string | number; fuelConsumed?: string | number }
  ): Promise<Trip> {
    const cleanId = encodeURIComponent(String(tripID || '').trim().replace(/^#/, ''));
    const response = await apiClient.put(`/api/trip/${cleanId}/status`, {
      status,
      ...extraData,
    });
    const data = response.data;
    return data?.serviceResult || data?.data || data?.trip || data;
  },

  async getDelayInsights(tripID: string): Promise<any> {
    const cleanId = encodeURIComponent(String(tripID || '').trim().replace(/^#/, ''));
    const response = await apiClient.get(`/api/trip/${cleanId}/delay-insights`);
    return response.data?.data || response.data?.serviceResult || response.data;
  },

  async getDestinationWeather(tripID: string, lat?: number, lon?: number): Promise<any> {
    const cleanId = encodeURIComponent(String(tripID || '').trim().replace(/^#/, ''));
    let url = `/api/trip/${cleanId}/destination-weather`;
    if (lat !== undefined && lon !== undefined) {
      url += `?lat=${lat}&lon=${lon}`;
    }
    const response = await apiClient.get(url);
    return response.data?.data || response.data?.serviceResult || response.data;
  },
};
