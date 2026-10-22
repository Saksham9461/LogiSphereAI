import { Router } from 'express';
import { db } from '../../config/database';
import { fail } from '../../utils/http';
import {
  requireOrgMembership,
  requireOrgPermission,
  optionalAuth,
  getTrustedOrgId,
  Permission,
  CanonicalRole,
  hasPermission,
  normalizeRole,
} from '../../middleware/auth';

export const maintenanceRouter = Router();

const ACTIVE_TRIP_STATUSES = [
  'ACCEPTED',
  'ASSIGNED',
  'DISPATCHED',
  'GOING_TO_PICKUP',
  'ARRIVED_AT_PICKUP',
  'PICKED_UP',
  'IN_TRANSIT',
  'ARRIVED_AT_DROP',
];

const decorate = async (r: any) => {
  if (!r) return null;
  const vId = r.vehicleID || r.vehicleid;
  const sType = r.serviceType || r.servicetype || r.service;
  const vehicleObj = vId ? (await db.find('vehicles', { vehicleID: vId }) || await db.find('vehicles', { vehicleid: vId })) : null;

  return {
    ...r,
    id: r.id,
    vehicleID: vId,
    serviceType: sType,
    service: sType,
    status: (r.status === 'ACTIVE' || r.status === 'Active' || r.status === 'In Shop') ? 'Active' : 'Completed',
    rawStatus: (r.status === 'ACTIVE' || r.status === 'Active' || r.status === 'In Shop') ? 'ACTIVE' : 'COMPLETED',
    vehicle: vehicleObj?.name || vId || 'Vehicle',
  };
};

maintenanceRouter.get('/', optionalAuth, async (req, res) => {
  const currentRole = req.user ? normalizeRole(req.user.role) : null;
  const currentUserId = req.user?.id || req.user?.userId;
  const orgId = req.user ? getTrustedOrgId(req) : null;

  let records = await db.list('maintenance_records', orgId ? { organization_id: orgId } : undefined);

  if (currentRole === CanonicalRole.DRIVER) {
    const allTrips = await db.list('trips', orgId ? { organization_id: orgId } : undefined);
    const driverVehIds = new Set<string>();
    for (const t of allTrips || []) {
      const tDriver = String(t.driverID || t.driverid || t.driver?.id || '').toLowerCase();
      if (tDriver === String(currentUserId).toLowerCase()) {
        const vId = t.vehicleID || t.vehicleid || t.vehicle?.id;
        if (vId) driverVehIds.add(String(vId).toLowerCase());
      }
    }
    records = (records || []).filter((r: any) => {
      const rVehId = String(r.vehicleID || r.vehicleid || '').toLowerCase();
      return driverVehIds.has(rVehId);
    });
  } else if (currentRole && !hasPermission(currentRole, Permission.MAINTENANCE_VIEW) && !hasPermission(currentRole, Permission.MAINTENANCE_VIEW_STATUS) && !req.user?.isPlatformAdmin) {
    return fail(res, 403, 'Forbidden: insufficient role permissions to view maintenance records');
  }

  // Synchronize: vehicles with active maintenance must be marked IN_SHOP
  for (const r of records) {
    const isAct = r.status === 'ACTIVE' || r.status === 'Active' || r.status === 'In Shop';
    const vId = r.vehicleID || r.vehicleid;
    if (isAct && vId) {
      const veh = await db.find('vehicles', { vehicleID: vId }) || await db.find('vehicles', { vehicleid: vId });
      if (veh && veh.status === 'AVAILABLE') {
        const vKey = veh.vehicleID ? { vehicleID: veh.vehicleID } : { vehicleid: veh.vehicleid || veh.id };
        await db.update('vehicles', vKey, { status: 'IN_SHOP' });
      }
    }
  }

  const decorated = await Promise.all(records.map(decorate));
  res.json(decorated.filter(Boolean));
});

