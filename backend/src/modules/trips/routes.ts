import {Router} from 'express';
import {db} from '../../config/database';
import {optionalAuth} from '../../middleware/auth';
import {fail} from '../../utils/http';

export const tripRouter = Router();

// GET all trips (Filtered by driver if authenticated as ROLE_DRIVER)
tripRouter.get('/', optionalAuth, async (req, res) => {
  try {
    let filter: Record<string, any> | undefined = undefined;
    
    // If driver role or query driverID provided
    const driverId = req.user?.role === 'ROLE_DRIVER' ? req.user.userId : (req.query.driverID as string);
    if (driverId) {
      filter = {driverID: driverId};
    }

    const trips = await db.list('trips', filter);
    return res.json(trips);
  } catch (error: any) {
    return fail(res, 500, error.message || 'Failed to fetch trips');
  }
});

// Helper to look up vehicle robustly
async function findVehicle(vehicleID: string) {
  let vehicle = await db.find('vehicles', {vehicleID});
  if (!vehicle) vehicle = await db.find('vehicles', {vehicleid: vehicleID});
  return vehicle;
}

// Helper to look up trip robustly
async function findTrip(tripID: string) {
  let trip = await db.find('trips', {tripID});
  if (!trip) trip = await db.find('trips', {tripid: tripID});
  return trip;
}

