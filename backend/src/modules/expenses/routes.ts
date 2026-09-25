import {Router} from 'express';
import {db} from '../../config/database';

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

expenseRouter.get('/', async (_req, res) => {
  const records = await db.list('expense_records');
  const decorated = await Promise.all(records.map(decorate));
  res.json(decorated.filter(Boolean));
});

expenseRouter.post('/create', async (req, res) => {
  const created = await db.insert('expense_records', {
    expenseId: db.makeId('exp-'),
    ...req.body,
  });
  const decorated = await decorate(created);
  res.status(201).json(decorated);
});
