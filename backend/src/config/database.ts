import bcrypt from 'bcryptjs';
import { supabase } from './supabase';
import { env } from './env';
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
  | 'messages'
  | 'emergency_alerts'
  | 'organizations'
  | 'organization_memberships'
  | 'platform_admins'
  | 'sustainability_targets';

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
  emergency_alerts: [],
  organizations: [],
  organization_memberships: [],
  platform_admins: [],
  sustainability_targets: [],
};

const knownMissingColumns = new Set<string>();

const withTimeout = <T>(promise: PromiseLike<T>, ms = env.SUPABASE_TIMEOUT_MS ?? 10000): Promise<T> => {
  let timer: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Supabase request timeout after ${ms}ms`)), ms);
  });
  return Promise.race([Promise.resolve(promise), timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
};

function getRowKey(table: Table, row: any): string {
  if (!row) return '';
  if (table === 'conversation_participants') {
    const cId = row.conversation_id || row.conversationid || row.conversationId || '';
    const uId = row.user_id || row.userid || row.userId || '';
    return `${cId}:::${uId}`;
  }
  if (table === 'organization_memberships') {
    const oId = row.organization_id || row.organizationid || '';
    const uId = row.user_id || row.userid || '';
    return row.id ? String(row.id) : `${oId}:::${uId}`;
  }
  if (table === 'platform_admins') {
    return String(row.id || row.user_id || row.userid || '');
  }
  if (table === 'organizations') {
    return String(row.id || row.slug || '');
  }
  if (table === 'trips') {
    return String(row.tripid || row.tripID || row.id || '');
  }
  if (table === 'vehicles') {
    return String(row.vehicleid || row.vehicleID || row.id || '');
  }
  if (table === 'fuel_logs') {
    return String(row.fuellogid || row.fuelLogId || row.id || '');
  }
  if (table === 'expense_records') {
    return String(row.expenseid || row.expenseId || row.id || '');
  }
  if (table === 'tracking_locations') {
    return String(row.id || row.tripid || row.tripID || '');
  }
  if (table === 'messages') {
    return String(row.id || row.messageid || row.messageId || '');
  }
  if (table === 'sustainability_targets') {
    return String(row.id || `${row.organization_id || ''}:::${row.period || ''}`);
  }
  return String(row.id || '');
}

export function normalizeDbRow(table: Table, row: any): any {
  if (!row || typeof row !== 'object') return row;
  if (table === 'users') {
    const passwordHash = row.passwordHash || row.passwordhash;
    const phoneNo = row.phoneNo || row.phoneno;
    const licenseNo = row.licenseNo || row.licenseno;
    const licenseExpiryDate = row.licenseExpiryDate || row.licenseexpirydate;
    const safetyScore = row.safetyScore ?? row.safetyscore;
    const mustChangePassword = Boolean(row.mustChangePassword ?? row.mustchangepassword ?? row.must_change_password ?? false);
    const orgId = row.organization_id || row.organizationId;
    const createdAt = row.createdAt || row.createdat || row.created_at;
    const updatedAt = row.updatedAt || row.updatedat || row.updated_at;

    return {
      ...row,
      passwordHash,
      passwordhash: passwordHash,
      phoneNo,
      phoneno: phoneNo,
      licenseNo,
      licenseno: licenseNo,
      licenseExpiryDate,
      licenseexpirydate: licenseExpiryDate,
      safetyScore,
      safetyscore: safetyScore,
      mustChangePassword,
      mustchangepassword: mustChangePassword,
      must_change_password: mustChangePassword,
      organizationId: orgId,
      organization_id: orgId,
      createdAt,
      createdat: createdAt,
      created_at: createdAt,
      updatedAt,
      updatedat: updatedAt,
      updated_at: updatedAt,
    };
  }

  if (table === 'vehicles') {
    const vehicleID = row.vehicleID || row.vehicleid || row.id;
    const regNo = row.registrationNumber || row.registrationnumber || row.reg || '';
    const maxCap = row.maxLoadCapacity ?? row.maxloadcapacity ?? row.capacity;
    const acqCost = row.acquisitionCost ?? row.acquisitioncost ?? row.cost;
    const orgId = row.organization_id || row.organizationId;
    const createdAt = row.createdAt || row.createdat || row.created_at;
    const updatedAt = row.updatedAt || row.updatedat || row.updated_at;

    return {
      ...row,
      id: vehicleID,
      vehicleID,
      vehicleid: vehicleID,
      registrationNumber: regNo,
      registrationnumber: regNo,
      maxLoadCapacity: maxCap !== undefined ? Number(maxCap) : undefined,
      maxloadcapacity: maxCap !== undefined ? Number(maxCap) : undefined,
      capacity: maxCap !== undefined ? Number(maxCap) : undefined,
      acquisitionCost: acqCost !== undefined ? Number(acqCost) : undefined,
      acquisitioncost: acqCost !== undefined ? Number(acqCost) : undefined,
      cost: acqCost !== undefined ? Number(acqCost) : undefined,
      odometer: Number(row.odometer ?? 0),
      organization_id: orgId,
      organizationId: orgId,
      createdAt,
      createdat: createdAt,
      updatedAt,
      updatedat: updatedAt,
    };
  }

  if (table === 'trips') {
    const tripID = row.tripID || row.tripid || row.id;
    const vehicleID = row.vehicleID || row.vehicleid;
    const driverID = row.driverID || row.driverid;
    const cargoWeight = row.cargoWeight ?? row.cargoweight;
    const plannedDistance = row.plannedDistance ?? row.planneddistance;
    const startingOdometer = row.startingOdometer ?? row.startingodometer;
    const finalOdometer = row.finalOdometer ?? row.finalodometer;
    const fuelConsumed = row.fuelConsumed ?? row.fuelconsumed;
    const orgId = row.organization_id || row.organizationId;
    const createdAt = row.createdAt || row.createdat || row.created_at;
    const updatedAt = row.updatedAt || row.updatedat || row.updated_at;

    return {
      ...row,
      id: tripID,
      tripID,
      tripid: tripID,
      vehicleID,
      vehicleid: vehicleID,
      driverID,
      driverid: driverID,
      cargoWeight: cargoWeight !== undefined ? Number(cargoWeight) : undefined,
      cargoweight: cargoWeight !== undefined ? Number(cargoWeight) : undefined,
      plannedDistance: plannedDistance !== undefined ? Number(plannedDistance) : undefined,
      planneddistance: plannedDistance !== undefined ? Number(plannedDistance) : undefined,
      startingOdometer: startingOdometer !== undefined ? Number(startingOdometer) : undefined,
      startingodometer: startingOdometer !== undefined ? Number(startingOdometer) : undefined,
      finalOdometer: finalOdometer !== undefined ? Number(finalOdometer) : undefined,
      finalodometer: finalOdometer !== undefined ? Number(finalOdometer) : undefined,
      fuelConsumed: fuelConsumed !== undefined ? Number(fuelConsumed) : undefined,
      fuelconsumed: fuelConsumed !== undefined ? Number(fuelConsumed) : undefined,
      organization_id: orgId,
      organizationId: orgId,
      createdAt,
      createdat: createdAt,
      updatedAt,
      updatedat: updatedAt,
    };
  }

  if (table === 'attendance_records') {
    const userID = row.userID || row.userid || row.userId;
    const clockInTime = row.clockInTime || row.clockintime;
    const clockOutTime = row.clockOutTime || row.clockouttime;
    const locationName = row.locationName || row.locationname;
    const distanceFromOffice = row.distanceFromOffice ?? row.distancefromoffice;
    const isGeofenceException = row.is_geofence_exception ?? row.isGeofenceException;
    const exceptionReason = row.exception_reason || row.exceptionReason;
    const tripId = row.trip_id || row.tripId;
    const exceptionDistance = row.exception_distance ?? row.exceptionDistance;
    const exceptionAction = row.exception_action || row.exceptionAction;
    const autoClockOut = row.auto_clock_out ?? row.autoClockOut;
    const clockOutType = row.clock_out_type || row.clockOutType;
    const orgId = row.organization_id || row.organizationId;
    const createdAt = row.createdAt || row.createdat || row.created_at;
    const updatedAt = row.updatedAt || row.updatedat || row.updated_at;

    return {
      ...row,
      userID,
      userid: userID,
      userId: userID,
      clockInTime,
      clockintime: clockInTime,
      clockOutTime,
      clockouttime: clockOutTime,
      locationName,
      locationname: locationName,
      distanceFromOffice: distanceFromOffice !== undefined ? Number(distanceFromOffice) : undefined,
      distancefromoffice: distanceFromOffice !== undefined ? Number(distanceFromOffice) : undefined,
      is_geofence_exception: isGeofenceException,
      isGeofenceException,
      exception_reason: exceptionReason,
      exceptionReason,
      trip_id: tripId,
      tripId,
      exception_distance: exceptionDistance !== undefined ? Number(exceptionDistance) : undefined,
      exceptionDistance: exceptionDistance !== undefined ? Number(exceptionDistance) : undefined,
      exception_action: exceptionAction,
      exceptionAction,
      auto_clock_out: autoClockOut,
      autoClockOut,
      clock_out_type: clockOutType,
      clockOutType,
      organization_id: orgId,
      organizationId: orgId,
      createdAt,
      createdat: createdAt,
      updatedAt,
      updatedat: updatedAt,
    };
  }

  if (table === 'emergency_alerts') {
    const driverId = row.driver_id || row.driverId;
    const driverName = row.driver_name || row.driverName;
    const businessId = row.business_id || row.businessId;
    const tripId = row.trip_id || row.tripId;
    const vehicleId = row.vehicle_id || row.vehicleId;
    const locationAccuracyMeters = row.location_accuracy_meters ?? row.locationAccuracyMeters;
    const locationCapturedAt = row.location_captured_at || row.locationCapturedAt;
    const locationStatus = row.location_status || row.locationStatus;
    const acknowledgedBy = row.acknowledged_by || row.acknowledgedBy;
    const acknowledgedAt = row.acknowledged_at || row.acknowledgedAt;
    const resolvedBy = row.resolved_by || row.resolvedBy;
    const resolvedAt = row.resolved_at || row.resolvedAt;
    const resolutionNote = row.resolution_note || row.resolutionNote;
    const clientRequestId = row.client_request_id || row.clientRequestId;
    const orgId = row.organization_id || row.organizationId;
    const createdAt = row.created_at || row.createdAt || row.createdat;
    const updatedAt = row.updated_at || row.updatedAt || row.updatedat;

    return {
      ...row,
      driver_id: driverId,
      driverId,
      driver_name: driverName,
      driverName,
      business_id: businessId,
      businessId,
      trip_id: tripId,
      tripId,
      vehicle_id: vehicleId,
      vehicleId,
      location_accuracy_meters: locationAccuracyMeters,
      locationAccuracyMeters,
      location_captured_at: locationCapturedAt,
      locationCapturedAt,
      location_status: locationStatus,
      locationStatus,
      acknowledged_by: acknowledgedBy,
      acknowledgedBy,
      acknowledged_at: acknowledgedAt,
      acknowledgedAt,
      resolved_by: resolvedBy,
      resolvedBy,
      resolved_at: resolvedAt,
      resolvedAt,
      resolution_note: resolutionNote,
      resolutionNote,
      client_request_id: clientRequestId,
      clientRequestId,
      organization_id: orgId,
      organizationId: orgId,
      created_at: createdAt,
      createdAt,
      updated_at: updatedAt,
      updatedAt,
    };
  }

  return row;
}

export const db = {
  async list(table: Table, filter?: Record<string, any>) {
    const entries = Object.entries(filter ?? {});
    const norm = (s: string) => s.replace(/_/g, '').toLowerCase();
    const filterRow = (row: any) =>
      entries.every(([k, v]) => {
        const targetNormKey = norm(k);
        const matchPropKey = Object.keys(row).find(rk => norm(rk) === targetNormKey);
        if (!matchPropKey) return false;
        const val = row[matchPropKey];
        return val === v || String(val) === String(v);
      });

    if (supabase) {
      try {
        const isUuid = (val: any) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

        // Special multi-tenant handling for users: check both users.organization_id AND organization_memberships
        if (table === 'users') {
          const orgIdVal = filter?.organization_id || filter?.organizationId;
          if (orgIdVal && isUuid(orgIdVal)) {
            let memberUserIds: string[] = [];
            try {
              const { data: mems }: any = await withTimeout(
                supabase.from('organization_memberships').select('user_id').eq('organization_id', orgIdVal).eq('status', 'active')
              );
              if (mems) memberUserIds = mems.map((m: any) => m.user_id).filter(Boolean);
            } catch (mErr) {
              console.warn('[db.list] Failed to query organization memberships:', mErr);
            }

            if (memberUserIds.length === 0 && knownMissingColumns.has('users.organization_id')) {
              return [];
            }

            let userQ = supabase.from('users').select('*');
            if (memberUserIds.length > 0) {
              if (knownMissingColumns.has('users.organization_id')) {
                userQ = userQ.in('id', memberUserIds);
              } else {
                userQ = userQ.or(`organization_id.eq.${orgIdVal},id.in.(${memberUserIds.map((u: string) => `"${u}"`).join(',')})`);
              }
            } else {
              userQ = userQ.eq('organization_id', orgIdVal);
            }

            for (const [k, v] of entries) {
              if (k !== 'organization_id' && k !== 'organizationId') {
                userQ = userQ.eq(k, v);
              }
            }

            let { data: userData, error: userError }: any = (await withTimeout(userQ)) || {};
            if (userError && (userError.code === 'PGRST204' || userError.message?.includes('organization_id') || userError.code === '42703')) {
              knownMissingColumns.add('users.organization_id');
              if (memberUserIds.length === 0) {
                return [];
              }
              let retryUserQ = supabase.from('users').select('*').in('id', memberUserIds);
              for (const [k, v] of entries) {
                if (k !== 'organization_id' && k !== 'organizationId') {
                  retryUserQ = retryUserQ.eq(k, v);
                }
              }
              const retryRes: any = await withTimeout(retryUserQ);
              userData = retryRes?.data;
              userError = retryRes?.error;
            }

            if (!userError && userData) {
              return userData.map((u: any) => normalizeDbRow('users', { ...u, organization_id: orgIdVal }));
            }
          }
        }

        const resolveSupabaseColumn = (tbl: Table, key: string): string => {
          if (key === 'organization_id' || key === 'organizationId') return 'organization_id';
          if (key === 'clientRequestId' || key === 'client_request_id') return 'client_request_id';
          if (key === 'driverId' || key === 'driverID' || key === 'driverid') return 'driverid';
          if (key === 'vehicleId' || key === 'vehicleID' || key === 'vehicleid') return 'vehicleid';
          if (key === 'tripId' || key === 'tripID' || key === 'tripid') return 'tripid';
          if (key === 'fuelLogId' || key === 'fuellogid') return 'fuellogid';
          if (key === 'expenseId' || key === 'expenseid') return 'expenseid';
          if (key === 'serviceType' || key === 'servicetype') return 'servicetype';
          if (key === 'registrationNumber' || key === 'registrationnumber') return 'registrationnumber';
          if (key === 'passwordHash' || key === 'passwordhash') return 'passwordhash';
          if (key === 'phoneNo' || key === 'phoneno') return 'phoneno';
          if (key === 'licenseNo' || key === 'licenseno') return 'licenseno';
          if (key === 'licenseExpiryDate' || key === 'licenseexpirydate') return 'licenseexpirydate';
          if (key === 'safetyScore' || key === 'safetyscore') return 'safetyscore';
          if (key === 'mustChangePassword' || key === 'mustchangepassword' || key === 'must_change_password') return 'mustchangepassword';
          if (tbl === 'vehicles' && key === 'id') return 'vehicleid';
          if (tbl === 'trips' && key === 'id') return 'tripid';
          return key;
        };

        const applyFilters = (queryBuilder: any) => {
          let builder = queryBuilder;
          for (const [k, v] of entries) {
            const col = resolveSupabaseColumn(table, k);
            if (knownMissingColumns.has(`${table}.${col}`) || knownMissingColumns.has(`${table}.${k}`)) {
              continue;
            }
            if ((col === 'organization_id' || (col === 'id' && table === 'organizations')) && !isUuid(v)) {
              continue;
            }
            builder = builder.eq(col, v);
          }
          return builder;
        };

        let q = applyFilters(supabase.from(table).select('*'));
        let { data, error }: any = (await withTimeout(q)) || {};

        while (error && (error.code === '42703' || error.code === 'PGRST204' || error.code === '22P02' || error.message?.includes('does not exist') || error.message?.includes('invalid input syntax for type uuid'))) {
          const match = error.message.match(/column [^.]*\.?"?([a-zA-Z0-9_]+)"? does not exist/i) ||
                        error.hint?.match(/column "([^"]+)"/i) ||
                        error.message.match(/Could not find the '([^']+)' column/i);
          const badCol = match ? match[1] : null;
          if (badCol) {
            console.warn(`[db.list] Column '${badCol}' does not exist on table '${table}'. Retrying without it.`);
            knownMissingColumns.add(`${table}.${badCol}`);
            for (const [k] of entries) {
              if (k.toLowerCase() === badCol.toLowerCase() || resolveSupabaseColumn(table, k).toLowerCase() === badCol.toLowerCase()) {
                knownMissingColumns.add(`${table}.${k}`);
              }
            }
          } else if (error.code === '22P02' || error.message?.includes('organization_id') || error.message?.includes('uuid')) {
            knownMissingColumns.add(`${table}.organization_id`);
          } else {
            break;
          }

          let retryQ = applyFilters(supabase.from(table).select('*'));
          const retryRes: any = await withTimeout(retryQ);
          data = retryRes?.data;
          error = retryRes?.error;
        }

        if (error) {
          console.error(`[db.list] Error querying Supabase for table ${table}:`, error);
          throw new Error(`Database query failed for ${table}: ${error.message}`);
        }

        let supaData: any[] = data || [];

        // Apply in-memory matching if any columns were stripped from remote query
        supaData = supaData.filter(filterRow);

        // If organization_id is not yet in the DB schema for this table (pending migration),
        // decorate returned rows with the queried organization_id so that valid operational records
        // are not rejected by callers expecting the tenant tag.
        const orgFilterVal = filter?.organization_id || filter?.organizationId;
        if (orgFilterVal && knownMissingColumns.has(`${table}.organization_id`)) {
          supaData = supaData.map(r => (!r.organization_id ? { ...r, organization_id: orgFilterVal } : r));
        }

        return supaData.map(r => normalizeDbRow(table, r));
      } catch (err: any) {
        console.error(`[db.list] Exception querying Supabase for table ${table}:`, err);
        throw err;
      }
    }

    // In-memory mock mode (test/offline mode when hasSupabase is false)
    return (memory[table] || []).filter(filterRow).map(r => normalizeDbRow(table, r));
  },

  async find(table: Table, filter: Record<string, any>) {
    const list = await this.list(table, filter);
    return list[0] ?? null;
  },

  async findById(table: Table, id: string) {
    if (!id) return null;
    if (table === 'vehicles') {
      const v = (await this.find(table, { vehicleID: id })) || (await this.find(table, { vehicleid: id })) || (await this.find(table, { id }));
      if (v) return v;
      const all = await this.list(table);
      return (all || []).find((row: any) => String(row.vehicleID || row.vehicleid || row.id || '').toLowerCase() === String(id).toLowerCase()) ?? null;
    }
    if (table === 'trips') {
      const t = (await this.find(table, { tripID: id })) || (await this.find(table, { tripid: id })) || (await this.find(table, { id }));
      if (t) return t;
      const all = await this.list(table);
      return (all || []).find((row: any) => String(row.tripID || row.tripid || row.id || '').toLowerCase() === String(id).toLowerCase()) ?? null;
    }
    const u = (await this.find(table, { id })) || (await this.find(table, { userID: id }));
    if (u) return u;
    const all = await this.list(table);
    return (all || []).find((row: any) => String(row.id || row.userID || row.userid || '').toLowerCase() === String(id).toLowerCase()) ?? null;
  },

  async insert(table: Table, data: any) {
    const isGlobalTable = table === 'organizations' || table === 'platform_admins';
    const isUuid = (val: any) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
    const rawOrgId = data.organization_id || data.organizationId || data.businessId || data.business_id;
    const orgId = isUuid(rawOrgId) ? rawOrgId : undefined;

    const row = {
      ...data,
      ...(orgId ? { organization_id: orgId } : {}),
      createdAt: data.createdAt ?? now(),
      updatedAt: data.updatedAt ?? now(),
    };

    if (table === 'emergency_alerts') {
      const cId = data.client_request_id || data.clientRequestId;
      if (cId) {
        const existing = memory.emergency_alerts.find(a =>
          (a.client_request_id === cId || a.clientRequestId === cId)
        );
        if (existing) {
          const dupErr: any = new Error(`Emergency alert with clientRequestId '${cId}' already exists`);
          dupErr.code = '23505';
          throw dupErr;
        }
        memory.emergency_alerts.unshift(row);
      }
    }

    if (supabase) {
      try {
        let insertPayload: Record<string, any> = {
          ...data,
          ...(orgId ? { organization_id: orgId } : {}),
        };
        if (table === 'notifications') {
          let notifOrgId = orgId;
          const targetUserId = data.userId || data.userid;
          if (!notifOrgId && targetUserId) {
            const recipientUser = memory.users.find(
              (u: any) => String(u.id || u.userID || u.userid || '').toLowerCase() === String(targetUserId).toLowerCase()
            );
            if (recipientUser && isUuid(recipientUser.organization_id || recipientUser.businessId || recipientUser.organizationId)) {
              notifOrgId = recipientUser.organization_id || recipientUser.businessId || recipientUser.organizationId;
            }
          }
          if (!notifOrgId && memory.organizations.length > 0) {
            notifOrgId = memory.organizations[0].id;
          }
          if (!notifOrgId) {
            notifOrgId = 'd27c2bb5-07e7-4b06-93fd-99824a21ad9b';
          }

          // Ensure recipient user exists in users table to prevent notifications_userid_fkey violation
          if (targetUserId) {
            try {
              const { data: existingUser } = await supabase.from('users').select('id').eq('id', targetUserId).maybeSingle();
              if (!existingUser) {
                // If user doesn't exist (e.g. fallback 'usr-manager'), provision or link to an existing manager/admin
                const { data: firstAdmin } = await supabase.from('users').select('id').eq('role', 'ROLE_MANAGER').limit(1).maybeSingle();
                if (firstAdmin && targetUserId === 'usr-manager') {
                  data.userId = firstAdmin.id;
                  data.userid = firstAdmin.id;
                } else {
                  // Provision placeholder user record
                  await supabase.from('users').insert({
                    id: targetUserId,
                    name: targetUserId.startsWith('drv-') ? 'Driver' : 'Fleet Manager',
                    email: `${targetUserId.toLowerCase()}@logisphere.ai`,
                    role: targetUserId.startsWith('drv-') ? 'ROLE_DRIVER' : 'ROLE_MANAGER',
                    status: 'ACTIVE',
                    ...(notifOrgId ? { organization_id: notifOrgId } : {}),
                  });
                }
              }
            } catch (uCheckErr) {
              console.warn(`[DB Insert notifications] User existence check/provision warning:`, uCheckErr);
            }
          }

          insertPayload = {
            id: data.id || `notif-${Date.now()}`,
            userid: data.userId || data.userid || null,
            title: data.title || 'Notification',
            body: data.body || data.message || '',
            read: Boolean(data.read),
            ...(notifOrgId ? { organization_id: notifOrgId } : {}),
          };
        } else if (table === 'maintenance_records') {
          const recOrgId = orgId || (isUuid(data.organization_id || data.organizationId || data.businessId) ? (data.organization_id || data.organizationId || data.businessId) : (memory.organizations[0]?.id || 'd27c2bb5-07e7-4b06-93fd-99824a21ad9b'));
          insertPayload = {
            id: data.id,
            vehicleid: data.vehicleID || data.vehicleid,
            servicetype: data.serviceType || data.servicetype || data.service,
            cost: Number(data.cost) || 0,
            date: data.date,
            status: data.status,
            ...(recOrgId ? { organization_id: recOrgId } : {}),
          };
        } else if (table === 'fuel_logs') {
          const fuelOrgId = orgId || (isUuid(data.organization_id || data.organizationId || data.businessId) ? (data.organization_id || data.organizationId || data.businessId) : (memory.organizations[0]?.id || 'd27c2bb5-07e7-4b06-93fd-99824a21ad9b'));
          insertPayload = {
            fuellogid: data.fuelLogId || data.fuellogid || data.id,
            vehicleid: data.vehicleID || data.vehicleid,
            date: data.date,
            liters: Number(data.liters) || 0,
            cost: Number(data.cost) || 0,
            ...(fuelOrgId ? { organization_id: fuelOrgId } : {}),
          };
        } else if (table === 'expense_records') {
          const expOrgId = orgId || (isUuid(data.organization_id || data.organizationId || data.businessId) ? (data.organization_id || data.organizationId || data.businessId) : (memory.organizations[0]?.id || 'd27c2bb5-07e7-4b06-93fd-99824a21ad9b'));
          insertPayload = {
            expenseid: data.expenseId || data.expenseid || data.id,
            tripid: data.tripID || data.tripid || data.id,
            vehicleid: data.vehicleID || data.vehicleid,
            toll: Number(data.toll) || 0,
            other: Number(data.other) || 0,
            maint: Number(data.maint) || 0,
            ...(expOrgId ? { organization_id: expOrgId } : {}),
          };
        } else if (table === 'vehicles') {
          const regVal = data.registrationnumber || data.registrationNumber || data.reg;
          const vehicleOrgId = orgId || (isUuid(data.organization_id || data.organizationId || data.businessId) ? (data.organization_id || data.organizationId || data.businessId) : (memory.organizations[0]?.id || 'd27c2bb5-07e7-4b06-93fd-99824a21ad9b'));
          insertPayload = {
            vehicleid: data.vehicleID || data.vehicleid,
            registrationnumber: regVal,
            name: data.name,
            type: String(data.type).toUpperCase(),
            maxloadcapacity: Number(data.maxLoadCapacity ?? data.maxloadcapacity ?? data.capacity ?? 0),
            odometer: Number(data.odometer ?? 0),
            acquisitioncost: Number(data.acquisitionCost ?? data.acquisitioncost ?? 0),
            status: data.status || 'AVAILABLE',
            ...(vehicleOrgId ? { organization_id: vehicleOrgId } : {}),
          };
        } else if (table === 'users') {
          const pwdHash = data.passwordHash || data.passwordhash || '$2a$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW';
          const pNo = data.phoneNo || data.phoneno || null;
          const licNo = data.licenseNo || data.licenseno || null;
          const licExp = data.licenseExpiryDate || data.licenseexpirydate || null;
          const sScore = Number(data.safetyScore ?? data.safetyscore ?? 95);
          insertPayload = {
            id: data.id,
            name: data.name,
            email: data.email,
            phoneNo: pNo,
            phoneno: pNo,
            passwordHash: pwdHash,
            passwordhash: pwdHash,
            role: data.role,
            licenseNo: licNo,
            licenseno: licNo,
            licenseExpiryDate: licExp,
            licenseexpirydate: licExp,
            trips: Number(data.trips ?? 0),
            safetyScore: sScore,
            safetyscore: sScore,
            status: data.status || 'ACTIVE',
            ...(orgId ? { organization_id: orgId } : {}),
          };
        } else if (table === 'attendance_records') {
          insertPayload = {
            id: data.id || `att-${Date.now()}`,
            organization_id: data.organization_id || orgId || null,
            userid: data.userId || data.userid || null,
            date: data.date || new Date().toLocaleDateString('en-IN'),
            clockintime: data.clockInTime || data.clockintime,
            clockouttime: data.clockOutTime || data.clockouttime || null,
            latitude: Number(data.latitude) || 0,
            longitude: Number(data.longitude) || 0,
            locationname: data.locationName || data.locationname || 'Office Location',
            distancefromoffice: Number(data.distanceFromOffice ?? data.distancefromoffice ?? 0),
            status: data.status || 'Verified Location',
          };
          if (data.is_geofence_exception !== undefined || data.isGeofenceException !== undefined) {
            insertPayload.is_geofence_exception = Boolean(data.is_geofence_exception ?? data.isGeofenceException);
          }
          if (data.exception_reason !== undefined || data.exceptionReason !== undefined) {
            insertPayload.exception_reason = data.exception_reason ?? data.exceptionReason;
          }
          if (data.trip_id !== undefined || data.tripId !== undefined) {
            insertPayload.trip_id = data.trip_id ?? data.tripId;
          }
          if (data.exception_distance !== undefined || data.exceptionDistance !== undefined) {
            insertPayload.exception_distance = Number(data.exception_distance ?? data.exceptionDistance);
          }
          if (data.exception_action !== undefined || data.exceptionAction !== undefined) {
            insertPayload.exception_action = data.exception_action ?? data.exceptionAction;
          }
        } else if (table === 'trips') {
          const tripIdVal = data.tripID || data.tripid || data.id || `TRP-${Math.floor(1000 + Math.random() * 9000)}`;
          const tripOrgId = orgId || (isUuid(data.organization_id || data.organizationId || data.businessId) ? (data.organization_id || data.organizationId || data.businessId) : (memory.organizations[0]?.id || 'd27c2bb5-07e7-4b06-93fd-99824a21ad9b'));
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
            ...(tripOrgId ? { organization_id: tripOrgId } : {}),
          };
          if (data.finalOdometer !== undefined || data.finalodometer !== undefined) {
            insertPayload.finalodometer = Number(data.finalOdometer ?? data.finalodometer);
          }
          if (data.fuelConsumed !== undefined || data.fuelconsumed !== undefined) {
            insertPayload.fuelconsumed = Number(data.fuelConsumed ?? data.fuelconsumed);
          }
        } else if (table === 'sustainability_targets') {
          insertPayload = {
            id: data.id || `${orgId || 'org'}:::${data.period}`,
            organization_id: orgId,
            period: data.period,
            co2_reduction_percentage: Number(data.co2_reduction_percentage || 0),
            fuel_efficiency_target_kmpl: Number(data.fuel_efficiency_target_kmpl || 0),
            max_carbon_budget_kg: Number(data.max_carbon_budget_kg || 0),
          };
        } else if (table === 'conversations') {
          insertPayload = {
            id: data.id || `conv-${Date.now()}`,
            ...(orgId ? { organization_id: orgId } : {}),
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
            ...(orgId ? { organization_id: orgId } : {}),
            conversation_id: data.conversation_id || data.conversationId,
            sender_id: data.sender_id || data.senderId,
            receiver_id: data.receiver_id || data.receiverId,
            message: data.message || data.text || '',
            message_type: data.message_type || data.messageType || 'TEXT',
            created_at: data.created_at || data.createdAt || now(),
            delivered_at: data.delivered_at || data.deliveredAt || null,
            read_at: data.read_at || data.readAt || null,
          };
        } else if (table === 'emergency_alerts') {
          insertPayload = {
            id: data.id || `alt-${Date.now()}`,
            driver_id: data.driver_id || data.driverId,
            driver_name: data.driver_name || data.driverName || 'Driver',
            business_id: data.business_id || data.businessId || 'default_org',
            trip_id: data.trip_id || data.tripId || null,
            vehicle_id: data.vehicle_id || data.vehicleId || null,
            latitude: data.latitude !== null && data.latitude !== undefined ? Number(data.latitude) : null,
            longitude: data.longitude !== null && data.longitude !== undefined ? Number(data.longitude) : null,
            location_accuracy_meters: data.location_accuracy_meters ?? data.locationAccuracy ?? null,
            location_captured_at: data.location_captured_at || data.locationCapturedAt || now(),
            location_status: data.location_status || data.locationStatus || 'PRECISE',
            message: data.message || 'EMERGENCY SOS: Driver triggered emergency alert',
            status: data.status || 'ACTIVE',
            acknowledged_by: data.acknowledged_by || data.acknowledgedBy || null,
            acknowledged_at: data.acknowledged_at || data.acknowledgedAt || null,
            resolved_by: data.resolved_by || data.resolvedBy || null,
            resolved_at: data.resolved_at || data.resolvedAt || null,
            resolution_note: data.resolution_note || data.resolutionNote || null,
            created_at: data.created_at || data.createdAt || now(),
            updated_at: data.updated_at || data.updatedAt || now(),
            ...(orgId ? { organization_id: orgId } : {}),
          };
          if (data.client_request_id || data.clientRequestId) {
            insertPayload.client_request_id = data.client_request_id || data.clientRequestId;
          }
        } else if (table === 'tracking_locations') {
          insertPayload = {
            id: data.id || `loc-${data.tripID || data.tripid || Date.now()}`,
            tripid: data.tripID || data.tripid,
            vehicleid: data.vehicleID || data.vehicleid,
            driverid: data.driverID || data.driverid,
            latitude: Number(data.latitude),
            longitude: Number(data.longitude),
            speed: Number(data.speed ?? 0),
            accuracy: data.accuracy !== undefined ? Number(data.accuracy) : null,
            heading: data.heading !== undefined ? Number(data.heading) : null,
            devicetimestamp: data.deviceTimestamp || data.devicetimestamp || now(),
            receivedat: now(),
            updatedat: now(),
            ...(orgId ? { organization_id: orgId } : {}),
          };
        }

        for (const col of Object.keys(insertPayload)) {
          if (knownMissingColumns.has(`${table}.${col}`)) {
            delete (insertPayload as any)[col];
          }
        }

        console.log(`\n--------------------------------------------------`);
        console.log(`[DB Insert] Table: "${table}"`);
        console.log(`[DB Insert] Supabase Insert Payload:`, JSON.stringify(insertPayload, null, 2));

        let { data: created, error } = await supabase.from(table).insert(insertPayload).select('*').single();

        // Handle schema cache missing column errors by removing the unrecognized column and retrying
        while (error && (error.code === 'PGRST204' || error.message?.includes('schema cache'))) {
          const match = error.message.match(/Could not find the '([^']+)' column/i);
          if (match && match[1] && (insertPayload as any)[match[1]] !== undefined) {
            knownMissingColumns.add(`${table}.${match[1]}`);
            console.warn(`[DB Insert] Column '${match[1]}' not found in Supabase '${table}' schema cache. Cached and retrying without it.`);
            delete (insertPayload as any)[match[1]];
            const retryRes = await supabase.from(table).insert(insertPayload).select('*').single();
            created = retryRes.data;
            error = retryRes.error;
          } else {
            break;
          }
        }

        if (!error && created) {
          console.log(`[DB Insert SUCCESS] Saved to Supabase table "${table}":`, JSON.stringify(created, null, 2));
          console.log(`--------------------------------------------------\n`);
          return normalizeDbRow(table, { ...created, ...row });
        }

        // Database write failure in persistent Supabase mode
        const errMsg = error?.message || 'Database insert failed';
        if (error?.code === '23505' || errMsg.includes('duplicate key') || errMsg.includes('unique constraint') || errMsg.includes('already exists')) {
          const duplicateError: any = new Error(errMsg || 'Duplicate key violation');
          duplicateError.code = '23505';
          throw duplicateError;
        }

        console.error(`[DB Insert Error] Table "${table}" Supabase insert failed:`, errMsg);
        throw new Error(`Database insert failed for table ${table}: ${errMsg}`);
      } catch (err: any) {
        if (err?.code === '23505' || err?.message?.includes('duplicate key') || err?.message?.includes('unique constraint') || err?.message?.includes('already exists')) {
          throw err;
        }
        console.error(`[DB Insert Exception] Table "${table}":`, err);
        throw err;
      }
    }

    // In-memory uniqueness validation for vehicles and users
    if (table === 'vehicles') {
      const reg = String(data.registrationNumber || data.registrationnumber || '').trim().toUpperCase();
      if (reg) {
        const existingVeh = memory.vehicles.find(v =>
          String(v.registrationNumber || v.registrationnumber || '').trim().toUpperCase() === reg
        );
        if (existingVeh) {
          const dupErr: any = new Error(`Vehicle with registration number '${reg}' already exists`);
          dupErr.code = '23505';
          throw dupErr;
        }
      }
    } else if (table === 'users') {
      const email = String(data.email || '').trim().toLowerCase();
      if (email) {
        const existingUser = memory.users.find(u =>
          String(u.email || '').trim().toLowerCase() === email
        );
        if (existingUser) {
          const dupErr: any = new Error(`User with email '${email}' already exists`);
          dupErr.code = '23505';
          throw dupErr;
        }
      }
    } else if (table === 'emergency_alerts') {
      const cId = data.client_request_id || data.clientRequestId;
      if (cId) {
        const existing = memory.emergency_alerts.find(a =>
          (a.client_request_id === cId || a.clientRequestId === cId)
        );
        if (existing) {
          const dupErr: any = new Error(`Emergency alert with clientRequestId '${cId}' already exists`);
          dupErr.code = '23505';
          throw dupErr;
        }
      }
    }

    console.log(`[DB Insert Memory] Fallback to in-memory for table "${table}":`, JSON.stringify(row, null, 2));
    memory[table].unshift(row);
    return normalizeDbRow(table, row);
  },

  async update(table: Table, key: Record<string, any>, patch: any) {
    if (supabase) {
      try {
        const timeField =
          table === 'conversations' ||
          table === 'messages' ||
          table === 'conversation_participants' ||
          table === 'organizations' ||
          table === 'organization_memberships' ||
          table === 'platform_admins' ||
          table === 'emergency_alerts'
            ? 'updated_at'
            : 'updatedat';
        let cleanPatch: Record<string, any> = { ...patch, [timeField]: now() };
        if (table === 'users') {
          cleanPatch = {};
          if (patch.name !== undefined) cleanPatch.name = patch.name;
          if (patch.email !== undefined) cleanPatch.email = patch.email;
          if (patch.phoneNo !== undefined || patch.phoneno !== undefined) cleanPatch.phoneno = patch.phoneNo ?? patch.phoneno;
          if (patch.passwordHash !== undefined || patch.passwordhash !== undefined) cleanPatch.passwordhash = patch.passwordHash ?? patch.passwordhash;
          if (patch.role !== undefined) cleanPatch.role = patch.role;
          if (patch.licenseNo !== undefined || patch.licenseno !== undefined) cleanPatch.licenseno = patch.licenseNo ?? patch.licenseno;
          if (patch.licenseExpiryDate !== undefined || patch.licenseexpirydate !== undefined) cleanPatch.licenseexpirydate = patch.licenseExpiryDate ?? patch.licenseexpirydate;
          if (patch.trips !== undefined) cleanPatch.trips = Number(patch.trips);
          if (patch.safetyScore !== undefined || patch.safetyscore !== undefined) cleanPatch.safetyscore = Number(patch.safetyScore ?? patch.safetyscore);
          if (patch.status !== undefined) cleanPatch.status = patch.status;
          if (patch.mustChangePassword !== undefined || patch.mustchangepassword !== undefined || patch.must_change_password !== undefined) {
            cleanPatch.mustchangepassword = Boolean(patch.mustChangePassword ?? patch.mustchangepassword ?? patch.must_change_password);
          }
          if (patch.organization_id !== undefined || patch.organizationId !== undefined) {
            cleanPatch.organization_id = patch.organization_id ?? patch.organizationId;
          }
          cleanPatch[timeField] = now();
        } else if (table === 'attendance_records') {
          cleanPatch = {};
          if (patch.clockOutTime !== undefined || patch.clockouttime !== undefined) {
            cleanPatch.clockouttime = patch.clockOutTime ?? patch.clockouttime;
          }
          if (patch.status !== undefined) cleanPatch.status = patch.status;
          if (patch.latitude !== undefined) cleanPatch.latitude = Number(patch.latitude);
          if (patch.longitude !== undefined) cleanPatch.longitude = Number(patch.longitude);
          if (patch.locationName || patch.locationname) cleanPatch.locationname = patch.locationName || patch.locationname;
          if (patch.is_geofence_exception !== undefined || patch.isGeofenceException !== undefined) {
            cleanPatch.is_geofence_exception = Boolean(patch.is_geofence_exception ?? patch.isGeofenceException);
          }
          if (patch.exception_reason !== undefined || patch.exceptionReason !== undefined) {
            cleanPatch.exception_reason = patch.exception_reason ?? patch.exceptionReason;
          }
          if (patch.trip_id !== undefined || patch.tripId !== undefined) {
            cleanPatch.trip_id = patch.trip_id ?? patch.tripId;
          }
          if (patch.exception_distance !== undefined || patch.exceptionDistance !== undefined) {
            cleanPatch.exception_distance = Number(patch.exception_distance ?? patch.exceptionDistance);
          }
          if (patch.exception_action !== undefined || patch.exceptionAction !== undefined) {
            cleanPatch.exception_action = patch.exception_action ?? patch.exceptionAction;
          }
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
        } else if (table === 'conversations') {
          cleanPatch = {};
          if (patch.updated_at !== undefined || patch.updatedAt !== undefined) {
            cleanPatch.updated_at = patch.updated_at ?? patch.updatedAt;
          }
          cleanPatch[timeField] = cleanPatch.updated_at || now();
        } else if (table === 'messages') {
          cleanPatch = {};
          if (patch.delivered_at !== undefined || patch.deliveredAt !== undefined) {
            cleanPatch.delivered_at = patch.delivered_at ?? patch.deliveredAt;
          }
          if (patch.read_at !== undefined || patch.readAt !== undefined) {
            cleanPatch.read_at = patch.read_at ?? patch.readAt;
          }
        } else if (table === 'emergency_alerts') {
          cleanPatch = {};
          if (patch.status !== undefined) cleanPatch.status = patch.status;
          if (patch.acknowledged_by !== undefined || patch.acknowledgedBy !== undefined) {
            cleanPatch.acknowledged_by = patch.acknowledged_by ?? patch.acknowledgedBy;
          }
          if (patch.acknowledged_at !== undefined || patch.acknowledgedAt !== undefined) {
            cleanPatch.acknowledged_at = patch.acknowledged_at ?? patch.acknowledgedAt;
          }
          if (patch.resolved_by !== undefined || patch.resolvedBy !== undefined) {
            cleanPatch.resolved_by = patch.resolved_by ?? patch.resolvedBy;
          }
          if (patch.resolved_at !== undefined || patch.resolvedAt !== undefined) {
            cleanPatch.resolved_at = patch.resolved_at ?? patch.resolvedAt;
          }
          if (patch.resolution_note !== undefined || patch.resolutionNote !== undefined) {
            cleanPatch.resolution_note = patch.resolution_note ?? patch.resolutionNote;
          }
          cleanPatch[timeField] = now();
        } else if (table === 'vehicles') {
          cleanPatch = {};
          if (patch.registrationnumber !== undefined || patch.registrationNumber !== undefined || patch.reg !== undefined) {
            cleanPatch.registrationnumber = patch.registrationnumber ?? patch.registrationNumber ?? patch.reg;
          }
          if (patch.name !== undefined) cleanPatch.name = patch.name;
          if (patch.type !== undefined) cleanPatch.type = String(patch.type).toUpperCase();
          if (patch.maxloadcapacity !== undefined || patch.maxLoadCapacity !== undefined || patch.capacity !== undefined) {
            cleanPatch.maxloadcapacity = Number(patch.maxloadcapacity ?? patch.maxLoadCapacity ?? patch.capacity);
          }
          if (patch.odometer !== undefined) cleanPatch.odometer = Number(patch.odometer);
          if (patch.acquisitioncost !== undefined || patch.acquisitionCost !== undefined || patch.cost !== undefined) {
            cleanPatch.acquisitioncost = Number(patch.acquisitioncost ?? patch.acquisitionCost ?? patch.cost);
          }
          if (patch.status !== undefined) cleanPatch.status = patch.status;
          if (patch.organization_id !== undefined || patch.organizationId !== undefined) {
            cleanPatch.organization_id = patch.organization_id ?? patch.organizationId;
          }
          cleanPatch[timeField] = now();
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
        let { data, error } = await q;

        while (error && (error.code === 'PGRST204' || error.message?.includes('schema cache') || error.code === '23503')) {
          if (error.code === '23503' && cleanPatch.reviewed_by !== undefined) {
            console.warn(`[DB Update] Column 'reviewed_by' violates foreign key in '${table}'. Retrying without it.`);
            delete cleanPatch.reviewed_by;
            let retryQ = supabase.from(table).update(cleanPatch).select('*');
            for (const [k, v] of Object.entries(key)) retryQ = retryQ.eq(k.toLowerCase(), v);
            const retryRes = await retryQ;
            data = retryRes.data;
            error = retryRes.error;
            continue;
          }
          const match = error.message.match(/Could not find the '([^']+)' column/i);
          if (match && match[1] && cleanPatch[match[1]] !== undefined) {
            console.warn(`[DB Update] Column '${match[1]}' not found in Supabase '${table}' schema cache. Retrying without it.`);
            delete cleanPatch[match[1]];
            let retryQ = supabase.from(table).update(cleanPatch).select('*');
            for (const [k, v] of Object.entries(key)) retryQ = retryQ.eq(k.toLowerCase(), v);
            const retryRes = await retryQ;
            data = retryRes.data;
            error = retryRes.error;
          } else {
            break;
          }
        }

        if (!error && data && data.length > 0) {
          console.log(`[DB Update SUCCESS] Table "${table}" updated:`, JSON.stringify(data[0], null, 2));
          console.log(`--------------------------------------------------\n`);
          return normalizeDbRow(table, memRow ? { ...memRow, ...data[0] } : data[0]);
        }

        let qLower = supabase.from(table).update(cleanPatch).select('*');
        for (const [k, v] of Object.entries(key)) qLower = qLower.eq(k, v);
        let resLower = await qLower;

        while (resLower.error && (resLower.error.code === 'PGRST204' || resLower.error.message?.includes('schema cache') || resLower.error.code === '23503')) {
          if (resLower.error.code === '23503' && cleanPatch.reviewed_by !== undefined) {
            console.warn(`[DB Update] Column 'reviewed_by' violates foreign key in '${table}'. Retrying without it.`);
            delete cleanPatch.reviewed_by;
            let retryQLower = supabase.from(table).update(cleanPatch).select('*');
            for (const [k, v] of Object.entries(key)) retryQLower = retryQLower.eq(k, v);
            resLower = await retryQLower;
            continue;
          }
          const match = resLower.error.message.match(/Could not find the '([^']+)' column/i);
          if (match && match[1] && cleanPatch[match[1]] !== undefined) {
            console.warn(`[DB Update] Column '${match[1]}' not found in Supabase '${table}' schema cache. Retrying without it.`);
            delete cleanPatch[match[1]];
            let retryQLower = supabase.from(table).update(cleanPatch).select('*');
            for (const [k, v] of Object.entries(key)) retryQLower = retryQLower.eq(k, v);
            resLower = await retryQLower;
          } else {
            break;
          }
        }

        if (!resLower.error && resLower.data && resLower.data.length > 0) {
          console.log(`[DB Update SUCCESS] Table "${table}" updated:`, JSON.stringify(resLower.data[0], null, 2));
          console.log(`--------------------------------------------------\n`);
          return normalizeDbRow(table, memRow ? { ...memRow, ...resLower.data[0] } : resLower.data[0]);
        }
        if (memRow) return normalizeDbRow(table, memRow);
        return null;
      } catch (err) {
        console.error(`[DB Update ERROR] Supabase update error for table ${table}:`, err);
        return null;
      }
    }
    const row = await this.find(table, key);
    if (!row) return null;
    Object.assign(row, patch, { updatedAt: now(), updatedat: now() });
    return normalizeDbRow(table, row);
  },

  async upsert(table: Table, conflictKey: string, data: any) {
    const row = { ...data, createdAt: data.createdAt ?? now(), updatedAt: now(), updatedat: now() };
    const norm = (s: string) => s.replace(/_/g, '').toLowerCase();
    const conflictVal = data[conflictKey] ?? data[norm(conflictKey)] ?? data[conflictKey.toLowerCase()];

    // 1. In-memory update or insert
    const memIndex = memory[table].findIndex(r => {
      const targetNormKey = norm(conflictKey);
      const matchPropKey = Object.keys(r).find(rk => norm(rk) === targetNormKey);
      return matchPropKey && (r[matchPropKey] === conflictVal || String(r[matchPropKey]) === String(conflictVal));
    });

    if (memIndex >= 0) {
      memory[table][memIndex] = { ...memory[table][memIndex], ...data, updatedAt: now(), updatedat: now() };
    } else {
      memory[table].unshift(row);
    }

    // 2. Supabase upsert
    if (supabase) {
      try {
        let upsertPayload: Record<string, any> = { ...data };
        if (table === 'tracking_locations') {
          upsertPayload = {
            id: data.id || `loc-${conflictVal || Date.now()}`,
            tripid: data.tripID || data.tripid,
            vehicleid: data.vehicleID || data.vehicleid,
            driverid: data.driverID || data.driverid,
            latitude: Number(data.latitude),
            longitude: Number(data.longitude),
            speed: Number(data.speed ?? 0),
            accuracy: data.accuracy !== undefined ? Number(data.accuracy) : null,
            heading: data.heading !== undefined ? Number(data.heading) : null,
            devicetimestamp: data.deviceTimestamp || data.devicetimestamp || now(),
            receivedat: now(),
            updatedat: now(),
          };
        }

        const { data: supaRow, error } = await supabase
          .from(table)
          .upsert(upsertPayload, { onConflict: conflictKey.toLowerCase() })
          .select('*')
          .single();

        if (!error && supaRow) {
          if (memIndex >= 0) {
            memory[table][memIndex] = supaRow;
          }
          return supaRow;
        }

        // Fallback with exact conflictKey name
        const { data: supaRowOrig, error: errorOrig } = await supabase
          .from(table)
          .upsert(upsertPayload, { onConflict: conflictKey })
          .select('*')
          .single();

        if (!errorOrig && supaRowOrig) {
          if (memIndex >= 0) {
            memory[table][memIndex] = supaRowOrig;
          }
          return supaRowOrig;
        }

        if (error || errorOrig) {
          console.warn(`[db.upsert] Table "${table}" Supabase upsert note: ${error?.message || errorOrig?.message}. Preserved in memory.`);
        }
      } catch (err) {
        console.warn(`[db.upsert] Table "${table}" exception:`, err);
      }
    }

    return memIndex >= 0 ? memory[table][memIndex] : row;
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
