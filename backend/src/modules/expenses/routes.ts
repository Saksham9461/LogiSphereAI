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

export const expenseRouter = Router();

const decorate = async (r: any) => {
  if (!r) return null;
  const vId = r.vehicleID || r.vehicleid;
  const tId = r.tripID || r.tripid;
  const eId = r.expenseId || r.expenseid || r.id;
  const vehicleObj = vId ? (await db.find('vehicles', { vehicleID: vId }) || await db.find('vehicles', { vehicleid: vId })) : null;

  return {
    ...r,
    id: eId,
    expenseId: eId,
    vehicleID: vId,
    tripID: tId,
    trip: tId,
    toll: Number(r.toll) || 0,
    other: Number(r.other) || 0,
    maint: Number(r.maint) || 0,
    vehicle: vehicleObj?.name || vId || 'Vehicle',
  };
};

expenseRouter.get('/', optionalAuth, async (req, res) => {
  if (req.user) {
    const currentRole = normalizeRole(req.user?.role);
    const currentUserId = req.user?.id || req.user?.userId;

    if (currentRole === CanonicalRole.DISPATCHER || currentRole === CanonicalRole.SAFETY_OFFICER) {
      return fail(res, 403, 'Forbidden: Insufficient permissions to view expense records');
    }

    const orgId = getTrustedOrgId(req);
    let records = await db.list('expense_records', orgId ? { organization_id: orgId } : undefined);

    if (currentRole === CanonicalRole.DRIVER) {
      const allTrips = await db.list('trips', orgId ? { organization_id: orgId } : undefined);
      const driverTripIds = new Set<string>();
      for (const t of allTrips || []) {
        const tDriver = String(t.driverID || t.driverid || t.driver?.id || '').toLowerCase();
        if (tDriver === String(currentUserId).toLowerCase()) {
          const trId = t.tripID || t.tripid || t.id;
          if (trId) driverTripIds.add(String(trId).toLowerCase());
        }
      }
      records = (records || []).filter((r: any) => {
        const tId = String(r.tripID || r.tripid || '').toLowerCase();
        return driverTripIds.has(tId);
      });
    }

    const decorated = await Promise.all(records.map(decorate));
    return res.json(decorated.filter(Boolean));
  }

  const records = await db.list('expense_records');
  const decorated = await Promise.all(records.map(decorate));
  res.json(decorated.filter(Boolean));
});

expenseRouter.post('/create', optionalAuth, async (req, res) => {
  if (req.user) {
    const callerRole = normalizeRole(req.user.role);
    if (!hasPermission(callerRole, Permission.EXPENSES_CREATE) && callerRole !== CanonicalRole.MANAGER && !req.user.isPlatformAdmin) {
      return fail(res, 403, 'Forbidden: insufficient role permissions to create expense record');
    }
  }
  const orgId = req.user ? getTrustedOrgId(req) : null;
  const created = await db.insert('expense_records', {
    expenseId: db.makeId('exp-'),
    organization_id: orgId,
    ...req.body,
  });
  const decorated = await decorate(created);
  res.status(201).json(decorated);
});
