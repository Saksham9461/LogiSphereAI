import { create } from 'zustand';
import axios from '../api/axiosClient';
import { GetTrips, RegisterTrip, UpdateTripStatus, CancelTrip, CompleteTrip } from '../api/apiPath';

const extractList = (data: any) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.serviceResult)) return data.serviceResult;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.trips)) return data.trips;
  return [];
};

const extractItem = (data: any) => {
  if (!data) return null;
  if (data?.serviceResult && !Array.isArray(data.serviceResult)) return data.serviceResult;
  if (data?.data && !Array.isArray(data.data)) return data.data;
  return data;
};

const useTripStore = create<any>((set, get) => ({
  loading: false,
  trips: [],
  trip: null,
  error: null,

  registerTrip: async (payload: any) => {
    try {
      set({ loading: true, error: null });
      const tripPayload = { status: 'PENDING_APPROVAL', ...payload };
      const response = await axios.post(RegisterTrip, tripPayload);
      const data = extractItem(response.data);
      set((state: any) => ({
        loading: false,
        trip: data,
        trips: [data, ...state.trips].filter(Boolean),
      }));
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
          String(trip.tripID || trip.tripid || trip.id) === String(tripID) ? data : trip
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
