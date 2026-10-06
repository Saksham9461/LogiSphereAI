import {create} from 'zustand';
import axios from '../api/axiosClient';
import {DeleteVehicle, GetVehicles, RegisterVehicle, UpdateVehicle} from '../api/apiPath';

const extractList = (data: any) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.serviceResult)) return data.serviceResult;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.vehicles)) return data.vehicles;
  return [];
};

const extractItem = (data: any) => {
  if (!data) return null;
  if (data?.vehicle) return data.vehicle;
  if (data?.serviceResult && !Array.isArray(data.serviceResult)) return data.serviceResult;
  if (data?.data && !Array.isArray(data.data)) return data.data;
  return data;
};

const useVehicleStore = create<any>(set => ({
  loading: false,
  vehicles: [],
  vehicle: null,
  error: null,

  registerVehicle: async (payload: any) => {
    try {
      set({loading: true, error: null});
      const response = await axios.post(RegisterVehicle, payload);
      const item = extractItem(response.data);
      set((state: any) => ({
        loading: false,
        vehicle: item,
        vehicles: item && item.vehicleID ? [item, ...state.vehicles.filter((v: any) => v.vehicleID !== item.vehicleID)] : state.vehicles,
        error: null,
      }));
      return {success: true, data: item};
    } catch (error: any) {
      const message = error.response?.data?.message || 'Vehicle registration failed';
      set({loading: false, error: message});
      return {success: false, message};
    }
  },

  getVehicles: async () => {
    try {
      set({loading: true, error: null});
      const response = await axios.get(GetVehicles);
      set({loading: false, vehicles: extractList(response.data)});
      return {success: true, data: response.data};
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch vehicles';
      set({loading: false, error: message});
      return {success: false, message};
    }
  },

  deleteVehicle: async (id: string, confirm?: boolean) => {
    try {
      set({ loading: true, error: null });
      const response = await axios.delete(DeleteVehicle, { params: { id, confirm } });
      set((state: any) => ({
        loading: false,
        vehicles: state.vehicles.filter((vehicle: any) => vehicle.vehicleID !== id),
        error: null,
      }));
      return { success: true, message: response.data?.message };
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete vehicle';
      const requiresConfirmation = Boolean(error.response?.data?.requiresConfirmation);
      const historicalRecordsCount = error.response?.data?.historicalRecordsCount;
      set({ loading: false, error: message });
      return {
        success: false,
        message,
        requiresConfirmation,
        historicalRecordsCount,
      };
    }
  },

  updateVehicle: async (id: string, payload: any) => {
    try {
      set({loading: true, error: null});
      const response = await axios.put(UpdateVehicle, payload, {params: {id}});
      const data = extractItem(response.data) || response.data;
      set((state: any) => ({
        loading: false,
        vehicles: state.vehicles.map((vehicle: any) => (vehicle.vehicleID === id ? data : vehicle)),
        error: null,
      }));
      return {success: true, data};
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update vehicle';
      set({loading: false, error: message});
      return {success: false, message};
    }
  },

  clearVehicle: () => set({vehicle: null, error: null}),
}));

export default useVehicleStore;

