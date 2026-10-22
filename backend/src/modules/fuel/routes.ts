import { Router } from 'express';
import { db } from '../../config/database';
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
import { fail } from '../../utils/http';

export const fuelRouter = Router();

const decorate = async (r: any) => {
  if (!r) return null;
  const vId = r.vehicleID || r.vehicleid;
  const fId = r.fuelLogId || r.fuellogid || r.id;
  const vehicleObj = vId ? (await db.find('vehicles', { vehicleID: vId }) || await db.find('vehicles', { vehicleid: vId })) : null;

  return {
    ...r,
    id: fId,
    fuelLogId: fId,
    vehicleID: vId,
    date: r.date,
    liters: Number(r.liters) || 0,
    cost: Number(r.cost ?? r.fuelCost) || 0,
    vehicle: vehicleObj?.name || vId || 'Vehicle',
  };
};

fuelRouter.get('/', optionalAuth, async (req, res) => {
  if (req.user) {
    const currentRole = normalizeRole(req.user?.role);
    const currentUserId = req.user?.id || req.user?.userId;

    if (currentRole === CanonicalRole.DISPATCHER || currentRole === CanonicalRole.SAFETY_OFFICER) {
      return fail(res, 403, 'Forbidden: Insufficient permissions to view fuel financial logs');
    }

    const orgId = getTrustedOrgId(req);
    let records = await db.list('fuel_logs', orgId ? { organization_id: orgId } : undefined);

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
        const vId = String(r.vehicleID || r.vehicleid || '').toLowerCase();
        return driverVehIds.has(vId);
      });
    }

    const decorated = await Promise.all(records.map(decorate));
    return res.json(decorated.filter(Boolean));
  }

  const records = await db.list('fuel_logs');
  const decorated = await Promise.all(records.map(decorate));
  res.json(decorated.filter(Boolean));
});

fuelRouter.post('/create', optionalAuth, async (req, res) => {
  if (req.user) {
    const callerRole = normalizeRole(req.user.role);
    if (!hasPermission(callerRole, Permission.FUEL_CREATE) && callerRole !== CanonicalRole.MANAGER && !req.user.isPlatformAdmin) {
      return fail(res, 403, 'Forbidden: insufficient role permissions to create fuel log');
    }
  }
  const orgId = req.user ? getTrustedOrgId(req) : null;
  const created = await db.insert('fuel_logs', {
    fuelLogId: db.makeId('fuel-'),
    organization_id: orgId,
    ...req.body,
    cost: req.body.cost ?? req.body.fuelCost,
  });
  const decorated = await decorate(created);
  res.status(201).json(decorated);
});
