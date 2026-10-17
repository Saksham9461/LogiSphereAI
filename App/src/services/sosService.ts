import { Platform, PermissionsAndroid } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import client from '../api/axiosClient';
import { TriggerSOS } from '../api/apiPath';
import useTripStore from '../store/TripStore';
import useAuthStore from '../store/AuthStore';

import { offlineSOSQueue, QueuedSOSPayload } from './offlineSOSQueue';

export interface SOSLocationResult {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  capturedAt: string | null;
  locationStatus: 'PRECISE' | 'LAST_KNOWN' | 'UNAVAILABLE';
  error?: string;
}

export interface SOSPayload {
  clientRequestId?: string;
  userId?: string;
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  capturedAt?: string | null;
  locationStatus?: 'PRECISE' | 'LAST_KNOWN' | 'UNAVAILABLE';
  tripId?: string | null;
  vehicleId?: string | null;
  message?: string;
  createdAt?: string;
}

export interface TriggerSOSResult {
  success: boolean;
  alert?: any;
  queued?: boolean;
  clientRequestId?: string;
  error?: string;
  locationStatus?: string;
}

/**
 * Checks and requests location permission for emergency GPS capture.
 */
async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Emergency SOS Location Access',
          message: 'LogiSphere AI needs precise GPS access to transmit your emergency location to fleet dispatchers.',
          buttonPositive: 'Grant Permission',
          buttonNegative: 'Deny',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  }

  // iOS authorization
  return new Promise((resolve) => {
    try {
      Geolocation.requestAuthorization(
        () => resolve(true),
        () => resolve(false)
      );
    } catch {
      resolve(true);
    }
  });
}

/**
 * Captures fresh GPS coordinates for emergency SOS without hardcoding or mock values.
 * Handles timeouts and location errors gracefully.
 */
export async function captureSOSLocation(): Promise<SOSLocationResult> {
  const hasPermission = await requestLocationPermission();
  if (!hasPermission) {
    return {
      latitude: null,
      longitude: null,
      accuracy: null,
      capturedAt: null,
      locationStatus: 'UNAVAILABLE',
      error: 'Location permission denied by user',
    };
  }

  return new Promise((resolve) => {
    let resolved = false;

    // Safety timeout: Never block emergency dispatch for more than 6.5 seconds waiting for GPS
    const timeoutHandle = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve({
          latitude: null,
          longitude: null,
          accuracy: null,
          capturedAt: null,
          locationStatus: 'UNAVAILABLE',
          error: 'GPS location fix timed out',
        });
      }
    }, 6500);

    try {
      Geolocation.getCurrentPosition(
        (position) => {
          if (resolved) return;
          resolved = true;
          clearTimeout(timeoutHandle);

          const { latitude, longitude, accuracy } = position.coords;
          resolve({
            latitude,
            longitude,
            accuracy: accuracy ?? null,
            capturedAt: new Date(position.timestamp || Date.now()).toISOString(),
            locationStatus: 'PRECISE',
          });
        },
        (error) => {
          if (resolved) return;
          resolved = true;
          clearTimeout(timeoutHandle);

          console.warn('[SOS Location] getCurrentPosition error:', error.message);
          resolve({
            latitude: null,
            longitude: null,
            accuracy: null,
            capturedAt: null,
            locationStatus: 'UNAVAILABLE',
            error: error.message || 'GPS hardware unavailable',
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 6000,
          maximumAge: 5000,
        }
      );
    } catch (err: any) {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutHandle);
        resolve({
          latitude: null,
          longitude: null,
          accuracy: null,
          capturedAt: null,
          locationStatus: 'UNAVAILABLE',
          error: err?.message || 'Failed to initialize GPS provider',
        });
      }
    }
  });
}

/**
 * Triggers the emergency SOS alert directly against the authenticated backend.
 * Persists the alert in the database and broadcasts to managers in real-time.
 */
export const triggerSOSApi = async (customMessage?: string): Promise<TriggerSOSResult> => {
  // 1. Capture real GPS coordinates
  const location = await captureSOSLocation();

  // 2. Resolve active trip and vehicle if driver is currently on a trip
  const currentTrips = useTripStore.getState().trips || [];
  const currentUser = useAuthStore.getState().user;
  const currentUserId = currentUser?.id || currentUser?.userId;

  const activeTrip = currentTrips.find((t: any) => {
    const isDriver = String(t.driverID || t.driverid || '').toLowerCase() === String(currentUserId || '').toLowerCase();
    const rawStatus = String(t.status || '').toUpperCase();
    return isDriver && ['ON_TRIP', 'ON TRIP', 'ACCEPTED', 'DISPATCHED', 'IN_TRANSIT'].includes(rawStatus);
  });

  // 3. Generate a stable, unique clientRequestId for the SOS event
  const clientRequestId = `sos-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const nowIso = new Date().toISOString();

  const payload: QueuedSOSPayload = {
    clientRequestId,
    userId: currentUserId,
    latitude: location.latitude,
    longitude: location.longitude,
    accuracy: location.accuracy,
    capturedAt: location.capturedAt,
    locationStatus: location.locationStatus,
    tripId: activeTrip?.tripID || activeTrip?.id || null,
    vehicleId: activeTrip?.vehicleID || activeTrip?.vehicleid || null,
    message: customMessage || 'EMERGENCY SOS: Driver triggered emergency alert',
    createdAt: nowIso,
  };

  // 4. Immediately persist the pending SOS request in durable local storage before attempting network
  await offlineSOSQueue.enqueue({
    clientRequestId,
    driverId: String(currentUserId || 'unknown_driver'),
    payload,
    createdAt: nowIso,
    retryCount: 0,
    status: 'PENDING_SYNC',
  });

  console.log('🚨 Dispatching emergency SOS to backend (durable queue saved):', payload);

  // 5. If device is online, submit the request using the existing SOS API
  try {
    const response = await client.post(TriggerSOS, payload);
    const data = response?.data;

    if (response.status === 200 || response.status === 201 || (data?.success && data?.alert)) {
      // Server confirmed persistence: safely remove from the pending queue
      await offlineSOSQueue.dequeue(clientRequestId);
      return {
        success: true,
        alert: data.alert,
        queued: false,
        clientRequestId,
        locationStatus: location.locationStatus,
      };
    }

    // Server returned failure or validation error: retain in queue
    return {
      success: false,
      queued: true,
      clientRequestId,
      error: data?.message || 'Server rejected emergency SOS registration',
      locationStatus: location.locationStatus,
    };
  } catch (error: any) {
    const isNetworkError = !error?.response || error?.message === 'Network Error' || error?.code === 'ECONNABORTED';
    const errMsg = isNetworkError
      ? 'No internet connection. SOS saved and will be sent automatically when connectivity returns.'
      : error?.response?.data?.message || error?.message || 'Unable to transmit emergency alert to dispatch';

    console.warn('🚨 Emergency SOS network transmission failed, retained in durable queue:', errMsg);

    return {
      success: false,
      queued: true,
      clientRequestId,
      error: errMsg,
      locationStatus: location.locationStatus,
    };
  }
};
