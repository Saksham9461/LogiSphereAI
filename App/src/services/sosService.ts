import { Platform, PermissionsAndroid } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import client from '../api/axiosClient';
import { TriggerSOS } from '../api/apiPath';
import useTripStore from '../store/TripStore';
import useAuthStore from '../store/AuthStore';

export interface SOSLocationResult {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  capturedAt: string | null;
  locationStatus: 'PRECISE' | 'LAST_KNOWN' | 'UNAVAILABLE';
  error?: string;
}

export interface SOSPayload {
  userId?: string;
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  capturedAt?: string | null;
  locationStatus?: 'PRECISE' | 'LAST_KNOWN' | 'UNAVAILABLE';
  tripId?: string | null;
  vehicleId?: string | null;
  message?: string;
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
export const triggerSOSApi = async (customMessage?: string): Promise<{
  success: boolean;
  alert?: any;
  error?: string;
  locationStatus?: string;
}> => {
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

  const payload: SOSPayload = {
    userId: currentUserId,
    latitude: location.latitude,
    longitude: location.longitude,
    accuracy: location.accuracy,
    capturedAt: location.capturedAt,
    locationStatus: location.locationStatus,
    tripId: activeTrip?.tripID || activeTrip?.id || null,
    vehicleId: activeTrip?.vehicleID || activeTrip?.vehicleid || null,
    message: customMessage || 'EMERGENCY SOS: Driver triggered emergency alert',
  };

  console.log('🚨 Dispatching real emergency SOS to backend:', payload);

  try {
    const response = await client.post(TriggerSOS, payload);
    const data = response.data;

    if (data?.success && data?.alert) {
      return {
        success: true,
        alert: data.alert,
        locationStatus: location.locationStatus,
      };
    }

    return {
      success: false,
      error: data?.message || 'Server rejected emergency SOS registration',
      locationStatus: location.locationStatus,
    };
  } catch (error: any) {
    const errMsg = error?.response?.data?.message || error?.message || 'Network error reaching emergency dispatch server';
    console.error('🚨 Emergency SOS failed:', errMsg);
    return {
      success: false,
      error: errMsg,
      locationStatus: location.locationStatus,
    };
  }
};
