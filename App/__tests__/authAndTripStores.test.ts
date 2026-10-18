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

import useAuthStore from '../src/store/AuthStore';
import useTripStore from '../src/store/TripStore';
import { tokenStorage } from '../src/services/storage/tokenStorage';
import client from '../src/api/axiosClient';

jest.mock('../src/api/axiosClient', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('Frontend Module Tests: AuthStore & TripStore', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await tokenStorage.clearSession();
    useAuthStore.setState({
      authStatus: 'unauthenticated',
      loading: false,
      user: null,
      token: null,
      error: null,
    });
    useTripStore.setState({
      loading: false,
      trips: [],
      trip: null,
      error: null,
      currentUser: null,
    });
  });

  describe('Authentication and Session Persistence', () => {
    it('1. Authenticates successfully and stores user session when rememberMe is true', async () => {
      const mockUser = {
        id: 'usr-manager-test',
        name: 'Manager Test',
        email: 'manager@logisphere.ai',
        role: 'ROLE_MANAGER',
      };
      const mockToken = 'mock-jwt-token-12345';

      (client.post as jest.Mock).mockResolvedValueOnce({
        data: {
          token: mockToken,
          user: mockUser,
        },
      });

      const res = await useAuthStore.getState().login('manager@logisphere.ai', 'Secret123!', 'ROLE_MANAGER', true);

      expect(res.success).toBe(true);
      expect(res.data.name).toBe('Manager Test');
      expect(useAuthStore.getState().authStatus).toBe('authenticated');
      expect(useAuthStore.getState().token).toBe(mockToken);
      expect(useAuthStore.getState().user).toEqual(mockUser);

      // Verify session persistence in storage
      const savedToken = await tokenStorage.getToken();
      const savedUser = await tokenStorage.getUser();
      const isRemembered = await tokenStorage.getRememberMe();

      expect(savedToken).toBe(mockToken);
      expect(savedUser).toEqual(mockUser);
      expect(isRemembered).toBe(true);
    });

    it('2. Discards stored session on logout', async () => {
      await tokenStorage.setToken('existing-token', true);
      await tokenStorage.setUser({ id: 'usr-123', name: 'Test' }, true);
      await tokenStorage.setRememberMe(true);

      useAuthStore.setState({
        authStatus: 'authenticated',
        token: 'existing-token',
        user: { id: 'usr-123' },
      });

      await useAuthStore.getState().logout();

      expect(useAuthStore.getState().authStatus).toBe('unauthenticated');
      expect(useAuthStore.getState().token).toBeNull();
      expect(useAuthStore.getState().user).toBeNull();

      const savedToken = await tokenStorage.getToken();
      expect(savedToken).toBeNull();
    });

    it('3. Clears session on hydrate if rememberMe was false', async () => {
      await tokenStorage.setToken('temp-token', false);
      await tokenStorage.setUser({ id: 'usr-456' }, false);
      await tokenStorage.setRememberMe(false);

      await useAuthStore.getState().hydrate();

      expect(useAuthStore.getState().authStatus).toBe('unauthenticated');
      expect(useAuthStore.getState().token).toBeNull();
    });

    it('4. Handles login API rejection and sets error state', async () => {
      (client.post as jest.Mock).mockRejectedValueOnce({
        response: {
          data: {
            message: 'Invalid email or password',
          },
        },
      });

      const res = await useAuthStore.getState().login('bad@test.com', 'wrong', 'ROLE_DRIVER', false);

      expect(res.success).toBe(false);
      expect(useAuthStore.getState().authStatus).toBe('unauthenticated');
      expect(useAuthStore.getState().error).toBe('Invalid email or password');
    });
  });

  describe('Trip State Management and Lifecycle Normalization', () => {
    it('5. Normalizes and loads trips from backend response', async () => {
      const backendTrips = [
        {
          tripid: 'TRP-101',
          source: 'Ahmedabad Port',
          destination: 'Mumbai Hub',
          status: 'ACCEPTED',
          vehicleid: 'veh-01',
          driverid: 'drv-01',
          cargoweight: 1200,
        },
        {
          id: 'TRP-102',
          source: 'Delhi Depot',
          destination: 'Jaipur Center',
          status: 'PENDING_APPROVAL',
          vehicleID: 'veh-02',
          driverID: 'drv-02',
          cargoWeight: 800,
        },
      ];

      (client.get as jest.Mock).mockResolvedValueOnce({
        data: backendTrips,
      });

      const res = await useTripStore.getState().getTrips();

      expect(res.success).toBe(true);
      const loadedTrips = useTripStore.getState().trips;
      expect(loadedTrips).toHaveLength(2);
      expect(loadedTrips[0].tripID).toBe('TRP-101');
      expect(loadedTrips[0].cargoWeight).toBe(1200);
      expect(loadedTrips[1].tripID).toBe('TRP-102');
      expect(loadedTrips[1].status).toBe('PENDING_APPROVAL');
    });

    it('6. Updates trip status optimistically and syncs with backend', async () => {
      useTripStore.setState({
        trips: [
          {
            tripID: 'TRP-200',
            status: 'ACCEPTED',
            source: 'Warehouse A',
            destination: 'Warehouse B',
          },
        ],
      });

      (client.put as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          tripID: 'TRP-200',
          status: 'IN_TRANSIT',
        },
      });

      const res = await useTripStore.getState().updateTripStatus('TRP-200', 'IN_TRANSIT');

      expect(res.success).toBe(true);
      const updated = useTripStore.getState().trips.find((t: any) => t.tripID === 'TRP-200');
      expect(updated.status).toBe('IN_TRANSIT');
    });

    it('7. Rejects trip creation when cargo weight exceeds payload capacity', async () => {
      (client.post as jest.Mock).mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            message: 'Cargo weight 3500kg exceeds vehicle maximum payload capacity of 2000kg',
          },
        },
      });

      const res = await useTripStore.getState().registerTrip({
        source: 'Location A',
        destination: 'Location B',
        vehicleID: 'veh-van-01',
        driverID: 'drv-01',
        cargoWeight: 3500,
      });

      expect(res.success).toBe(false);
      expect(useTripStore.getState().error).toContain('exceeds vehicle maximum payload');
    });
  });
});
