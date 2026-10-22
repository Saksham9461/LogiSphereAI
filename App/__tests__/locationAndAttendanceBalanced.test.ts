/* eslint-disable import/first */
jest.mock('react-native-url-polyfill/auto', () => {});
jest.mock('@maplibre/maplibre-react-native', () => ({}));
jest.mock('../src/services/supabaseClient', () => ({
  supabase: {
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    })),
  },
}));

import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { getCurrentLocation, requestLocationPermission } from '../src/services/locationService';
import { checkGeofence } from '../src/services/geofenceService';
import { handleClockIn, handleClockOut } from '../src/services/attendanceService';
import { useAttendanceStore } from '../src/store/AttendanceStore';
import client from '../src/api/axiosClient';

jest.mock('@react-native-community/geolocation', () => ({
  getCurrentPosition: jest.fn(),
  requestAuthorization: jest.fn(),
}));

jest.mock('../src/api/axiosClient', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
    put: jest.fn(),
  },
}));

describe('Balanced Location Acquisition & Geofence Verification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAttendanceStore.setState({
      status: 'NOT_CLOCKED_IN',
      clockInTime: null,
      latitude: null,
      longitude: null,
      distanceFromOffice: null,
      history: [],
      loading: false,
      error: null,
    });
  });

  describe('Android Permissions Handling', () => {
    it('1. Accepts when coarse location permission is granted without demanding fine location', async () => {
      Platform.OS = 'android';
      jest.spyOn(PermissionsAndroid, 'check').mockImplementation(async (perm) => {
        if (perm === PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION) return true;
        return false;
      });

      const granted = await requestLocationPermission();
      expect(granted).toBe(true);
    });

    it('2. Requests multiple permissions (fine and coarse) if neither is currently granted', async () => {
      Platform.OS = 'android';
      jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(false);
      const requestMultipleSpy = jest.spyOn(PermissionsAndroid, 'requestMultiple').mockResolvedValue({
        [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION]: PermissionsAndroid.RESULTS.DENIED,
        [PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION]: PermissionsAndroid.RESULTS.GRANTED,
      });

      const granted = await requestLocationPermission();
      expect(requestMultipleSpy).toHaveBeenCalled();
      expect(granted).toBe(true);
    });

    it('3. Returns false if both coarse and fine permissions are denied', async () => {
      Platform.OS = 'android';
      jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(false);
      jest.spyOn(PermissionsAndroid, 'requestMultiple').mockResolvedValue({
        [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION]: PermissionsAndroid.RESULTS.DENIED,
        [PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION]: PermissionsAndroid.RESULTS.DENIED,
      });

      const granted = await requestLocationPermission();
      expect(granted).toBe(false);
    });
  });

  describe('Location Acquisition Options & Fallback', () => {
    it('4. Uses enableHighAccuracy: false by default for balanced location fix', async () => {
      Platform.OS = 'android';
      jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(true);

      (Geolocation.getCurrentPosition as jest.Mock).mockImplementation((success) => {
        success({
          coords: {
            latitude: 23.2156,
            longitude: 72.6369,
            accuracy: 35,
          },
          timestamp: Date.now(),
        });
      });

      const loc = await getCurrentLocation();
      expect(loc.latitude).toBe(23.2156);
      expect(loc.longitude).toBe(72.6369);
      expect(loc.accuracy).toBe(35);

      const passedOptions = (Geolocation.getCurrentPosition as jest.Mock).mock.calls[0][2];
      expect(passedOptions.enableHighAccuracy).toBe(false);
      expect(passedOptions.timeout).toBeGreaterThanOrEqual(10000);
    });

    it('5. Falls back to cached position when fresh acquisition times out', async () => {
      Platform.OS = 'android';
      jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(true);

      // 1st call (fresh acquisition) times out; 2nd call (cached fallback) returns cached fix
      let callCount = 0;
      (Geolocation.getCurrentPosition as jest.Mock).mockImplementation((success, error, options) => {
        callCount++;
        if (callCount === 1) {
          error({ code: 3, message: 'Location fix timed out.' });
        } else {
          success({
            coords: {
              latitude: 23.2158,
              longitude: 72.6370,
              accuracy: 45,
            },
            timestamp: Date.now() - 30000,
          });
        }
      });

      const loc = await getCurrentLocation({ allowCachedFallback: true });
      expect(loc.latitude).toBe(23.2158);
      expect(loc.isCached).toBe(true);
      expect(callCount).toBe(2);
    });
  });

  describe('Attendance Geofencing with Balanced Coordinates', () => {
    it('6. Allows clock-in when balanced location coordinates are within geofence radius', async () => {
      const targetOrg = {
        name: 'Depot A',
        latitude: 23.2156,
        longitude: 72.6369,
        geofenceRadius: 200,
      };

      // 50 meters away
      const driverLat = 23.2158;
      const driverLon = 23.2158; // approx distance check
      const geoCheck = checkGeofence(23.2157, 72.6369, targetOrg);
      expect(geoCheck.isInside).toBe(true);
      expect(geoCheck.distance).toBeLessThanOrEqual(200);

      (client.post as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          status: 'CLOCKED_IN',
          record: {
            id: 'att-balanced-1',
            date: '22/10/2026',
            clockInTime: '10:00 AM',
            clockOutTime: null,
            locationName: 'Depot A',
            distanceFromOffice: geoCheck.distance,
          },
        },
      });

      const result = await handleClockIn(undefined, { latitude: 23.2157, longitude: 72.6369, accuracy: 40 });
      expect(result.success).toBe(true);
      expect(useAttendanceStore.getState().status).toBe('CLOCKED_IN');
    });

    it('7. Rejects clock-in when driver coordinates are genuine outside geofence boundary', async () => {
      const targetOrg = {
        name: 'Depot A',
        latitude: 23.2156,
        longitude: 72.6369,
        geofenceRadius: 200,
      };

      // 30km away
      const geoCheck = checkGeofence(23.5000, 72.9000, targetOrg);
      expect(geoCheck.isInside).toBe(false);
      expect(geoCheck.distance).toBeGreaterThan(200);

      (client.post as jest.Mock).mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            message: 'You are outside the authorized geofence boundary',
          },
        },
      });

      const result = await handleClockIn(undefined, { latitude: 23.5000, longitude: 72.9000, accuracy: 50 });
      expect(result.success).toBe(false);
      expect(result.error).toContain('outside the authorized geofence');
    });
  });
});
