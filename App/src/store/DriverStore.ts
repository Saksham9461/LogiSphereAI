import {create} from 'zustand';
import axios from '../api/axiosClient';
import {DeleteDriver, GetDrivers, RegisterDriver, UpdateDriver} from '../api/apiPath';

const extractList = (data: any) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.serviceResult)) return data.serviceResult;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.drivers)) return data.drivers;
  if (Array.isArray(data?.users)) return data.users;
  return [];
};

const extractItem = (data: any) => {
  if (!data) return null;
  if (data?.user) return data.user;
  if (data?.driver) return data.driver;
  if (data?.serviceResult && !Array.isArray(data.serviceResult)) return data.serviceResult;
  if (data?.data && !Array.isArray(data.data)) return data.data;
  return data;
};

const useDriverStore = create<any>((set, get) => ({
  loading: false,
  drivers: [],
  driver: null,
  error: null,

  fetchDrivers: async () => {
    try {
      set({loading: true, error: null});
      const response = await axios.get(GetDrivers, {params: {role: 'ROLE_DRIVER'}});
      const list = extractList(response.data);
      set({loading: false, drivers: list, error: null});
      return {success: true, data: list};
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch drivers';
      set({loading: false, error: message});
      return {success: false, message};
    }
  },

  getDrivers: async () => get().fetchDrivers(),

  registerDriver: async (payload: any) => {
    try {
      set({loading: true, error: null});
      const response = await axios.post(RegisterDriver, payload);
      const item = extractItem(response.data);
      const credentials = response.data?.credentials || response.data?.serviceResult?.credentials;
      set((state: any) => ({
        loading: false,
        driver: item,
        drivers: item && (item.id || item.driverID)
          ? [item, ...state.drivers.filter((d: any) => (d.id || d.driverID) !== (item.id || item.driverID))]
          : state.drivers,
        error: null,
      }));
      return {success: true, data: item, credentials};
    } catch (error: any) {
      const message = error.response?.data?.message || 'Driver registration failed';
      set({loading: false, error: message});
      return {success: false, message};
    }
  },

  addDriver: async (payload: any) => get().registerDriver(payload),

  updateDriver: async (id: string, payload: any) => {
    try {
      set({loading: true, error: null});
      const response = await axios.put(UpdateDriver, payload, {params: {id}});
      const data = extractItem(response.data) || response.data;
      set((state: any) => ({
        loading: false,
        drivers: state.drivers.map((driver: any) =>
          (driver.id === id || driver.driverID === id || driver.userID === id) ? data : driver
        ),
        error: null,
      }));
      return {success: true, data};
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update driver';
      set({loading: false, error: message});
      return {success: false, message};
    }
  },

  deleteDriver: async (id: string) => {
    try {
      set({loading: true, error: null});
      await axios.delete(DeleteDriver, {params: {id}});
      set((state: any) => ({
        loading: false,
        drivers: state.drivers.filter((driver: any) =>
          driver.id !== id && driver.driverID !== id && driver.userID !== id
        ),
        error: null,
      }));
      return {success: true};
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete driver';
      set({loading: false, error: message});
      return {success: false, message};
    }
  },

  clearDriver: () => set({driver: null, error: null}),
}));

export default useDriverStore;
