import {Router} from 'express';
import {db} from '../../config/database';
import {optionalAuth, getTrustedOrgId} from '../../middleware/auth';

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
  const orgId = getTrustedOrgId(req);
  const records = await db.list('fuel_logs', orgId ? { organization_id: orgId } : undefined);
  const decorated = await Promise.all(records.map(decorate));
  res.json(decorated.filter(Boolean));
});

fuelRouter.post('/create', optionalAuth, async (req, res) => {
  const orgId = getTrustedOrgId(req);
  const created = await db.insert('fuel_logs', {
    fuelLogId: db.makeId('fuel-'),
    organization_id: orgId,
    ...req.body,
    cost: req.body.cost ?? req.body.fuelCost,
  });
  const decorated = await decorate(created);
  res.status(201).json(decorated);
});
