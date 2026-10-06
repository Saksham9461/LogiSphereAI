import {Router} from 'express';
import {db} from '../../config/database';
import {fail} from '../../utils/http';
import {optionalAuth} from '../../middleware/auth';

export const vehicleRouter = Router();

function fromDbVehicle(row: any) {
  if (!row) return row;
  const vehicleID = row.vehicleID ?? row.vehicleid ?? row.id;
  const maxLoadCapacity = Number(row.maxLoadCapacity ?? row.maxloadcapacity ?? row.capacity ?? 0);
  const acquisitionCost = Number(row.acquisitionCost ?? row.acquisitioncost ?? row.cost ?? 0);
  const createdAt = row.createdAt ?? row.createdat;
  const updatedAt = row.updatedAt ?? row.updatedat;

  return {
    vehicleID,
    id: vehicleID,
    registrationNumber: row.registrationNumber ?? row.reg ?? '',
    name: row.name ?? '',
    type: row.type ?? '',
    maxLoadCapacity,
    capacity: maxLoadCapacity,
    odometer: Number(row.odometer ?? 0),
    acquisitionCost,
    cost: acquisitionCost,
    status: row.status ?? 'AVAILABLE',
    createdAt,
    updatedAt,
  };
}

vehicleRouter.get('/', async (_req, res) => {
  try {
    const rawVehicles = await db.list('vehicles');
    const vehicles = (rawVehicles || []).map(fromDbVehicle);
    return res.json(vehicles);
  } catch (error: any) {
    console.error('Error fetching vehicles:', error?.message || error);
    return fail(res, 500, error?.message || 'Failed to fetch vehicles');
  }
});

vehicleRouter.post('/create', optionalAuth, async (req, res) => {
  try {
    // Check RBAC if authenticated
    if (req.user && req.user.role === 'ROLE_DRIVER') {
      return fail(res, 403, 'Drivers are not authorized to create vehicles');
    }

    const body = req.body ?? {};
    const registrationNumber = String(body.registrationNumber ?? '').trim().toUpperCase();
    const name = String(body.name ?? '').trim();
    const rawType = String(body.type ?? '').trim().toUpperCase();
    const rawStatus = String(body.status ?? 'AVAILABLE').trim().toUpperCase().replace(/\s+/g, '_');
    const maxLoadCapacity = Number(body.maxLoadCapacity ?? body.capacity ?? 0);
    const odometer = Number(body.odometer ?? 0);
    const acquisitionCost = Number(body.acquisitionCost ?? body.cost ?? 0);

    // Validation
    if (!registrationNumber) {
      return fail(res, 400, 'Registration number is required');
    }
    if (!name) {
      return fail(res, 400, 'Vehicle name is required');
    }
    if (!rawType) {
      return fail(res, 400, 'Vehicle type is required');
    }
    if (isNaN(maxLoadCapacity) || maxLoadCapacity <= 0) {
      return fail(res, 400, 'Maximum load capacity must be a positive number');
    }
    if (isNaN(odometer) || odometer < 0) {
      return fail(res, 400, 'Odometer must be a non-negative number');
    }
    if (isNaN(acquisitionCost) || acquisitionCost < 0) {
      return fail(res, 400, 'Acquisition cost must be a non-negative number');
    }

    const allowedTypes = ['VAN', 'TRUCK', 'MINI', 'CAR', 'BUS', 'BIKE', 'OTHER'];
    const type = allowedTypes.includes(rawType) ? rawType : 'VAN';

    const allowedStatuses = ['AVAILABLE', 'ON_TRIP', 'IN_SHOP', 'MAINTENANCE', 'RETIRED', 'INACTIVE'];
    const status = allowedStatuses.includes(rawStatus) ? rawStatus : 'AVAILABLE';

    // Duplicate Check
    const existing = await db.find('vehicles', {registrationNumber});
    if (existing) {
      return fail(res, 409, `Vehicle with registration number '${registrationNumber}' already exists`);
    }

    const vehicleID = body.vehicleID || db.makeId('veh-');

    // Database record payload matching Supabase PostgreSQL schema
    const dbPayload = {
      vehicleid: vehicleID,
      registrationNumber,
      name,
      type,
      maxloadcapacity: maxLoadCapacity,
      odometer,
      acquisitioncost: acquisitionCost,
      status
    };

    const inserted = await db.insert('vehicles', dbPayload);
    const formattedVehicle = fromDbVehicle(inserted);

    return res.status(201).json({
      success: true,
      message: 'Vehicle registered successfully',
      vehicle: formattedVehicle,
      data: formattedVehicle
    });
  } catch (error: any) {
    console.error('Error creating vehicle:', error);
    const msg = error?.message || '';
    if (msg.includes('duplicate') || msg.includes('unique') || error?.code === '23505') {
      return fail(res, 409, 'Vehicle with this registration number already exists');
    }
    if (msg.includes('PGRST205') || msg.includes('schema cache')) {
      return fail(res, 500, "Database table 'vehicles' not found in Supabase. Please ensure 001_initial_schema.sql migration is executed.");
    }
    return fail(res, 500, msg || 'Failed to create vehicle');
  }
});

