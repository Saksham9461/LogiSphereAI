import bcrypt from 'bcryptjs';
import {supabase} from './supabase';
import {id} from '../utils/ids';

type Table = 'users' | 'vehicles' | 'trips' | 'attendance_records' | 'maintenance_records' | 'fuel_logs' | 'expense_records' | 'chat_messages' | 'tracking_locations' | 'notifications';

const now = () => new Date().toISOString();
const passwordHash = bcrypt.hashSync('Password123', 10);

const memory: Record<Table, any[]> = {
  users: [
    {id: 'usr-manager', name: 'Fleet Manager', email: 'manager@logisphere.ai', phoneNo: '9876543210', passwordHash, role: 'ROLE_MANAGER', status: 'ACTIVE', createdAt: now(), updatedAt: now()},
    {id: 'drv-raj', name: 'Raj Patel', email: 'driver@logisphere.ai', phoneNo: '9876500001', passwordHash, role: 'ROLE_DRIVER', licenseNo: 'DL-14202300123', licenseExpiryDate: '2038-04-14', trips: 12, safetyScore: 96, status: 'AVAILABLE', createdAt: now(), updatedAt: now()}
  ],
  vehicles: [
    {vehicleID: 'veh-van-05', registrationNumber: 'GJ01AB1234', name: 'VAN-05', type: 'VAN', maxLoadCapacity: 900, odometer: 74000, acquisitionCost: 620000, status: 'AVAILABLE', createdAt: now(), updatedAt: now()},
    {vehicleID: 'veh-truck-11', registrationNumber: 'GJ01TR1111', name: 'TRUCK-11', type: 'TRUCK', maxLoadCapacity: 3000, odometer: 182000, acquisitionCost: 1900000, status: 'ON_TRIP', createdAt: now(), updatedAt: now()}
  ],
  trips: [
    {tripID: 'trp-1001', source: 'Warehouse A', destination: 'Port City', status: 'DISPATCHED', vehicleID: 'veh-truck-11', driverID: 'drv-raj', cargoWeight: 1400, plannedDistance: 84, startingOdometer: 182000, createdAt: now(), updatedAt: now()}
  ],
  attendance_records: [],
  maintenance_records: [{id: 'mnt-101', vehicleID: 'veh-van-05', serviceType: 'Oil Change', cost: 2500, date: '2026-07-07', status: 'COMPLETED', createdAt: now(), updatedAt: now()}],
  fuel_logs: [{fuelLogId: 'fuel-101', vehicleID: 'veh-van-05', date: '2026-07-05', liters: 42, cost: 3150, createdAt: now()}],
  expense_records: [{expenseId: 'exp-101', tripID: 'trp-1001', vehicleID: 'veh-truck-11', toll: 120, other: 0, maint: 0, createdAt: now()}],
  chat_messages: [{messageId: 'msg-1', text: 'TRP-1001 departed on schedule.', senderId: 'usr-manager', senderName: 'Fleet Manager', createdAt: now()}],
  tracking_locations: [{id: 'loc-1', tripID: 'trp-1001', vehicleID: 'veh-truck-11', driverID: 'drv-raj', latitude: 23.0225, longitude: 72.5714, speed: 42, createdAt: now()}],
  notifications: []
};

