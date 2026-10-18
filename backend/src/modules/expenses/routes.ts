import {Router} from 'express';
import {db} from '../../config/database';
import {optionalAuth, getTrustedOrgId} from '../../middleware/auth';

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
  const orgId = getTrustedOrgId(req);
  const records = await db.list('expense_records', orgId ? { organization_id: orgId } : undefined);
  const decorated = await Promise.all(records.map(decorate));
  res.json(decorated.filter(Boolean));
});

expenseRouter.post('/create', optionalAuth, async (req, res) => {
  const orgId = getTrustedOrgId(req);
  const created = await db.insert('expense_records', {
    expenseId: db.makeId('exp-'),
    organization_id: orgId,
    ...req.body,
  });
  const decorated = await decorate(created);
  res.status(201).json(decorated);
});
