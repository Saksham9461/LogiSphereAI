import { getCurrentLocation } from './locationService';
import { checkGeofence } from './geofenceService';
import { useAttendanceStore } from '../store/AttendanceStore';
import useTripStore from '../store/TripStore';
import useAuthStore from '../store/AuthStore';

export const ACTIVE_TRIP_STATUSES = [
  'ACCEPTED',
  'ASSIGNED',
  'DISPATCHED',
  'GOING_TO_PICKUP',
  'ARRIVED_AT_PICKUP',
  'PICKED_UP',
  'IN_TRANSIT',
  'ARRIVED_AT_DROP',
];

export const getActiveTripForDriver = async (providedUserId?: string) => {
  const user = useAuthStore.getState().user;
  const targetUserId = String(providedUserId || user?.id || user?.userId || '').toLowerCase();
  if (!targetUserId) return null;

  // 1. Check local TripStore state first
  const tripList = useTripStore.getState().trips || [];
  const foundInStore = tripList.find((t: any) => {
    const dId = String(t.driverID || t.driverid || '').toLowerCase();
    const status = String(t.status || '').toUpperCase();
    return dId === targetUserId && ACTIVE_TRIP_STATUSES.includes(status);
  });
  if (foundInStore) return foundInStore;

  // 2. Check AttendanceStore.activeTrip
  const storeActiveTrip = useAttendanceStore.getState().activeTrip;
  if (storeActiveTrip && ACTIVE_TRIP_STATUSES.includes(String(storeActiveTrip.status || '').toUpperCase())) {
    return storeActiveTrip;
  }

  // 3. Fallback: Query backend directly
  try {
    const res = await useAttendanceStore.getState().fetchActiveTrip();
    if (res?.hasActiveTrip && res.trip) {
      return res.trip;
    }
  } catch (_) {}

  return null;
};

export const handleClockIn = async (
  exceptionData?: { locationDescription?: string; tripId?: string },
  preAcquiredLocation?: { latitude: number; longitude: number; accuracy?: number }
) => {
  const store = useAttendanceStore.getState();
  store.setStatus('CHECKING_LOCATION');

  try {
    // 1. Get device location (use pre-acquired or acquire fresh balanced location)
    const location = preAcquiredLocation || (await getCurrentLocation());
    
    // 2. Authoritative geofence validation is executed by backend against driver's registered organization
    const res = await store.clockIn(location.latitude, location.longitude, undefined, undefined, exceptionData);
    if (res.success) {
      return { success: true, data: res.data, isException: res.data?.isException };
    } else {
      store.setStatus('NOT_CLOCKED_IN');
      return {
        success: false,
        data: res.errorData || res.data,
        error: res.message || 'Clock in rejected by backend server',
      };
    }
  } catch (error: any) {
    store.setStatus('NOT_CLOCKED_IN');
    const msg = error?.response?.data?.message || error?.message || 'LOCATION_UNAVAILABLE';
    return { success: false, error: msg };
  }
};

export const handleClockOut = async (
  exceptionData?: { locationDescription?: string; tripId?: string },
  preAcquiredLocation?: { latitude: number; longitude: number; accuracy?: number } | null
) => {
  const store = useAttendanceStore.getState();
  try {
    // 1. Acquire device location for clock-out verification if not pre-provided
    let location: { latitude: number; longitude: number } | null = preAcquiredLocation ?? null;
    if (!location) {
      try {
        location = await getCurrentLocation();
      } catch (locErr) {
        console.warn('[AttendanceService] Clock-out location acquisition skipped:', locErr);
      }
    }

    // 2. Submit Clock Out request with coordinates and optional exceptionData
    const res = await store.clockOut(location?.latitude, location?.longitude, exceptionData);
    return res;
  } catch (error: any) {
    const msg = error?.response?.data?.message || error?.message || 'Clock out failed';
    return { success: false, message: msg };
  }
};

export const fetchAttendanceStatus = async () => {
  const store = useAttendanceStore.getState();
  return store.fetchStatus();
};