// POST Create Trip (Status defaults to PENDING_APPROVAL)
tripRouter.post('/create', optionalAuth, async (req, res) => {
  try {
    const {
      vehicleID,
      driverID,
      cargoWeight,
      source,
      destination,
      sourceLatitude,
      sourceLongitude,
      destinationLatitude,
      destinationLongitude,
    } = req.body ?? {};

    if (!vehicleID || !driverID) {
      return fail(res, 400, 'Vehicle ID and Driver ID are required');
    }

    if (!source || !destination) {
      return fail(res, 400, 'Pickup location (source) and Drop location (destination) are required');
    }

    // Coordinate validation if coordinates are provided
    if (sourceLatitude !== undefined && sourceLatitude !== null) {
      const sLat = Number(sourceLatitude);
      if (isNaN(sLat) || sLat < -90 || sLat > 90) {
        return fail(res, 400, 'Source latitude must be a valid number between -90 and 90');
      }
    }
    if (sourceLongitude !== undefined && sourceLongitude !== null) {
      const sLng = Number(sourceLongitude);
      if (isNaN(sLng) || sLng < -180 || sLng > 180) {
        return fail(res, 400, 'Source longitude must be a valid number between -180 and 180');
      }
    }
    if (destinationLatitude !== undefined && destinationLatitude !== null) {
      const dLat = Number(destinationLatitude);
      if (isNaN(dLat) || dLat < -90 || dLat > 90) {
        return fail(res, 400, 'Destination latitude must be a valid number between -90 and 90');
      }
    }
    if (destinationLongitude !== undefined && destinationLongitude !== null) {
      const dLng = Number(destinationLongitude);
      if (isNaN(dLng) || dLng < -180 || dLng > 180) {
        return fail(res, 400, 'Destination longitude must be a valid number between -180 and 180');
      }
    }

    const vehicle = await findVehicle(vehicleID);
    if (!vehicle) return fail(res, 400, 'Vehicle not found');

    const maxCap = Number(vehicle.maxLoadCapacity ?? vehicle.maxloadcapacity ?? vehicle.capacity ?? 0);
    if (Number(cargoWeight) > maxCap) {
      return fail(res, 400, `Cargo weight (${cargoWeight} kg) exceeds vehicle max load capacity (${maxCap} kg)`);
    }

    const tripData = {
      tripID: `TRP-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'PENDING_APPROVAL',
      createdById: req.user?.userId || 'usr-manager',
      ...req.body,
    };

    const trip = await db.insert('trips', tripData);
    // Vehicle and driver remain AVAILABLE until Manager ACCEPTS the trip.

    return res.status(201).json(trip);
  } catch (error: any) {
    return fail(res, 500, error.message || 'Failed to create trip');
  }
});

// Allowed status transition graph
const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING_APPROVAL: ['ACCEPTED', 'ASSIGNED', 'REJECTED', 'CANCELLED'],
  ACCEPTED: ['GOING_TO_PICKUP', 'CANCELLED'],
  ASSIGNED: ['GOING_TO_PICKUP', 'CANCELLED'],
  GOING_TO_PICKUP: ['ARRIVED_AT_PICKUP', 'CANCELLED'],
  ARRIVED_AT_PICKUP: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['ARRIVED_AT_DROP', 'CANCELLED'],
  ARRIVED_AT_DROP: ['DELIVERED', 'COMPLETED', 'CANCELLED'],
  DRAFT: ['PENDING_APPROVAL', 'ACCEPTED', 'ASSIGNED', 'DISPATCHED', 'GOING_TO_PICKUP', 'REJECTED', 'CANCELLED'],
  DISPATCHED: ['GOING_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED_AT_DROP', 'DELIVERED', 'COMPLETED', 'CANCELLED'],
};

// Helper function to update trip status with RBAC and side-effects
async function handleStatusUpdate(req: any, res: any, forcedStatus?: string) {
  const tripID = req.params.tripID;
  const targetStatus = (forcedStatus || req.body?.status || '').toUpperCase();

  if (!targetStatus) {
    return fail(res, 400, 'Target status is required');
  }

  const trip = await findTrip(tripID);
  if (!trip) return fail(res, 404, 'Trip not found');

  const currentStatus = (trip.status || 'PENDING_APPROVAL').toUpperCase();

  // 1. Check terminal states
  if (['DELIVERED', 'COMPLETED', 'REJECTED', 'CANCELLED'].includes(currentStatus)) {
    return fail(res, 400, `Trip ${tripID} is already in terminal state: ${currentStatus}`);
  }

  // 2. Validate transition
  const allowedNext = VALID_TRANSITIONS[currentStatus] || [];
  if (!allowedNext.includes(targetStatus)) {
    return fail(res, 400, `Invalid status transition from ${currentStatus} to ${targetStatus}`);
  }

  // 3. RBAC validation if user context is available
  if (req.user) {
    const role = req.user.role;
    const userId = req.user.userId;

    if (role === 'ROLE_DRIVER') {
      const tripDriverID = trip.driverID || trip.driverid;
      if (tripDriverID !== userId) {
        return fail(res, 403, 'Forbidden: You can only update trips assigned to you');
      }
      const driverAllowedActions = ['GOING_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED_AT_DROP', 'DELIVERED', 'COMPLETED'];
      if (!driverAllowedActions.includes(targetStatus)) {
        return fail(res, 403, `Forbidden: Driver cannot transition trip to ${targetStatus}`);
      }
    } else if (['ROLE_MANAGER', 'ROLE_DISPATCHER'].includes(role)) {
      const managerAllowedActions = ['ACCEPTED', 'ASSIGNED', 'REJECTED', 'CANCELLED', 'DISPATCHED'];
      if (!managerAllowedActions.includes(targetStatus)) {
        return fail(res, 403, `Forbidden: Manager cannot transition trip directly to ${targetStatus}`);
      }
    }
  }

  const vehicleID = trip.vehicleID || trip.vehicleid;
  const driverID = trip.driverID || trip.driverid;

  // 4. Side effects according to target status
  if (targetStatus === 'ACCEPTED' || targetStatus === 'ASSIGNED' || targetStatus === 'DISPATCHED') {
    if (vehicleID) await db.update('vehicles', {vehicleID}, {status: 'ON_TRIP'});
    if (driverID) await db.update('users', {id: driverID}, {status: 'ON_TRIP'});

    // Driver notification
    if (driverID) {
      await db.insert('notifications', {
        id: db.makeId('notif-'),
        userId: driverID,
        role: 'ROLE_DRIVER',
        title: 'New trip assigned',
        message: `Pickup: ${trip.source} | Drop: ${trip.destination}`,
        tripId: trip.tripID || tripID,
        createdAt: new Date().toISOString(),
        read: false,
      });
    }
  } else if (targetStatus === 'DELIVERED' || targetStatus === 'COMPLETED') {
    const finalOdometer = req.body?.finalOdometer !== undefined ? Number(req.body.finalOdometer) : trip.finalOdometer;
    const patchVehicle: Record<string, any> = {status: 'AVAILABLE'};
    if (finalOdometer) patchVehicle.odometer = finalOdometer;

    if (vehicleID) await db.update('vehicles', {vehicleID}, patchVehicle);
    if (driverID) await db.update('users', {id: driverID}, {status: 'AVAILABLE'});

    // Manager notification
    await db.insert('notifications', {
      id: db.makeId('notif-'),
      userId: trip.createdById || 'usr-manager',
      role: 'ROLE_MANAGER',
      title: 'Trip Delivered',
      message: `Trip #${trip.tripID || tripID} has been successfully delivered.`,
      tripId: trip.tripID || tripID,
      createdAt: new Date().toISOString(),
      read: false,
    });
  } else if (targetStatus === 'REJECTED' || targetStatus === 'CANCELLED') {
    if (vehicleID) await db.update('vehicles', {vehicleID}, {status: 'AVAILABLE'});
    if (driverID) await db.update('users', {id: driverID}, {status: 'AVAILABLE'});
  }

  // 5. Update Trip Record
  const patch: Record<string, any> = {status: targetStatus};
  if (req.body?.finalOdometer !== undefined) patch.finalOdometer = req.body.finalOdometer;
  if (req.body?.fuelConsumed !== undefined) patch.fuelConsumed = req.body.fuelConsumed;

  const updatedTrip = await db.update('trips', {tripID}, patch);
  return res.json(updatedTrip || {...trip, ...patch});
}

// Single status update endpoint
tripRouter.put('/:tripID/status', optionalAuth, (req, res) => handleStatusUpdate(req, res));

// Legacy endpoints maintained for backward compatibility
tripRouter.put('/dispatch/:tripID', optionalAuth, (req, res) => handleStatusUpdate(req, res, 'ACCEPTED'));
tripRouter.put('/complete/:tripID', optionalAuth, (req, res) => handleStatusUpdate(req, res, 'DELIVERED'));
tripRouter.put('/cancel/:tripID', optionalAuth, (req, res) => handleStatusUpdate(req, res, 'CANCELLED'));