maintenanceRouter.post('/create', optionalAuth, async (req, res) => {
  if (req.user) {
    const callerRole = normalizeRole(req.user.role);
    if (!hasPermission(callerRole, Permission.MAINTENANCE_CREATE) && !hasPermission(callerRole, Permission.MAINTENANCE_INSPECT) && !req.user.isPlatformAdmin) {
      return fail(res, 403, 'Forbidden: insufficient role permissions to create maintenance records');
    }
  }
  const orgId = req.user ? getTrustedOrgId(req) : null;
  const vId = req.body.vehicleID || req.body.vehicleid;
  if (!vId) {
    return fail(res, 400, 'Vehicle ID is required');
  }

  let veh = await db.find('vehicles', { vehicleID: vId }) || await db.find('vehicles', { vehicleid: vId });
  if (!veh) {
    const allVeh = await db.list('vehicles');
    veh = (allVeh || []).find((v: any) =>
      String(v.vehicleID || v.vehicleid || v.id || '').toLowerCase() === String(vId).toLowerCase()
    );
  }
  if (!veh || (orgId && veh.organization_id && veh.organization_id !== orgId)) {
    return fail(res, 404, `Vehicle ${vId} not found`);
  }

  const vStatus = String(veh.status || '').toUpperCase();
  if (vStatus === 'RETIRED') {
    return fail(res, 400, `Cannot create maintenance for retired vehicle ${veh.name || vId}`);
  }

  // Prevent maintenance creation from overriding active-trip constraints (Rule 8)
  const allTrips = await db.list('trips', orgId ? { organization_id: orgId } : undefined);
  const activeTrip = (allTrips || []).find((t: any) => {
    const tVId = String(t.vehicleID || t.vehicleid || '').toLowerCase();
    const tStatus = String(t.status || '').toUpperCase();
    return (
      (tVId === String(vId).toLowerCase() || (veh.id && tVId === String(veh.id).toLowerCase()) || (veh.vehicleID && tVId === String(veh.vehicleID).toLowerCase())) &&
      ACTIVE_TRIP_STATUSES.includes(tStatus)
    );
  });
  if (vStatus === 'ON_TRIP' || activeTrip) {
    return fail(res, 400, `Cannot place vehicle ${veh.name || vId} into maintenance: vehicle is currently assigned to active trip ${activeTrip?.tripID || activeTrip?.tripid || ''}`);
  }

  const rawStatus = String(req.body.status || 'ACTIVE').toUpperCase();
  const dbStatus = (rawStatus === 'ACTIVE' || rawStatus === 'IN SHOP') ? 'ACTIVE' : 'COMPLETED';

  // If new maintenance is active, update vehicle status to IN_SHOP immediately
  if (dbStatus === 'ACTIVE') {
    const vKey = veh.vehicleID ? { vehicleID: veh.vehicleID } : { vehicleid: veh.vehicleid || veh.id };
    await db.update('vehicles', vKey, { status: 'IN_SHOP' });
  }

  const created = await db.insert('maintenance_records', {
    id: db.makeId('mnt-'),
    organization_id: orgId,
    ...req.body,
    vehicleID: veh.vehicleID || veh.vehicleid || vId,
    status: dbStatus,
  });

  const decorated = await decorate(created);
  res.status(201).json(decorated);
});

// Complete maintenance handler (PUT & POST /api/maintenance/:id/complete) (Rule 9)
async function handleCompleteMaintenance(req: any, res: any) {
  if (req.user) {
    const callerRole = normalizeRole(req.user.role);
    if (!hasPermission(callerRole, Permission.MAINTENANCE_UPDATE) && !req.user.isPlatformAdmin) {
      return fail(res, 403, 'Forbidden: insufficient role permissions to update maintenance');
    }
  }
  const { id } = req.params;
  const record = await db.find('maintenance_records', { id });
  if (!record) {
    return res.status(404).json({ success: false, message: 'Maintenance record not found' });
  }

  const currentStatus = String(record.status || '').toUpperCase();
  if (currentStatus === 'COMPLETED') {
    // Idempotent safe handling for repeated closure requests
    const decorated = await decorate(record);
    return res.json({ success: true, message: 'Maintenance record is already completed', data: decorated });
  }

  // Update maintenance record to COMPLETED
  await db.update('maintenance_records', { id }, { status: 'COMPLETED' });

  // Check if vehicle has any other active maintenance records
  const vId = record.vehicleID || record.vehicleid;
  if (vId) {
    const allMaint = await db.list('maintenance_records');
    const remainingActive = (allMaint || []).filter((m: any) => {
      const mId = String(m.id || '');
      const mVId = String(m.vehicleID || m.vehicleid || '');
      const mStatus = String(m.status || '').toUpperCase();
      return (
        mId !== String(id) &&
        mVId.toLowerCase() === String(vId).toLowerCase() &&
        (mStatus === 'ACTIVE' || mStatus === 'IN SHOP')
      );
    });

    let veh = await db.find('vehicles', { vehicleID: vId }) || await db.find('vehicles', { vehicleid: vId });
    if (!veh) {
      const allVeh = await db.list('vehicles');
      veh = (allVeh || []).find((v: any) =>
        String(v.vehicleID || v.vehicleid || v.id || '').toLowerCase() === String(vId).toLowerCase()
      );
    }

    if (veh) {
      const vKey = veh.vehicleID ? { vehicleID: veh.vehicleID } : { vehicleid: veh.vehicleid || veh.id };
      const vStatus = String(veh.status || '').toUpperCase();

      if (remainingActive.length > 0) {
        // Vehicle must remain IN_SHOP if there are other open service records
        if (vStatus !== 'IN_SHOP') {
          await db.update('vehicles', vKey, { status: 'IN_SHOP' });
        }
      } else {
        // No remaining active maintenance:
        // Rule 9: NEVER change a Retired vehicle to Available!
        if (vStatus === 'RETIRED') {
          // Keep as RETIRED
        } else {
          // Check if vehicle has another active trip
          const allTrips = await db.list('trips');
          const hasActiveTrip = (allTrips || []).some((t: any) => {
            const tVId = String(t.vehicleID || t.vehicleid || '').toLowerCase();
            const tStatus = String(t.status || '').toUpperCase();
            return (
              (tVId === String(vId).toLowerCase() || (veh.id && tVId === String(veh.id).toLowerCase())) &&
              ACTIVE_TRIP_STATUSES.includes(tStatus)
            );
          });

          if (hasActiveTrip) {
            await db.update('vehicles', vKey, { status: 'ON_TRIP' });
          } else {
            await db.update('vehicles', vKey, { status: 'AVAILABLE' });
          }
        }
      }
    }
  }

  const updated = await db.find('maintenance_records', { id });
  const decorated = await decorate(updated || { ...record, status: 'COMPLETED' });
  return res.json({ success: true, message: 'Maintenance marked as completed', data: decorated });
}

maintenanceRouter.put('/:id/complete', optionalAuth, handleCompleteMaintenance);
maintenanceRouter.post('/:id/complete', optionalAuth, handleCompleteMaintenance);

