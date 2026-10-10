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
    status: (r.status === 'ACTIVE' || r.status === 'Active' || r.status === 'In Shop') ? 'Active' : 'Completed',
    rawStatus: (r.status === 'ACTIVE' || r.status === 'Active' || r.status === 'In Shop') ? 'ACTIVE' : 'COMPLETED',
    vehicle: vehicleObj?.name || vId || 'Vehicle',
  };
};

maintenanceRouter.get('/', async (_req, res) => {
  const records = await db.list('maintenance_records');

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

maintenanceRouter.post('/create', async (req, res) => {
  const vId = req.body.vehicleID || req.body.vehicleid;
  const rawStatus = String(req.body.status || 'ACTIVE').toUpperCase();
  const dbStatus = (rawStatus === 'ACTIVE' || rawStatus === 'IN SHOP') ? 'ACTIVE' : 'COMPLETED';

  const created = await db.insert('maintenance_records', {
    id: db.makeId('mnt-'),
    ...req.body,
    status: dbStatus,
  });

  // If new maintenance is in shop, update vehicle status to IN_SHOP
  if (vId && dbStatus === 'ACTIVE') {
    const veh = await db.find('vehicles', { vehicleID: vId }) || await db.find('vehicles', { vehicleid: vId });
    if (veh) {
      const vKey = veh.vehicleID ? { vehicleID: veh.vehicleID } : { vehicleid: veh.vehicleid || veh.id };
      await db.update('vehicles', vKey, { status: 'IN_SHOP' });
    }
  }

  const decorated = await decorate(created);
  res.status(201).json(decorated);
});

// Complete maintenance handler (PUT & POST /api/maintenance/:id/complete)
async function handleCompleteMaintenance(req: any, res: any) {
  const { id } = req.params;
  const record = await db.find('maintenance_records', { id });
  if (!record) {
    return res.status(404).json({ success: false, message: 'Maintenance record not found' });
  }

  // Update maintenance record to COMPLETED
  await db.update('maintenance_records', { id }, { status: 'COMPLETED' });

  // Check if vehicle has any other active maintenance records
  const vId = record.vehicleID || record.vehicleid;
  if (vId) {
    const allMaint = await db.list('maintenance_records');
    const remainingActive = allMaint.filter((m: any) => {
      const mVId = m.vehicleID || m.vehicleid;
      const mStatus = String(m.status || '').toUpperCase();
      return (
        m.id !== id &&
        mVId === vId &&
        (mStatus === 'ACTIVE' || mStatus === 'IN SHOP')
      );
    });

    // If no more active maintenance records for this vehicle, restore vehicle status to AVAILABLE
    if (remainingActive.length === 0) {
      const veh = await db.find('vehicles', { vehicleID: vId }) || await db.find('vehicles', { vehicleid: vId });
      if (veh) {
        const vKey = veh.vehicleID ? { vehicleID: veh.vehicleID } : { vehicleid: veh.vehicleid || veh.id };
        await db.update('vehicles', vKey, { status: 'AVAILABLE' });
      }
    }
  }

  const updated = await db.find('maintenance_records', { id });
  const decorated = await decorate(updated || { ...record, status: 'COMPLETED' });
  return res.json({ success: true, message: 'Maintenance marked as completed', data: decorated });
}

maintenanceRouter.put('/:id/complete', handleCompleteMaintenance);
maintenanceRouter.post('/:id/complete', handleCompleteMaintenance);
