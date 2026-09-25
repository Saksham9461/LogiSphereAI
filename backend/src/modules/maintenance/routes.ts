import {Router} from 'express';
import {db} from '../../config/database';

export const maintenanceRouter = Router();
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
    status: (r.status === 'ACTIVE' || r.status === 'Active') ? 'Active' : 'Completed',
    vehicle: vehicleObj?.name || vId || 'Vehicle',
  };
};

maintenanceRouter.get('/', async (_req, res) => {
  const records = await db.list('maintenance_records');
  const decorated = await Promise.all(records.map(decorate));
  res.json(decorated.filter(Boolean));
});

maintenanceRouter.post('/create', async (req, res) => {
  const created = await db.insert('maintenance_records', { id: db.makeId('mnt-'), ...req.body });
  const decorated = await decorate(created);
  res.status(201).json(decorated);
});
