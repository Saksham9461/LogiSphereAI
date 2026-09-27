import { getCurrentLocation } from './locationService';
import { checkGeofence } from './geofenceService';
import { useAttendanceStore } from '../store/AttendanceStore';

export const handleClockIn = async () => {
  const store = useAttendanceStore.getState();
  store.setStatus('CHECKING_LOCATION');

  try {
    // 1. Get current actual GPS location
    const location = await getCurrentLocation();
    
    // 2. Calculate distance and check geofence
    const result = checkGeofence(location.latitude, location.longitude);
    
    if (result.isInside) {
      // 3. Send Clock In request to backend
      const res = await store.clockIn(location.latitude, location.longitude, result.distance, result.organizationName);
      if (res.success) {
        return { success: true, data: result };
      } else {
        return {
          success: false,
          data: result,
          error: res.message || 'Clock in rejected by backend server',
        };
      }
    } else {
      // 4. Failure: Outside Geofence
      store.setStatus('NOT_CLOCKED_IN');
      return { success: false, data: result, error: 'OUTSIDE_GEOFENCE' };
    }
  } catch (error: any) {
    store.setStatus('NOT_CLOCKED_IN');
    const msg = error?.response?.data?.message || error?.message || 'LOCATION_UNAVAILABLE';
    return { success: false, error: msg };
  }
};

export const handleClockOut = async () => {
  const store = useAttendanceStore.getState();
  try {
    const res = await store.clockOut();
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

