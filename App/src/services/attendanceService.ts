import { getCurrentLocation, MOCK_ORGANIZATION } from './locationService';
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
      // 3. Success: Clock In
      store.clockIn(location.latitude, location.longitude, result.distance, result.organizationName);
      return { success: true, data: result };
    } else {
      // 4. Failure: Outside Geofence
      store.setStatus('NOT_CLOCKED_IN'); // Revert status
      return { success: false, data: result, error: 'OUTSIDE_GEOFENCE' };
    }
  } catch (error) {
    store.setStatus('NOT_CLOCKED_IN');
    return { success: false, error: 'LOCATION_UNAVAILABLE' };
  }
};

export const handleClockOut = async () => {
  const store = useAttendanceStore.getState();
  store.clockOut();
  return { success: true };
};
