import { create } from 'zustand';
import axios from '../api/axiosClient';
import { GetTrips, RegisterTrip, UpdateTripStatus } from '../api/apiPath';
import { subscribeToTripRealtime, unsubscribeFromTripRealtime, normalizeTrip } from '../services/tripRealtimeService';

const extractList = (data: any) => {
  if (Array.isArray(data)) return data.map(normalizeTrip);
  if (Array.isArray(data?.serviceResult)) return data.serviceResult.map(normalizeTrip);
  if (Array.isArray(data?.data)) return data.data.map(normalizeTrip);
  if (Array.isArray(data?.trips)) return data.trips.map(normalizeTrip);
  return [];
};

const extractItem = (data: any) => {
  if (!data) return null;
  let raw = data;
  if (data?.serviceResult && !Array.isArray(data.serviceResult)) raw = data.serviceResult;
  else if (data?.data && !Array.isArray(data.data)) raw = data.data;
  return normalizeTrip(raw);
};

const useTripStore = create<any>((set, get) => ({
  loading: false,
  trips: [],
  trip: null,
  error: null,
  currentUser: null,

  initRealtimeSubscription: (user: any) => {
    if (!user) return;
    set({ currentUser: user });
    const currentUserId = String(user.id || user.userId || user.driverID || '');
    const userRole = String(user.role || '');

    subscribeToTripRealtime(user, (eventType, newRow, oldRow) => {
      const tripId = String(newRow.tripID || newRow.tripid || newRow.id || oldRow.tripID || oldRow.tripid || oldRow.id || '');
      if (!tripId) return;

      const normNew = normalizeTrip(newRow);
      const normOld = normalizeTrip(oldRow);

      if (eventType === 'INSERT') {
        set((state: any) => {
          const exists = state.trips.some(
            (t: any) => String(t.tripID || t.tripid || t.id) === tripId
          );
          if (exists) {
            return {
              trips: state.trips.map((t: any) =>
                String(t.tripID || t.tripid || t.id) === tripId ? { ...t, ...normNew } : t
              ),
            };
          }
          return { trips: [normNew, ...state.trips] };
        });
      } else if (eventType === 'UPDATE') {
        set((state: any) => {
          const existingIndex = state.trips.findIndex(
            (t: any) => String(t.tripID || t.tripid || t.id) === tripId
          );

          const newDriverId = String(normNew.driverID || '');
          const oldDriverId = String(normOld.driverID || '');
          const isDriver = userRole === 'ROLE_DRIVER';

          // Reassignment AWAY check for driver
          if (isDriver && newDriverId !== currentUserId && (existingIndex !== -1 || oldDriverId === currentUserId)) {
            console.log(`[Trip Realtime] Trip ${tripId} reassigned away from driver ${currentUserId}. Removing from local state.`);
            return {
              trips: state.trips.filter(
                (t: any) => String(t.tripID || t.tripid || t.id) !== tripId
              ),
            };
          }

          if (existingIndex !== -1) {
            const updatedTrips = [...state.trips];
            updatedTrips[existingIndex] = { ...updatedTrips[existingIndex], ...normNew };
            return { trips: updatedTrips };
          } else if (!isDriver || newDriverId === currentUserId) {
            return { trips: [normNew, ...state.trips] };
          }

          return state;
        });
      } else if (eventType === 'DELETE') {
        set((state: any) => ({
          trips: state.trips.filter(
            (t: any) => String(t.tripID || t.tripid || t.id) !== tripId
          ),
        }));
      }
    });
  },

  unsubscribeRealtime: () => {
    unsubscribeFromTripRealtime();
    set({ currentUser: null });
  },

  registerTrip: async (payload: any) => {
    try {
      console.log('[Trip] Creating trip...');
      set({ loading: true, error: null });
      const tripPayload = { status: 'PENDING_APPROVAL', ...payload };
      const response = await axios.post(RegisterTrip, tripPayload);
      const data = extractItem(response.data);
      const tripId = data?.tripID || data?.tripid || data?.id || 'unknown';
      console.log(`[Trip] Trip created: ${tripId}`);
      set((state: any) => {
        const exists = state.trips.some(
          (t: any) => String(t.tripID || t.tripid || t.id) === String(tripId)
        );
        if (exists) return { loading: false, trip: data };
        return {
          loading: false,
          trip: data,
          trips: [data, ...state.trips].filter(Boolean),
        };
      });
      return { success: true, data };
    } catch (error: any) {
      const message = error.response?.data?.message || 'Trip creation failed';
      set({ loading: false, error: message });
      return { success: false, message };
    }
  },

  getTrips: async () => {
    try {
      set({ loading: true, error: null });
      const response = await axios.get(GetTrips);
      const list = extractList(response.data);
      set({ loading: false, trips: list, error: null });
      return { success: true, data: list };
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch trips';
      set({ loading: false, error: message });
      return { success: false, message };
    }
  },

  updateTripStatus: async (tripID: string, status: string, extraData?: any) => {
    try {
      set({ loading: true, error: null });
      const response = await axios.put(`${UpdateTripStatus}/${tripID}/status`, {
        status,
        ...extraData,
      });
      const data = extractItem(response.data);
      set((state: any) => ({
        loading: false,
        trips: state.trips.map((trip: any) =>
          String(trip.tripID || trip.tripid || trip.id) === String(tripID) ? { ...trip, ...data } : trip
        ),
      }));
      return { success: true, data };
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update trip status';
      set({ loading: false, error: message });
      return { success: false, message };
    }
  },

  acceptTrip: async (tripID: string) => {
    return get().updateTripStatus(tripID, 'ACCEPTED');
  },

  rejectTrip: async (tripID: string) => {
    return get().updateTripStatus(tripID, 'REJECTED');
  },

  startPickupNavigation: async (tripID: string) => {
    return get().updateTripStatus(tripID, 'GOING_TO_PICKUP');
  },

  markArrivedAtPickup: async (tripID: string) => {
    return get().updateTripStatus(tripID, 'ARRIVED_AT_PICKUP');
  },

  confirmPickup: async (tripID: string) => {
    return get().updateTripStatus(tripID, 'PICKED_UP');
  },

  startDelivery: async (tripID: string) => {
    return get().updateTripStatus(tripID, 'IN_TRANSIT');
  },

  markArrivedAtDrop: async (tripID: string) => {
    return get().updateTripStatus(tripID, 'ARRIVED_AT_DROP');
  },

  confirmDelivery: async (tripID: string, finalOdometer?: string, fuelConsumed?: string) => {
    return get().updateTripStatus(tripID, 'DELIVERED', { finalOdometer, fuelConsumed });
  },

  completeTrip: async (tripID: string, finalOdometer?: string, fuelConsumed?: string) => {
    return get().updateTripStatus(tripID, 'DELIVERED', { finalOdometer, fuelConsumed });
  },

  cancelTrip: async (tripID: string, finalOdometer?: string, fuelConsumed?: string) => {
    return get().updateTripStatus(tripID, 'CANCELLED', { finalOdometer, fuelConsumed });
  },

  clearTrip: () => set({ trip: null, error: null }),
}));

export default useTripStore;