export const db = {
  async list(table: Table, filter?: Record<string, any>) {
    if (supabase) {
      try {
        let q = supabase.from(table).select('*');
        for (const [k, v] of Object.entries(filter ?? {})) q = q.eq(k, v);
        const {data, error} = await q;
        if (!error && data && data.length > 0) return data;
        
        let qLower = supabase.from(table).select('*');
        for (const [k, v] of Object.entries(filter ?? {})) qLower = qLower.eq(k.toLowerCase(), v);
        const resLower = await qLower;
        if (!resLower.error && resLower.data && resLower.data.length > 0) return resLower.data;
      } catch {}
    }
    const entries = Object.entries(filter ?? {});
    return memory[table].filter(row =>
      entries.every(([k, v]) => row[k] === v || row[k.toLowerCase()] === v || row[k] === String(v))
    );
  },
  async find(table: Table, filter: Record<string, any>) {
    return (await this.list(table, filter))[0] ?? null;
  },
  async insert(table: Table, data: any) {
    const row = { ...data, createdAt: data.createdAt ?? now(), updatedAt: data.updatedAt ?? now() };
    if (supabase) {
      try {
        let insertPayload = { ...data };
        if (table === 'maintenance_records') {
          insertPayload = {
            id: data.id,
            vehicleid: data.vehicleID || data.vehicleid,
            servicetype: data.serviceType || data.servicetype || data.service,
            cost: data.cost,
            date: data.date,
            status: data.status,
          };
        } else if (table === 'fuel_logs') {
          insertPayload = {
            fuellogid: data.fuelLogId || data.fuellogid || data.id,
            vehicleid: data.vehicleID || data.vehicleid,
            date: data.date,
            liters: Number(data.liters) || 0,
            cost: Number(data.cost) || 0,
          };
        } else if (table === 'expense_records') {
          insertPayload = {
            expenseid: data.expenseId || data.expenseid || data.id,
            tripid: data.tripID || data.tripid || null,
            vehicleid: data.vehicleID || data.vehicleid,
            toll: Number(data.toll) || 0,
            other: Number(data.other) || 0,
            maint: Number(data.maint) || 0,
          };
        } else if (table === 'trips') {
          insertPayload = {
            tripid: data.tripID || data.tripid || data.id,
            tripID: data.tripID || data.tripid || data.id,
            source: data.source,
            destination: data.destination,
            sourcelatitude: data.sourceLatitude ?? data.sourcelatitude,
            sourceLatitude: data.sourceLatitude ?? data.sourcelatitude,
            sourcelongitude: data.sourceLongitude ?? data.sourcelongitude,
            sourceLongitude: data.sourceLongitude ?? data.sourcelongitude,
            destinationlatitude: data.destinationLatitude ?? data.destinationlatitude,
            destinationLatitude: data.destinationLatitude ?? data.destinationlatitude,
            destinationlongitude: data.destinationLongitude ?? data.destinationlongitude,
            destinationLongitude: data.destinationLongitude ?? data.destinationlongitude,
            sourceplaceid: data.sourcePlaceId ?? data.sourceplaceid,
            destinationplaceid: data.destinationPlaceId ?? data.destinationplaceid,
            status: data.status,
            vehicleid: data.vehicleID || data.vehicleid,
            vehicleID: data.vehicleID || data.vehicleid,
            driverid: data.driverID || data.driverid,
            driverID: data.driverID || data.driverid,
            cargoweight: data.cargoWeight || data.cargoweight,
            planneddistance: data.plannedDistance || data.planneddistance,
            startingodometer: data.startingOdometer || data.startingodometer,
          };
        }
        let { data: created, error } = await supabase.from(table).insert(insertPayload).select('*').single();
        if (error) {
          const fallbackRes = await supabase.from(table).insert(data).select('*').single();
          if (!fallbackRes.error && fallbackRes.data) {
            created = fallbackRes.data;
            error = null;
          }
        }
        if (!error && created) {
          memory[table].unshift(created);
          return created;
        }
      } catch (err) {
        console.warn(`[db.insert] Supabase fallback to memory for table ${table}:`, (err as any)?.message);
      }
    }
    memory[table].unshift(row);
    return row;
  },
  async update(table: Table, key: Record<string, any>, patch: any) {
    if (supabase) {
      try {
        const timeField = table === 'users' ? 'updatedAt' : 'updatedat';
        let q = supabase.from(table).update({...patch, [timeField]: now()}).select('*');
        for (const [k, v] of Object.entries(key)) q = q.eq(k, v);
        const {data, error} = await q.single();
        if (!error && data) {
          const memIndex = memory[table].findIndex(row => Object.entries(key).some(([k, v]) => row[k] === v || row[k.toLowerCase()] === v));
          if (memIndex !== -1) Object.assign(memory[table][memIndex], patch);
          return data;
        }

        let qLower = supabase.from(table).update({...patch, [timeField]: now()}).select('*');
        for (const [k, v] of Object.entries(key)) qLower = qLower.eq(k.toLowerCase(), v);
        const resLower = await qLower.single();
        if (!resLower.error && resLower.data) {
          const memIndex = memory[table].findIndex(row => Object.entries(key).some(([k, v]) => row[k] === v || row[k.toLowerCase()] === v));
          if (memIndex !== -1) Object.assign(memory[table][memIndex], patch);
          return resLower.data;
        }
      } catch {}
    }
    const row = await this.find(table, key);
    if (!row) return null;
    Object.assign(row, patch, {updatedAt: now(), updatedat: now()});
    return row;
  },
  async remove(table: Table, key: Record<string, any>) {
    if (supabase) {
      let q = supabase.from(table).delete();
      for (const [k, v] of Object.entries(key)) q = q.eq(k, v);
      const {error} = await q;
      if (error) {
        let qLower = supabase.from(table).delete();
        for (const [k, v] of Object.entries(key)) qLower = qLower.eq(k.toLowerCase(), v);
        const resLower = await qLower;
        if (!resLower.error) return true;
        throw error;
      }
      return true;
    }
    memory[table] = memory[table].filter(row => !Object.entries(key).every(([k, v]) => row[k] === v));
    return true;
  },
  makeId: id
};
