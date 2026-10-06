import bcrypt from 'bcryptjs';
import { supabase } from './supabase';
import { id } from '../utils/ids';

type Table =
  | 'users'
  | 'vehicles'
  | 'trips'
  | 'attendance_records'
  | 'maintenance_records'
  | 'fuel_logs'
  | 'expense_records'
  | 'chat_messages'
  | 'tracking_locations'
  | 'notifications'
  | 'conversations'
  | 'conversation_participants'
  | 'messages';

const now = () => new Date().toISOString();

const memory: Record<Table, any[]> = {
  users: [],
  vehicles: [],
  trips: [],
  attendance_records: [],
  maintenance_records: [],
  fuel_logs: [],
  expense_records: [],
  chat_messages: [],
  tracking_locations: [],
  notifications: [],
  conversations: [],
  conversation_participants: [],
  messages: [],
};

const withTimeout = <T>(promise: PromiseLike<T>, ms = 3000): Promise<T> => {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Supabase request timeout')), ms)),
  ]);
};

export const db = {
  async list(table: Table, filter?: Record<string, any>) {
    const entries = Object.entries(filter ?? {});
    const norm = (s: string) => s.replace(/_/g, '').toLowerCase();
    const getMemoryRows = () => memory[table].filter(row =>
      entries.every(([k, v]) => {
        const targetNormKey = norm(k);
        const matchPropKey = Object.keys(row).find(rk => norm(rk) === targetNormKey);
        if (!matchPropKey) return false;
        const val = row[matchPropKey];
        return val === v || String(val) === String(v);
      })
    );

    if (supabase) {
      try {
        let q = supabase.from(table).select('*');
        for (const [k, v] of Object.entries(filter ?? {})) {
          q = q.eq(k, v);
        }
        const { data, error } = await withTimeout(q);
        let supaData = !error && data ? data : [];
        if (supaData.length === 0) {
          let qLower = supabase.from(table).select('*');
          for (const [k, v] of Object.entries(filter ?? {})) {
            qLower = qLower.eq(k.toLowerCase(), v);
          }
          const resLower = await withTimeout(qLower);
          if (!resLower.error && resLower.data) supaData = resLower.data;
        }

        const memRows = getMemoryRows();
        const combined = [...memRows, ...supaData];
        if (combined.length > 0) return combined;
      } catch (err) {
        console.error(`[db.list] Error querying Supabase for table ${table}:`, err);
      }
    }
    return getMemoryRows();
  },

  async find(table: Table, filter: Record<string, any>) {
    const list = await this.list(table, filter);
    return list[0] ?? null;
  },

  async insert(table: Table, data: any) {
    const row = { ...data, createdAt: data.createdAt ?? now(), updatedAt: data.updatedAt ?? now() };
    if (supabase) {
      try {
        let insertPayload: Record<string, any> = { ...data };
        if (table === 'notifications') {
          insertPayload = {
            id: data.id || `notif-${Date.now()}`,
            userid: data.userId || data.userid || data.id,
            title: data.title || 'Notification',
            body: data.body || data.message || '',
            read: Boolean(data.read),
          };
        } else if (table === 'maintenance_records') {
          insertPayload = {
            id: data.id,
            vehicleid: data.vehicleID || data.vehicleid,
            servicetype: data.serviceType || data.servicetype || data.service,
            cost: Number(data.cost) || 0,
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
            tripid: data.tripID || data.tripid || data.id,
            vehicleid: data.vehicleID || data.vehicleid,
            toll: Number(data.toll) || 0,
            other: Number(data.other) || 0,
            maint: Number(data.maint) || 0,
          };
        } else if (table === 'vehicles') {
          insertPayload = {
            vehicleid: data.vehicleID || data.vehicleid,
            registrationNumber: data.registrationNumber || data.registrationnumber,
            name: data.name,
            type: String(data.type).toUpperCase(),
            maxloadcapacity: Number(data.maxLoadCapacity ?? data.maxloadcapacity ?? data.capacity ?? 0),
            odometer: Number(data.odometer ?? 0),
            acquisitioncost: Number(data.acquisitionCost ?? data.acquisitioncost ?? 0),
            status: data.status || 'AVAILABLE',
          };
        } else if (table === 'users') {
          insertPayload = {
            id: data.id,
            name: data.name,
            email: data.email,
            phoneNo: data.phoneNo || data.phoneno,
            passwordHash: data.passwordHash || data.passwordhash,
            role: data.role,
            licenseNo: data.licenseNo || data.licenseno || null,
            licenseExpiryDate: data.licenseExpiryDate || data.licenseexpirydate || null,
            trips: Number(data.trips ?? 0),
            safetyScore: Number(data.safetyScore ?? data.safetyscore ?? 95),
            status: data.status || 'ACTIVE',
          };
        } else if (table === 'attendance_records') {
          insertPayload = {
            id: data.id || `att-${Date.now()}`,
            userid: data.userId || data.userid || data.id,
            date: data.date || new Date().toLocaleDateString('en-IN'),
            clockintime: data.clockInTime || data.clockintime,
            clockouttime: data.clockOutTime || data.clockouttime || null,
            latitude: Number(data.latitude) || 0,
            longitude: Number(data.longitude) || 0,
            locationname: data.locationName || data.locationname || 'Office Location',
            distancefromoffice: Number(data.distanceFromOffice ?? data.distancefromoffice ?? 0),
            status: data.status || 'Verified Location',
          };
        } else if (table === 'trips') {
          const tripIdVal = data.tripID || data.tripid || data.id || `TRP-${Math.floor(1000 + Math.random() * 9000)}`;
          insertPayload = {
            tripid: tripIdVal,
            source: data.source,
            destination: data.destination,
            status: data.status || 'PENDING_APPROVAL',
            vehicleid: data.vehicleID || data.vehicleid,
            driverid: data.driverID || data.driverid,
            cargoweight: Number(data.cargoWeight ?? data.cargoweight ?? 0),
            planneddistance: Number(data.plannedDistance ?? data.planneddistance ?? 0),
            startingodometer: Number(data.startingOdometer ?? data.startingodometer ?? 0),
          };
          if (data.finalOdometer !== undefined || data.finalodometer !== undefined) {
            insertPayload.finalodometer = Number(data.finalOdometer ?? data.finalodometer);
          }
          if (data.fuelConsumed !== undefined || data.fuelconsumed !== undefined) {
            insertPayload.fuelconsumed = Number(data.fuelConsumed ?? data.fuelconsumed);
          }
        } else if (table === 'conversations') {
          insertPayload = {
            id: data.id || `conv-${Date.now()}`,
            created_at: data.created_at || data.createdAt || now(),
            updated_at: data.updated_at || data.updatedAt || now(),
          };
        } else if (table === 'conversation_participants') {
          insertPayload = {
            conversation_id: data.conversation_id || data.conversationId,
            user_id: data.user_id || data.userId,
            joined_at: data.joined_at || data.joinedAt || now(),
          };
        } else if (table === 'messages') {
          insertPayload = {
            id: data.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            conversation_id: data.conversation_id || data.conversationId,
            sender_id: data.sender_id || data.senderId,
            receiver_id: data.receiver_id || data.receiverId,
            message: data.message || data.text || '',
            message_type: data.message_type || data.messageType || 'TEXT',
            created_at: data.created_at || data.createdAt || now(),
            delivered_at: data.delivered_at || data.deliveredAt || null,
            read_at: data.read_at || data.readAt || null,
          };
        }

        console.log(`\n--------------------------------------------------`);
        console.log(`[DB Insert] Table: "${table}"`);
        console.log(`[DB Insert] Supabase Insert Payload:`, JSON.stringify(insertPayload, null, 2));

        let { data: created, error } = await supabase.from(table).insert(insertPayload).select('*').single();
        if (!error && created) {
          console.log(`[DB Insert SUCCESS] Saved to Supabase table "${table}":`, JSON.stringify(created, null, 2));
          console.log(`--------------------------------------------------\n`);
          memory[table].unshift(created);
          return created;
        }
        console.warn(`[DB Insert Warning] Table "${table}" Supabase insert failed (${error?.message}). Falling back to memory store.`);
      } catch (err) {
        console.warn(`[DB Insert Exception] Table "${table}":`, err);
      }
    }
    console.log(`[DB Insert Memory] Fallback to in-memory for table "${table}":`, JSON.stringify(row, null, 2));
    memory[table].unshift(row);
    return row;
  },

  async update(table: Table, key: Record<string, any>, patch: any) {
    if (supabase) {
      try {
        const timeField = (table === 'users') ? 'updatedAt' : (table === 'conversations' || table === 'messages' || table === 'conversation_participants' ? 'updated_at' : 'updatedat');
        let cleanPatch: Record<string, any> = { ...patch, [timeField]: now() };
        if (table === 'attendance_records') {
          cleanPatch = {};
          if (patch.clockOutTime !== undefined || patch.clockouttime !== undefined) {
            cleanPatch.clockouttime = patch.clockOutTime ?? patch.clockouttime;
          }
          if (patch.status !== undefined) cleanPatch.status = patch.status;
          cleanPatch[timeField] = now();
        } else if (table === 'trips') {
          cleanPatch = {};
          if (patch.status !== undefined) cleanPatch.status = patch.status;
          if (patch.finalOdometer !== undefined || patch.finalodometer !== undefined) {
            cleanPatch.finalodometer = Number(patch.finalOdometer ?? patch.finalodometer);
          }
          if (patch.fuelConsumed !== undefined || patch.fuelconsumed !== undefined) {
            cleanPatch.fuelconsumed = Number(patch.fuelConsumed ?? patch.fuelconsumed);
          }
          if (patch.vehicleID || patch.vehicleid) cleanPatch.vehicleid = patch.vehicleID || patch.vehicleid;
          if (patch.driverID || patch.driverid) cleanPatch.driverid = patch.driverID || patch.driverid;
          cleanPatch[timeField] = now();
        } else if (table === 'messages') {
          cleanPatch = {};
          if (patch.delivered_at !== undefined || patch.deliveredAt !== undefined) {
            cleanPatch.delivered_at = patch.delivered_at ?? patch.deliveredAt;
          }
          if (patch.read_at !== undefined || patch.readAt !== undefined) {
            cleanPatch.read_at = patch.read_at ?? patch.readAt;
          }
        }

        console.log(`\n--------------------------------------------------`);
        console.log(`[DB Update] Table: "${table}" | Key:`, JSON.stringify(key), '| Patch:', JSON.stringify(cleanPatch));

        const norm = (s: string) => s.replace(/_/g, '').toLowerCase();
        const memRow = memory[table].find(r =>
          Object.entries(key).every(([k, v]) => {
            const targetNormKey = norm(k);
            const matchPropKey = Object.keys(r).find(rk => norm(rk) === targetNormKey);
            return matchPropKey && (r[matchPropKey] === v || String(r[matchPropKey]) === String(v));
          })
        );
        if (memRow) Object.assign(memRow, patch, { updatedAt: now(), updatedat: now() });

        let q = supabase.from(table).update(cleanPatch).select('*');
        for (const [k, v] of Object.entries(key)) q = q.eq(k.toLowerCase(), v);
        const { data, error } = await q;
        if (!error && data && data.length > 0) {
          console.log(`[DB Update SUCCESS] Table "${table}" updated:`, JSON.stringify(data[0], null, 2));
          console.log(`--------------------------------------------------\n`);
          return data[0];
        }

        let qLower = supabase.from(table).update(cleanPatch).select('*');
        for (const [k, v] of Object.entries(key)) qLower = qLower.eq(k, v);
        const resLower = await qLower;
        if (!resLower.error && resLower.data && resLower.data.length > 0) {
          console.log(`[DB Update SUCCESS] Table "${table}" updated:`, JSON.stringify(resLower.data[0], null, 2));
          console.log(`--------------------------------------------------\n`);
          return resLower.data[0];
        }
        if (memRow) return memRow;
        return null;
      } catch (err) {
        console.error(`[DB Update ERROR] Supabase update error for table ${table}:`, err);
        return null;
      }
    }
    const row = await this.find(table, key);
    if (!row) return null;
    Object.assign(row, patch, { updatedAt: now(), updatedat: now() });
    return row;
  },

  async remove(table: Table, key: Record<string, any>) {
    const norm = (s: string) => s.replace(/_/g, '').toLowerCase();
    memory[table] = memory[table].filter(row =>
      !Object.entries(key).every(([k, v]) => {
        const targetNormKey = norm(k);
        const matchPropKey = Object.keys(row).find(rk => norm(rk) === targetNormKey);
        if (!matchPropKey) return false;
        const val = row[matchPropKey];
        return val === v || String(val) === String(v);
      })
    );

    if (supabase) {
      try {
        let q = supabase.from(table).delete();
        for (const [k, v] of Object.entries(key)) q = q.eq(k, v);
        const { error } = await q;
        if (!error) return true;

        let qLower = supabase.from(table).delete();
        for (const [k, v] of Object.entries(key)) qLower = qLower.eq(k.toLowerCase(), v);
        const resLower = await qLower;
        if (!resLower.error) return true;
      } catch (err) {
        console.error(`[db.remove] Supabase delete error for table ${table}:`, err);
      }
    }
    return true;
  },

  async deleteMessagesOlderThan(cutoffIso: string): Promise<number> {
    let deletedCount = 0;
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('messages')
          .delete()
          .lt('created_at', cutoffIso)
          .select('id');

        if (!error && data) {
          deletedCount = data.length;
        }
      } catch (err) {
        console.warn('[deleteMessagesOlderThan] Supabase cleanup error:', err);
      }
    }
    const initialCount = memory.messages.length;
    memory.messages = memory.messages.filter(m => {
      const created = m.created_at || m.createdAt;
      return created && new Date(created).getTime() >= new Date(cutoffIso).getTime();
    });
    const memoryDeleted = initialCount - memory.messages.length;
    return Math.max(deletedCount, memoryDeleted);
  },

  makeId: id,
};
