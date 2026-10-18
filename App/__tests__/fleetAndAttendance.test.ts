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

import useVehicleStore from '../src/store/VehicleStore';
import useDriverStore from '../src/store/DriverStore';
import { useAttendanceStore } from '../src/store/AttendanceStore';
import { checkGeofence } from '../src/services/geofenceService';
import client from '../src/api/axiosClient';

jest.mock('../src/api/axiosClient', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
    put: jest.fn(),
  },
}));

describe('Frontend Module Tests: Fleet, Geofencing & Attendance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useVehicleStore.setState({ loading: false, vehicles: [], vehicle: null, error: null });
    useDriverStore.setState({ loading: false, drivers: [], driver: null, error: null });
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

  describe('Vehicle Store State Operations', () => {
    it('1. Fetches and parses vehicle registry list', async () => {
      const mockVehicles = [
        { vehicleID: 'veh-01', name: 'Van Alpha', type: 'VAN', status: 'AVAILABLE', maxLoadCapacity: 2000 },
        { vehicleID: 'veh-02', name: 'Truck Beta', type: 'TRUCK', status: 'IN_SHOP', maxLoadCapacity: 5000 },
      ];

      (client.get as jest.Mock).mockResolvedValueOnce({
        data: mockVehicles,
      });

      const res = await useVehicleStore.getState().getVehicles();

      expect(res.success).toBe(true);
      expect(useVehicleStore.getState().vehicles).toHaveLength(2);
      expect(useVehicleStore.getState().vehicles[0].name).toBe('Van Alpha');
    });

    it('2. Registers new vehicle and prepends it to store list', async () => {
      const newVehicle = {
        vehicleID: 'veh-03',
        name: 'Van Gamma',
        type: 'VAN',
        status: 'AVAILABLE',
        registrationNumber: 'GJ01AB1234',
      };

      (client.post as jest.Mock).mockResolvedValueOnce({
        data: { vehicle: newVehicle },
      });

      const res = await useVehicleStore.getState().registerVehicle(newVehicle);

      expect(res.success).toBe(true);
      expect(useVehicleStore.getState().vehicles[0].vehicleID).toBe('veh-03');
    });
  });

  describe('Geofence Verification & Distance Calculations', () => {
    it('3. Calculates inside geofence when coordinates are within authorized radius', () => {
      // Mock organization is at latitude 23.2156, longitude 72.6369, radius 500m
      const userLat = 23.2158;
      const userLon = 72.6370;

      const result = checkGeofence(userLat, userLon);

      expect(result.isInside).toBe(true);
      expect(result.distance).toBeLessThanOrEqual(result.requiredRadius);
      expect(result.organizationName).toBeDefined();
    });

    it('4. Calculates outside geofence when coordinates are distant from office', () => {
      // Distant coordinates
      const userLat = 23.5000;
      const userLon = 72.9000;

      const result = checkGeofence(userLat, userLon);

      expect(result.isInside).toBe(false);
      expect(result.distance).toBeGreaterThan(500);
    });
  });

  describe('Attendance Store Operations', () => {
    it('5. Successfully clocks in when location is within geofence', async () => {
      const mockRecord = {
        id: 'att-101',
        date: '18/10/2026',
        clockInTime: '09:00 AM',
        clockOutTime: null,
        locationName: 'Office Location',
        distanceFromOffice: 15,
        status: 'Verified Location',
      };

      (client.post as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          record: mockRecord,
        },
      });

      const res = await useAttendanceStore.getState().clockIn(23.2156, 72.6369, 15, 'Office Location');

      expect(res.success).toBe(true);
      expect(useAttendanceStore.getState().status).toBe('CLOCKED_IN');
      expect(useAttendanceStore.getState().clockInTime).toBe('09:00 AM');
      expect(useAttendanceStore.getState().error).toBeNull();
    });

    it('6. Rejects clock-in when server returns geofence violation', async () => {
      (client.post as jest.Mock).mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            message: 'You are 520m away from the office. Clock-in requires being within 500m.',
          },
        },
      });

      const res = await useAttendanceStore.getState().clockIn(23.5000, 72.9000, 520, 'Distant Location');

      expect(res.success).toBe(false);
      expect(useAttendanceStore.getState().status).toBe('NOT_CLOCKED_IN');
      expect(useAttendanceStore.getState().error).toContain('away from the office');
    });

    it('7. Successfully clocks out and updates status to NOT_CLOCKED_IN', async () => {
      useAttendanceStore.setState({
        status: 'CLOCKED_IN',
        clockInTime: '09:00 AM',
        distanceFromOffice: 15,
      });

      (client.post as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          record: {
            id: 'att-101',
            clockOutTime: '06:00 PM',
          },
        },
      });

      const res = await useAttendanceStore.getState().clockOut();

      expect(res.success).toBe(true);
      expect(useAttendanceStore.getState().status).toBe('NOT_CLOCKED_IN');
      expect(useAttendanceStore.getState().clockInTime).toBeNull();
    });
  });
});