vehicleRouter.put('/update/', async (req, res) => {
  try {
    const id = String(req.query.id ?? req.body?.vehicleID ?? req.body?.vehicleid ?? '');
    if (!id) return fail(res, 400, 'Vehicle ID is required');

    const body = req.body ?? {};
    const patch: Record<string, any> = {};

    if (body.registrationNumber !== undefined || body.registrationnumber !== undefined || body.reg !== undefined) {
      const reg = body.registrationNumber ?? body.registrationnumber ?? body.reg;
      if (reg) patch.registrationNumber = String(reg).trim().toUpperCase();
    }
    if (body.name !== undefined || body.vehicleName !== undefined) {
      const name = String(body.name ?? body.vehicleName).trim();
      if (name) patch.name = name;
    }
    if (body.type !== undefined) {
      const rawType = String(body.type).trim().toUpperCase();
      const allowedTypes = ['VAN', 'TRUCK', 'MINI', 'CAR', 'BUS', 'BIKE', 'OTHER'];
      patch.type = allowedTypes.includes(rawType) ? rawType : 'VAN';
    }
    if (body.maxLoadCapacity !== undefined || body.maxloadcapacity !== undefined || body.capacity !== undefined) {
      const val = Number(body.maxLoadCapacity ?? body.maxloadcapacity ?? body.capacity);
      if (!isNaN(val)) patch.maxloadcapacity = val;
    }
    if (body.odometer !== undefined) {
      const val = Number(body.odometer);
      if (!isNaN(val)) patch.odometer = val;
    }
    if (body.acquisitionCost !== undefined || body.acquisitioncost !== undefined || body.cost !== undefined) {
      const val = Number(body.acquisitionCost ?? body.acquisitioncost ?? body.cost);
      if (!isNaN(val)) patch.acquisitioncost = val;
    }
    if (body.status !== undefined) {
      const rawStatus = String(body.status).trim().toUpperCase().replace(/\s+/g, '_');
      const allowedStatuses = ['AVAILABLE', 'ON_TRIP', 'IN_SHOP', 'MAINTENANCE', 'RETIRED', 'INACTIVE'];
      patch.status = allowedStatuses.includes(rawStatus) ? rawStatus : 'AVAILABLE';
    }

    const updated = await db.update('vehicles', {vehicleid: id}, patch);
    if (!updated) return fail(res, 404, 'Vehicle not found');
    const formatted = fromDbVehicle(updated);
    return res.json({success: true, vehicle: formatted, data: formatted});
  } catch (error: any) {
    console.error('Error updating vehicle:', error?.message || error);
    return fail(res, 500, error?.message || 'Failed to update vehicle');
  }
});

