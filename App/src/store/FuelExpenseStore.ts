import { create } from 'zustand';
import axios from '../api/axiosClient';
import { GetFuel, RegisterFuel, GetExpenses, RegisterExpenses } from '../api/apiPath';

const extractList = (data: any) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.serviceResult)) return data.serviceResult;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.fuelLogs)) return data.fuelLogs;
  if (Array.isArray(data?.expenses)) return data.expenses;
  return [];
};

const extractItem = (data: any) => {
  if (!data) return null;
  if (data?.record) return data.record;
  if (data?.fuelLog) return data.fuelLog;
  if (data?.expense) return data.expense;
  if (data?.serviceResult && !Array.isArray(data.serviceResult)) return data.serviceResult;
  if (data?.data && !Array.isArray(data.data)) return data.data;
  return data;
};

export const normalizeFuelLog = (f: any) => {
  if (!f) return null;
  const fId = String(f.fuelLogId || f.fuellogid || f.id || Math.random());
  const vId = String(f.vehicleID || f.vehicleid || '');
  return {
    id: fId,
    fuelLogId: fId,
    vehicleID: vId,
    vehicle: String(f.vehicle || f.vehicleName || vId || 'Vehicle'),
    date: f.date ? String(f.date).slice(0, 10) : new Date().toISOString().slice(0, 10),
    liters: Number(f.liters) || 0,
    cost: Number(f.cost ?? f.fuelCost) || 0,
    createdAt: f.createdAt || f.createdat,
  };
};

export const normalizeExpense = (e: any) => {
  if (!e) return null;
  const eId = String(e.expenseId || e.expenseid || e.id || Math.random());
  const vId = String(e.vehicleID || e.vehicleid || '');
  const tId = String(e.tripID || e.tripid || e.trip || '');
  const tollVal = Number(e.toll) || 0;
  const otherVal = Number(e.other) || 0;
  const maintVal = Number(e.maint) || 0;
  return {
    id: eId,
    expenseId: eId,
    vehicleID: vId,
    tripID: tId,
    vehicle: String(e.vehicle || e.vehicleName || vId || 'Vehicle'),
    trip: tId,
    toll: tollVal,
    other: otherVal,
    maint: maintVal,
    total: tollVal + otherVal + maintVal,
    createdAt: e.createdAt || e.createdat,
  };
};

const useFuelExpenseStore = create<any>((set, get) => ({
  fuelLogs: [],
  expenses: [],
  loadingFuel: false,
  loadingExpenses: false,
  fuelError: null,
  expenseError: null,

  fetchFuelLogs: async () => {
    try {
      set({ loadingFuel: true, fuelError: null });
      const response = await axios.get(GetFuel);
      const rawList = extractList(response.data);
      const normalized = rawList.map(normalizeFuelLog).filter(Boolean);
      set({ loadingFuel: false, fuelLogs: normalized, fuelError: null });
      return { success: true, data: normalized };
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch fuel logs';
      set({ loadingFuel: false, fuelError: message });
      return { success: false, message };
    }
  },

  getFuelLogs: async () => get().fetchFuelLogs(),

  createFuelLog: async (payload: {
    vehicleID: string;
    date: string;
    liters: number;
    cost: number;
  }) => {
    try {
      set({ loadingFuel: true, fuelError: null });
      const response = await axios.post(RegisterFuel, payload);
      const rawItem = extractItem(response.data);
      const item = normalizeFuelLog(rawItem);

      set((state: any) => ({
        loadingFuel: false,
        fuelLogs: item ? [item, ...state.fuelLogs] : state.fuelLogs,
        fuelError: null,
      }));
      return { success: true, data: item };
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create fuel log';
      set({ loadingFuel: false, fuelError: message });
      return { success: false, message };
    }
  },

  addFuelLog: async (payload: any) => get().createFuelLog(payload),

  fetchExpenses: async () => {
    try {
      set({ loadingExpenses: true, expenseError: null });
      const response = await axios.get(GetExpenses);
      const rawList = extractList(response.data);
      const normalized = rawList.map(normalizeExpense).filter(Boolean);
      set({ loadingExpenses: false, expenses: normalized, expenseError: null });
      return { success: true, data: normalized };
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch expenses';
      set({ loadingExpenses: false, expenseError: message });
      return { success: false, message };
    }
  },

  getExpenses: async () => get().fetchExpenses(),

  createExpense: async (payload: {
    vehicleID: string;
    tripID?: string;
    toll: number;
    other: number;
    maint: number;
  }) => {
    try {
      set({ loadingExpenses: true, expenseError: null });
      const response = await axios.post(RegisterExpenses, payload);
      const rawItem = extractItem(response.data);
      const item = normalizeExpense(rawItem);

      set((state: any) => ({
        loadingExpenses: false,
        expenses: item ? [item, ...state.expenses] : state.expenses,
        expenseError: null,
      }));
      return { success: true, data: item };
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create expense record';
      set({ loadingExpenses: false, expenseError: message });
      return { success: false, message };
    }
  },

  addExpense: async (payload: any) => get().createExpense(payload),

  clearFuelExpenseStore: () =>
    set({
      fuelLogs: [],
      expenses: [],
      fuelError: null,
      expenseError: null,
    }),
}));

export default useFuelExpenseStore;
