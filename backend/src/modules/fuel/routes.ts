import {Router} from 'express';
import {db} from '../../config/database';

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

fuelRouter.get('/', async (_req, res) => {
  const records = await db.list('fuel_logs');
  const decorated = await Promise.all(records.map(decorate));
  res.json(decorated.filter(Boolean));
});

fuelRouter.post('/create', async (req, res) => {
  const created = await db.insert('fuel_logs', {
    fuelLogId: db.makeId('fuel-'),
    ...req.body,
    cost: req.body.cost ?? req.body.fuelCost,
  });
  const decorated = await decorate(created);
  res.status(201).json(decorated);
});