vehicleRouter.delete('/delete/', optionalAuth, async (req, res) => {
  try {
    if (req.user && req.user.role === 'ROLE_DRIVER') {
      return fail(res, 403, 'Drivers are not authorized to delete vehicles');
    }

    const id = String(req.query.id ?? req.body?.id ?? req.body?.vehicleID ?? req.body?.vehicleid ?? '');
    const forceConfirm = req.query.confirm === 'true' || req.body?.confirm === true;
    if (!id) return fail(res, 400, 'Vehicle ID is required');

    const existing = await db.find('vehicles', { vehicleid: id });
    if (!existing) return fail(res, 404, 'Vehicle not found');

    const vehicleIdLower = id.toLowerCase();

    // 1. Check active trips
    const allTrips = await db.list('trips');
    const activeStatuses = new Set([
      'ACCEPTED',
      'ASSIGNED',
      'GOING_TO_PICKUP',
      'ARRIVED_AT_PICKUP',
      'PICKED_UP',
      'IN_TRANSIT',
      'ARRIVED_AT_DROP',
      'DISPATCHED',
      'PENDING_APPROVAL',
    ]);

    const activeTrip = (allTrips || []).find((t: any) => {
      const tVehID = String(t.vehicleID || t.vehicleid || '').toLowerCase();
      const statusKey = String(t.status || '').trim().toUpperCase();
      return tVehID === vehicleIdLower && activeStatuses.has(statusKey);
    });

    if (activeTrip) {
      return res.status(409).json({
        success: false,
        message: 'Vehicle cannot be deleted because it is currently assigned to an active trip.',
        activeTripID: activeTrip.tripID || activeTrip.tripid,
      });
    }

    // 2. Check vehicle status
    const currentStatus = String(existing.status || '').toUpperCase().replace(/\s+/g, '_');
    if (currentStatus === 'ON_TRIP') {
      return res.status(409).json({
        success: false,
        message: 'Vehicle cannot be deleted because it is currently on a trip.',
      });
    }
    if (currentStatus === 'IN_SHOP' || currentStatus === 'MAINTENANCE') {
      return res.status(409).json({
        success: false,
        message: 'Vehicle cannot be deleted because it is currently undergoing maintenance in shop.',
      });
    }

    // 3. Check historical records (maintenance, fuel, expenses, completed trips)
    const [allMaint, allFuel, allExpenses] = await Promise.all([
      db.list('maintenance_records'),
      db.list('fuel_logs'),
      db.list('expense_records'),
    ]);

    const maintCount = (allMaint || []).filter((m: any) => String(m.vehicleID || m.vehicleid || '').toLowerCase() === vehicleIdLower).length;
    const fuelCount = (allFuel || []).filter((f: any) => String(f.vehicleID || f.vehicleid || '').toLowerCase() === vehicleIdLower).length;
    const expenseCount = (allExpenses || []).filter((e: any) => String(e.vehicleID || e.vehicleid || '').toLowerCase() === vehicleIdLower).length;
    const completedTripsCount = (allTrips || []).filter((t: any) => {
      const tVehID = String(t.vehicleID || t.vehicleid || '').toLowerCase();
      const statusKey = String(t.status || '').trim().toUpperCase();
      return tVehID === vehicleIdLower && (statusKey === 'DELIVERED' || statusKey === 'COMPLETED' || statusKey === 'REJECTED' || statusKey === 'CANCELLED');
    }).length;

    const totalHistoricalRecords = maintCount + fuelCount + expenseCount + completedTripsCount;

    if (totalHistoricalRecords > 0 && !forceConfirm) {
      return res.status(409).json({
        success: false,
        requiresConfirmation: true,
        historicalRecordsCount: totalHistoricalRecords,
        message: `Vehicle has ${totalHistoricalRecords} historical record(s) (${maintCount} maintenance, ${fuelCount} fuel, ${completedTripsCount} completed trips). Permanently deleting the vehicle will also remove associated maintenance/fuel logs. Do you want to continue?`,
      });
    }

    // PERMANENT HARD DELETE FROM SUPABASE POSTGRESQL
    await db.remove('vehicles', { vehicleid: id });

    return res.json({
      success: true,
      message: 'Vehicle permanently deleted from database',
      id,
    });
  } catch (error: any) {
    console.error('Error deleting vehicle:', error?.message || error);
    return fail(res, 500, error?.message || 'Failed to delete vehicle');
  }
});


