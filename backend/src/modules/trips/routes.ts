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
import { broadcastTrackingTripEnded, sendDirectChatMessage } from '../chat/websocket';
import { calculateTripDelayInsights, resolveCityCoords } from './delayPredictionService';
import { getDestinationWeather, validateCoordinates } from '../weather/weatherService';

export const tripRouter = Router();

// GET all trips (Filtered by organization and driver if authenticated as ROLE_DRIVER)
tripRouter.get('/', optionalAuth, async (req, res) => {
  try {
    const orgId = req.user ? getTrustedOrgId(req) : null;
    const currentRole = req.user ? normalizeRole(req.user?.role) : null;
    const currentUserId = req.user?.id || req.user?.userId;

    const filter: Record<string, any> = {};
    if (orgId) {
      filter.organization_id = orgId;
    }

    if (currentRole === CanonicalRole.DRIVER) {
      filter.driverID = currentUserId;
    } else if (req.query.driverID) {
      filter.driverID = req.query.driverID as string;
    }

    const rawTrips = await db.list('trips', Object.keys(filter).length > 0 ? filter : undefined);
    const trips = (rawTrips || []).map((t: any) => {
      const tripID = t.tripID || t.tripid || t.id;
      const driverID = t.driverID || t.driverid;
      const vehicleID = t.vehicleID || t.vehicleid;
      return {
        ...t,
        tripID,
        tripid: tripID,
        id: tripID,
        driverID,
        driverid: driverID,
        vehicleID,
        vehicleid: vehicleID,
      };
    });
    return res.json(trips);
  } catch (error: any) {
    return fail(res, 500, error.message || 'Failed to fetch trips');
  }
});

const BUSINESS_TIMEZONE = process.env.BUSINESS_TIMEZONE || 'Asia/Kolkata';

export const ACTIVE_TRIP_STATUSES = [
  'ACCEPTED',
  'ASSIGNED',
  'DISPATCHED',
  'GOING_TO_PICKUP',
  'ARRIVED_AT_PICKUP',
  'PICKED_UP',
  'IN_TRANSIT',
  'ARRIVED_AT_DROP',
];

export function getTodayBusinessDateString(date: Date = new Date(), timeZone = BUSINESS_TIMEZONE): string {
  try {
    return date.toLocaleDateString('en-CA', { timeZone });
  } catch {
    return date.toISOString().split('T')[0];
  }
}

export function parseLicenseExpiryDate(raw: any): string | null {
  if (!raw) return null;
  const str = String(raw).trim();
  if (!str) return null;

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // YYYY-MM
  if (/^\d{4}-\d{2}$/.test(str)) {
    const [y, m] = str.split('-').map(Number);
    if (m >= 1 && m <= 12) {
      const lastDay = new Date(y, m, 0).getDate();
      return `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    }
  }

  // MM/YYYY or DD/MM/YYYY
  const parts = str.split('/');
  if (parts.length === 2) {
    const p1 = Number(parts[0]);
    const p2 = Number(parts[1]);
    if (!isNaN(p1) && !isNaN(p2)) {
      let mm = p1;
      let yyyy = p2;
      if (p1 > 12 && p2 <= 12) {
        yyyy = p1;
        mm = p2;
      }
      if (mm >= 1 && mm <= 12) {
        const lastDay = new Date(yyyy, mm, 0).getDate();
        return `${yyyy}-${String(mm).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      }
    }
  }

  if (parts.length === 3) {
    const d = Number(parts[0]);
    const m = Number(parts[1]);
    const y = Number(parts[2]);
    if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch { }

  return null;
}

// Helper to look up vehicle robustly
async function findVehicle(vehicleID: string) {
  let vehicle = await db.find('vehicles', { vehicleID });
  if (!vehicle) vehicle = await db.find('vehicles', { vehicleid: vehicleID });
  if (!vehicle) {
    const all = await db.list('vehicles');
    vehicle = (all || []).find((v: any) =>
      String(v.vehicleID || v.vehicleid || v.id).toLowerCase() === String(vehicleID).toLowerCase()
    );
  }
  return vehicle;
}

// Helper to look up driver robustly
async function findDriver(driverID: string) {
  let driver = await db.find('users', { id: driverID });
  if (!driver) driver = await db.find('users', { id: driverID.toLowerCase() });
  if (!driver) {
    const all = await db.list('users');
    driver = (all || []).find((u: any) =>
      String(u.id || u.userId || '').toLowerCase() === String(driverID).toLowerCase()
    );
  }
  return driver;
}

// Helper to look up trip robustly
async function findTrip(tripID: string) {
  let trip = await db.find('trips', { tripID });
  if (!trip) trip = await db.find('trips', { tripid: tripID });
  if (!trip) {
    const all = await db.list('trips');
    trip = (all || []).find((t: any) =>
      String(t.tripID || t.tripid || t.id).toLowerCase() === String(tripID).toLowerCase()
    );
  }
  return trip;
}

// Helper to validate vehicle eligibility (Rule 2)
async function validateVehicleEligibility(vehicleID: string): Promise<{ valid: boolean; error?: string; vehicle?: any }> {
  const vehicle = await findVehicle(vehicleID);
  if (!vehicle) {
    return { valid: false, error: `Vehicle ${vehicleID} not found` };
  }

  const vStatus = String(vehicle.status || '').toUpperCase();
  if (vStatus === 'RETIRED') {
    return { valid: false, error: `Vehicle ${vehicle.name || vehicle.registrationNumber || vehicleID} is retired and cannot be assigned or dispatched` };
  }
  if (vStatus === 'IN_SHOP' || vStatus === 'MAINTENANCE') {
    return { valid: false, error: `Vehicle ${vehicle.name || vehicle.registrationNumber || vehicleID} is currently in shop for maintenance and cannot be assigned or dispatched` };
  }
  if (vStatus === 'INACTIVE') {
    return { valid: false, error: `Vehicle ${vehicle.name || vehicle.registrationNumber || vehicleID} is inactive and cannot be assigned or dispatched` };
  }

  // Active maintenance check
  const allMaint = await db.list('maintenance_records');
  const hasActiveMaint = (allMaint || []).some((m: any) => {
    const mVId = m.vehicleID || m.vehicleid;
    const mStatus = String(m.status || '').toUpperCase();
    return (
      (mVId === vehicleID || (vehicle.id && mVId === vehicle.id) || (vehicle.vehicleID && mVId === vehicle.vehicleID)) &&
      (mStatus === 'ACTIVE' || mStatus === 'IN SHOP')
    );
  });
  if (hasActiveMaint) {
    return { valid: false, error: `Vehicle ${vehicle.name || vehicle.registrationNumber || vehicleID} is currently undergoing maintenance in shop and cannot be assigned or dispatched` };
  }

  return { valid: true, vehicle };
}

// Helper to validate driver eligibility (Rule 3)
async function validateDriverEligibility(driverID: string): Promise<{ valid: boolean; error?: string; driver?: any }> {
  const driver = await findDriver(driverID);
  if (!driver) {
    return { valid: false, error: `Driver ${driverID} not found` };
  }

  const role = String(driver.role || '').toUpperCase();
  if (role !== 'ROLE_DRIVER' && role !== 'DRIVER') {
    return { valid: false, error: `User ${driver.name || driverID} is not a driver` };
  }

  const status = String(driver.status || '').toUpperCase();
  if (status === 'SUSPENDED') {
    return { valid: false, error: `Driver ${driver.name || driverID} is suspended and cannot be assigned to trips` };
  }
  if (status === 'INACTIVE' || status === 'OFF_DUTY') {
    return { valid: false, error: `Driver ${driver.name || driverID} is currently ${status.toLowerCase()} and cannot be assigned to trips` };
  }

  const licenseNo = String(driver.licenseNo || driver.licenseno || '').trim();
  if (!licenseNo) {
    return { valid: false, error: `Driver ${driver.name || driverID} does not have a registered driver's license` };
  }

  const rawExpiry = driver.licenseExpiryDate || driver.licenseexpirydate;
  const parsedExpiry = parseLicenseExpiryDate(rawExpiry);
  if (!parsedExpiry) {
    return { valid: false, error: `Driver ${driver.name || driverID} does not have a valid license expiration date on file` };
  }

  const todayStr = getTodayBusinessDateString();
  if (parsedExpiry < todayStr) {
    return { valid: false, error: `Driver ${driver.name || driverID}'s license expired on ${parsedExpiry}. Cannot assign expired license driver to trip.` };
  }

  return { valid: true, driver };
}

// Helper to check active trip conflict for vehicle or driver (Rule 4)
async function checkActiveTripConflict(
  vehicleID: string,
  driverID: string,
  excludeTripID?: string
): Promise<{ hasConflict: boolean; error?: string }> {
  const allTrips = await db.list('trips');
  const normExcl = excludeTripID ? String(excludeTripID).toLowerCase() : '';

  for (const t of allTrips || []) {
    const tId = String(t.tripID || t.tripid || t.id || '').toLowerCase();
    if (normExcl && tId === normExcl) continue;

    const tStatus = String(t.status || '').toUpperCase();
    if (!ACTIVE_TRIP_STATUSES.includes(tStatus)) continue;

    const tVId = String(t.vehicleID || t.vehicleid || '').toLowerCase();
    const tDId = String(t.driverID || t.driverid || '').toLowerCase();

    if (tVId && tVId === String(vehicleID).toLowerCase()) {
      return {
        hasConflict: true,
        error: `Vehicle ${vehicleID} is already assigned to active trip ${t.tripID || t.tripid || t.id} (status: ${tStatus})`,
      };
    }

    if (tDId && tDId === String(driverID).toLowerCase()) {
      return {
        hasConflict: true,
        error: `Driver ${driverID} is already assigned to active trip ${t.tripID || t.tripid || t.id} (status: ${tStatus})`,
      };
    }
  }

  return { hasConflict: false };
}

tripRouter.post('/create', optionalAuth, async (req, res) => {
  try {
    if (req.user) {
      const callerRole = normalizeRole(req.user.role);
      if (!hasPermission(callerRole, Permission.TRIPS_CREATE) && !req.user.isPlatformAdmin) {
        return fail(res, 403, 'Forbidden: insufficient permissions to create trips');
      }
    }
    console.log('\n==================================================');
    console.log('[Trip API] POST /api/trip/create REQUEST PAYLOAD:');
    console.log(JSON.stringify(req.body, null, 2));
    console.log('==================================================\n');

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

    const orgId = getTrustedOrgId(req);

    // 1. Vehicle eligibility (Rule 2)
    const vehCheck = await validateVehicleEligibility(vehicleID);
    if (!vehCheck.valid) {
      return fail(res, 400, vehCheck.error || 'Vehicle is not eligible for assignment');
    }
    const vehicle = vehCheck.vehicle;

    // Cross-organization validation: ensure vehicle belongs to caller's organization
    if (orgId && vehicle.organization_id && vehicle.organization_id !== orgId) {
      return fail(res, 400, 'Vehicle does not belong to your organization');
    }

    // 2. Driver eligibility (Rule 3)
    const drvCheck = await validateDriverEligibility(driverID);
    if (!drvCheck.valid) {
      return fail(res, 400, drvCheck.error || 'Driver is not eligible for assignment');
    }
    const driver = drvCheck.driver;

    // Cross-organization validation: ensure driver belongs to caller's organization
    if (orgId && driver.organization_id && driver.organization_id !== orgId) {
      return fail(res, 400, 'Driver does not belong to your organization');
    }

    // 3. Cargo weight validation (Rule 5)
    const weight = Number(cargoWeight);
    if (cargoWeight === undefined || cargoWeight === null || isNaN(weight) || !isFinite(weight) || weight <= 0) {
      return fail(res, 400, 'Cargo weight must be a valid positive number');
    }

    const maxCap = Number(vehicle.maxLoadCapacity ?? vehicle.maxloadcapacity ?? vehicle.capacity ?? 0);
    if (weight > maxCap) {
      return fail(res, 400, `Cargo weight (${weight} kg) exceeds vehicle max load capacity (${maxCap} kg)`);
    }

    // 4. Double booking / active trip conflict check (Rule 4)
    if (String(vehicle.status || '').toUpperCase() === 'ON_TRIP') {
      return fail(res, 409, `Vehicle ${vehicle.name || vehicleID} is currently on an active trip and cannot be assigned again`);
    }
    if (String(driver.status || '').toUpperCase() === 'ON_TRIP') {
      return fail(res, 409, `Driver ${driver.name || driverID} is currently on an active trip and cannot be assigned again`);
    }

    const conflict = await checkActiveTripConflict(vehicleID, driverID);
    if (conflict.hasConflict) {
      return fail(res, 409, conflict.error || 'Vehicle or driver is already assigned to an active trip');
    }

    const tripData = {
      tripID: `TRP-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'PENDING_APPROVAL',
      createdById: req.user?.userId || 'usr-manager',
      organization_id: orgId,
      ...req.body,
    };

    const trip = await db.insert('trips', tripData);
    const resolvedTripId = trip.tripID || trip.tripid || trip.id || tripData.tripID;
    const resolvedVehicleId = trip.vehicleID || trip.vehicleid || tripData.vehicleID;
    const resolvedDriverId = trip.driverID || trip.driverid || tripData.driverID;

    const formattedTrip = {
      ...trip,
      tripID: resolvedTripId,
      tripid: resolvedTripId,
      id: resolvedTripId,
      vehicleID: resolvedVehicleId,
      vehicleid: resolvedVehicleId,
      driverID: resolvedDriverId,
      driverid: resolvedDriverId,
    };

    console.log('\n==================================================');
    console.log('[Trip API] POST /api/trip/create RESPONSE (201 Created):');
    console.log(JSON.stringify(formattedTrip, null, 2));
    console.log('==================================================\n');

    // Notify driver immediately via chat message & in-app notification banner
    if (resolvedDriverId) {
      const creatorId = req.user?.userId || req.user?.id || 'usr-manager';
      const creatorName = (req.user as any)?.name || req.user?.email || 'Fleet Manager';
      const notifOrgId = trip.organization_id || orgId;

      // 1. In-app system notification record
      try {
        await db.insert('notifications', {
          id: db.makeId('notif-'),
          userId: resolvedDriverId,
          role: 'ROLE_DRIVER',
          title: 'New Trip Assigned',
          body: `Trip #${resolvedTripId} assigned: ${trip.source} ➔ ${trip.destination}`,
          tripId: resolvedTripId,
          ...(notifOrgId ? { organization_id: notifOrgId } : {}),
          createdAt: new Date().toISOString(),
          read: false,
        });
      } catch (nErr) {
        console.warn('[Notification Error] Driver trip creation notification failed (non-blocking):', nErr);
      }

      // 2. Real-time direct chat message (triggers InAppChatNotificationBanner instantly)
      try {
        sendDirectChatMessage({
          senderId: creatorId,
          senderName: creatorName,
          receiverId: resolvedDriverId,
          message: `🚚 You have been assigned a new trip #${resolvedTripId}!\nPickup: ${trip.source}\nDrop: ${trip.destination}`,
          explicitOrgId: notifOrgId,
        }).catch((cErr) => console.warn('[Chat Error] Failed to send trip assignment chat message:', cErr));
      } catch (cErr) {
        console.warn('[Chat Error] Driver trip assignment chat dispatch failed:', cErr);
      }
    }

    return res.status(201).json(formattedTrip);
  } catch (error: any) {
    console.error('[Trip API ERROR] POST /api/trip/create failed:', error);
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

  const orgId = req.user ? getTrustedOrgId(req) : null;
  const trip = await findTrip(tripID);
  if (!trip || (orgId && trip.organization_id && trip.organization_id !== orgId)) {
    return fail(res, 404, 'Trip not found');
  }

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

  // 3. RBAC validation
  if (!req.user) {
    return fail(res, 401, 'Authentication required');
  }
  const role = normalizeRole(req.user.role);
  const userId = req.user.userId || req.user.id;

  if (role === CanonicalRole.DRIVER) {
    const tripDriverID = trip.driverID || trip.driverid;
    if (tripDriverID !== userId) {
      return fail(res, 403, 'Forbidden: You can only update trips assigned to you');
    }
    const driverAllowedActions = ['GOING_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED_AT_DROP', 'DELIVERED', 'COMPLETED'];
    if (!driverAllowedActions.includes(targetStatus)) {
      return fail(res, 403, `Forbidden: Driver cannot transition trip to ${targetStatus}`);
    }
  } else if ([CanonicalRole.MANAGER, CanonicalRole.DISPATCHER].includes(role)) {
    const managerAllowedActions = ['ACCEPTED', 'ASSIGNED', 'REJECTED', 'CANCELLED', 'DISPATCHED'];
    if (!managerAllowedActions.includes(targetStatus)) {
      return fail(res, 403, `Forbidden: Manager or Dispatcher cannot transition trip directly to ${targetStatus}`);
    }
  } else {
    return fail(res, 403, 'Forbidden: insufficient role permissions to update trip status');
  }

  const vehicleID = trip.vehicleID || trip.vehicleid;
  const driverID = trip.driverID || trip.driverid;
  let finalOdometer: number | undefined;

  // 4. Side effects according to target status
  if (targetStatus === 'ACCEPTED' || targetStatus === 'ASSIGNED' || targetStatus === 'DISPATCHED') {
    // Validate vehicle eligibility at dispatch time (Rule 2)
    if (vehicleID) {
      const vehCheck = await validateVehicleEligibility(vehicleID);
      if (!vehCheck.valid) {
        return fail(res, 400, `Cannot dispatch trip: ${vehCheck.error}`);
      }
    }

    // Validate driver eligibility at dispatch time (Rule 3)
    if (driverID) {
      const drvCheck = await validateDriverEligibility(driverID);
      if (!drvCheck.valid) {
        return fail(res, 400, `Cannot dispatch trip: ${drvCheck.error}`);
      }
    }

    // Check active conflict (Rule 4)
    if (vehicleID && driverID) {
      const conflictCheck = await checkActiveTripConflict(vehicleID, driverID, trip.tripID || tripID);
      if (conflictCheck.hasConflict) {
        return fail(res, 409, `Cannot dispatch trip: ${conflictCheck.error}`);
      }
    }

    // Rule 6: Dispatch sets driver and vehicle to ON_TRIP
    if (vehicleID) await db.update('vehicles', { vehicleID }, { status: 'ON_TRIP' });
    if (driverID) await db.update('users', { id: driverID }, { status: 'ON_TRIP' });

    // Driver notification and immediate real-time chat message
    if (driverID) {
      const notifOrgId = trip.organization_id || orgId;
      const managerId = req.user?.userId || req.user?.id || trip.createdById || 'usr-manager';
      const managerName = (req.user as any)?.name || req.user?.email || 'Fleet Manager';
      const tripIdentifier = trip.tripID || tripID;

      // 1. System notification
      try {
        await db.insert('notifications', {
          id: db.makeId('notif-'),
          userId: driverID,
          role: 'ROLE_DRIVER',
          title: targetStatus === 'ACCEPTED' ? 'Trip Accepted by Manager' : 'Trip Dispatched',
          body: `Trip #${tripIdentifier} has been ${targetStatus.toLowerCase()}! Pickup: ${trip.source} | Drop: ${trip.destination}`,
          tripId: tripIdentifier,
          ...(notifOrgId ? { organization_id: notifOrgId } : {}),
          createdAt: new Date().toISOString(),
          read: false,
        });
      } catch (nErr) {
        console.warn('[Notification Error] Driver notification creation failed (non-blocking):', nErr);
      }

      // 2. Real-time direct chat message (triggers instant InAppChatNotificationBanner)
      try {
        const actionLabel = targetStatus === 'ACCEPTED' ? 'accepted and confirmed' : 'assigned/dispatched';
        sendDirectChatMessage({
          senderId: managerId,
          senderName: managerName,
          receiverId: driverID,
          message: `✅ Trip #${tripIdentifier} has been ${actionLabel}!\nPickup: ${trip.source}\nDrop: ${trip.destination}`,
          explicitOrgId: notifOrgId,
        }).catch((cErr) => console.warn('[Chat Error] Driver status update chat delivery failed:', cErr));
      } catch (cErr) {
        console.warn('[Chat Error] Driver status update chat dispatch failed:', cErr);
      }
    }
  } else if (targetStatus === 'DELIVERED' || targetStatus === 'COMPLETED' || targetStatus === 'REJECTED' || targetStatus === 'CANCELLED') {
    // Rule 7: Completing or cancelling trip restores eligible resources safely
    const isCompleted = targetStatus === 'DELIVERED' || targetStatus === 'COMPLETED';
    const tripPlannedDist = Number(trip.plannedDistance ?? trip.planneddistance ?? 0);

    finalOdometer = req.body?.finalOdometer !== undefined && req.body.finalOdometer !== '' && Number(req.body.finalOdometer) > 0
      ? Number(req.body.finalOdometer)
      : (trip.finalOdometer !== undefined ? Number(trip.finalOdometer) : undefined);

    // Restore vehicle safely
    if (vehicleID) {
      const veh = await findVehicle(vehicleID);
      if (veh) {
        // Automatically add trip's planned distance to assigned vehicle odometer reading
        let newVehicleOdometer: number | undefined = finalOdometer;
        if (isCompleted) {
          const currentOdo = Number(veh.odometer ?? 0);
          if (newVehicleOdometer === undefined || newVehicleOdometer <= 0) {
            newVehicleOdometer = currentOdo + tripPlannedDist;
          }
          finalOdometer = newVehicleOdometer;
          console.log(`[Trip Completion] Trip #${trip.tripID || tripID} delivered. Added ${tripPlannedDist} km to vehicle ${vehicleID} odometer: ${currentOdo} → ${newVehicleOdometer}`);
        }

        const vStatus = String(veh.status || '').toUpperCase();
        if (vStatus === 'RETIRED') {
          // Never change a retired vehicle to available
          if (newVehicleOdometer !== undefined && isCompleted) {
            await db.update('vehicles', { vehicleID }, { odometer: newVehicleOdometer });
          }
        } else {
          // Check if vehicle has active maintenance
          const allMaint = await db.list('maintenance_records');
          const hasActiveMaint = (allMaint || []).some((m: any) => {
            const mVId = String(m.vehicleID || m.vehicleid || '').toLowerCase();
            const targetVId = String(vehicleID || '').toLowerCase();
            const altVId1 = veh.id ? String(veh.id).toLowerCase() : '';
            const altVId2 = veh.vehicleID ? String(veh.vehicleID).toLowerCase() : '';
            const mStatus = String(m.status || '').toUpperCase();
            return (
              (mVId === targetVId || (altVId1 && mVId === altVId1) || (altVId2 && mVId === altVId2)) &&
              (mStatus === 'ACTIVE' || mStatus === 'IN SHOP')
            );
          });

          if (hasActiveMaint) {
            await db.update('vehicles', { vehicleID }, {
              status: 'IN_SHOP',
              ...(newVehicleOdometer !== undefined && isCompleted ? { odometer: newVehicleOdometer } : {}),
            });
          } else {
            // Check if vehicle is still assigned to another active trip
            const allTrips = await db.list('trips');
            const otherActive = (allTrips || []).some((t: any) => {
              const tId = String(t.tripID || t.tripid || t.id || '').toLowerCase();
              const currId = String(trip.tripID || tripID).toLowerCase();
              const tVId = String(t.vehicleID || t.vehicleid || '').toLowerCase();
              const tStatus = String(t.status || '').toUpperCase();
              return tId !== currId && (tVId === String(vehicleID).toLowerCase() || (veh.id && tVId === String(veh.id).toLowerCase())) && ACTIVE_TRIP_STATUSES.includes(tStatus);
            });

            if (otherActive) {
              await db.update('vehicles', { vehicleID }, {
                status: 'ON_TRIP',
                ...(newVehicleOdometer !== undefined && isCompleted ? { odometer: newVehicleOdometer } : {}),
              });
            } else {
              const patchVehicle: Record<string, any> = { status: 'AVAILABLE' };
              if (newVehicleOdometer !== undefined && isCompleted) {
                patchVehicle.odometer = newVehicleOdometer;
              }
              await db.update('vehicles', { vehicleID }, patchVehicle);
            }
          }
        }
      }
    }

    // Restore driver safely
    if (driverID) {
      const drv = await findDriver(driverID);
      if (drv) {
        const dStatus = String(drv.status || '').toUpperCase();
        if (dStatus === 'SUSPENDED' || dStatus === 'INACTIVE' || dStatus === 'OFF_DUTY') {
          // Never change a suspended driver to available
        } else {
          // Check if driver is still assigned to another active trip
          const allTrips = await db.list('trips');
          const otherActive = (allTrips || []).some((t: any) => {
            const tId = String(t.tripID || t.tripid || t.id || '').toLowerCase();
            const currId = String(trip.tripID || tripID).toLowerCase();
            const tDId = String(t.driverID || t.driverid || '').toLowerCase();
            const tStatus = String(t.status || '').toUpperCase();
            return tId !== currId && (tDId === String(driverID).toLowerCase() || (drv.id && tDId === String(drv.id).toLowerCase())) && ACTIVE_TRIP_STATUSES.includes(tStatus);
          });

          if (otherActive) {
            await db.update('users', { id: driverID }, { status: 'ON_TRIP' });
          } else {
            const patchDriver: Record<string, any> = { status: 'AVAILABLE' };
            if (targetStatus === 'DELIVERED' || targetStatus === 'COMPLETED') {
              patchDriver.trips = Number(drv.trips ?? 0) + 1;
            }
            await db.update('users', { id: driverID }, patchDriver);
          }
        }
      }
    }

    // Manager notification if delivered
    if (targetStatus === 'DELIVERED' || targetStatus === 'COMPLETED') {
      const notifOrgId = trip.organization_id || orgId;
      const tripIdentifier = trip.tripID || tripID;
      const managerId = trip.createdById || 'usr-manager';
      const senderDriverId = req.user?.userId || req.user?.id || driverID;
      const driverName = (req.user as any)?.name || 'Driver';

      try {
        await db.insert('notifications', {
          id: db.makeId('notif-'),
          userId: managerId,
          role: 'ROLE_MANAGER',
          title: 'Trip Delivered',
          body: `Trip #${tripIdentifier} has been successfully delivered.`,
          tripId: tripIdentifier,
          ...(notifOrgId ? { organization_id: notifOrgId } : {}),
          createdAt: new Date().toISOString(),
          read: false,
        });
      } catch (nErr) {
        console.warn('[Notification Error] Manager notification creation failed (non-blocking):', nErr);
      }

      if (senderDriverId && managerId && senderDriverId !== managerId) {
        try {
          sendDirectChatMessage({
            senderId: senderDriverId,
            senderName: driverName,
            receiverId: managerId,
            message: `📦 Trip #${tripIdentifier} has been successfully marked as ${targetStatus}!`,
            explicitOrgId: notifOrgId,
          }).catch((cErr) => console.warn('[Chat Error] Delivery chat message to manager failed:', cErr));
        } catch (cErr) {
          console.warn('[Chat Error] Delivery chat dispatch to manager failed:', cErr);
        }
      }
    }
  }

  // 4b. Cleanup live tracking location when trip reaches terminal state (bounded storage)
  if (['DELIVERED', 'COMPLETED', 'REJECTED', 'CANCELLED'].includes(targetStatus)) {
    try {
      const finishedTripId = trip.tripID || tripID;
      await db.remove('tracking_locations', { tripID: finishedTripId });
      broadcastTrackingTripEnded(finishedTripId);
    } catch (cleanErr) {
      console.warn('[Tracking Cleanup] Failed to remove finished trip location:', cleanErr);
    }
  }

  // 5. Update Trip Record
  const patch: Record<string, any> = { status: targetStatus };
  if (req.body?.finalOdometer !== undefined) {
    patch.finalOdometer = req.body.finalOdometer;
  } else if (finalOdometer !== undefined && (targetStatus === 'DELIVERED' || targetStatus === 'COMPLETED')) {
    patch.finalOdometer = finalOdometer;
  }
  if (req.body?.fuelConsumed !== undefined) patch.fuelConsumed = req.body.fuelConsumed;

  const updatedTrip = await db.update('trips', { tripID }, patch);
  return res.json(updatedTrip || { ...trip, ...patch });
}

// Single status update endpoint
tripRouter.put('/:tripID/status', requireOrgMembership(), (req, res) => handleStatusUpdate(req, res));

// Legacy endpoints maintained for backward compatibility
tripRouter.put('/dispatch/:tripID', requireOrgPermission(Permission.TRIPS_DISPATCH), (req, res) => handleStatusUpdate(req, res, 'ACCEPTED'));
tripRouter.put('/complete/:tripID', requireOrgMembership(), (req, res) => handleStatusUpdate(req, res, 'DELIVERED'));
tripRouter.put('/cancel/:tripID', requireOrgPermission(Permission.TRIPS_CANCEL), (req, res) => handleStatusUpdate(req, res, 'CANCELLED'));

// Smart Delay Prediction & Explanation (Advisory, Read-Only)
tripRouter.get('/:tripID/delay-insights', requireOrgMembership(), async (req, res) => {
  try {
    const { tripID } = req.params;
    const orgId = getTrustedOrgId(req);
    const trip = await findTrip(tripID);
    if (!trip || (trip.organization_id && trip.organization_id !== orgId)) {
      return fail(res, 404, 'Trip not found');
    }
    const insights = await calculateTripDelayInsights(tripID);
    return res.json({
      success: true,
      data: insights,
    });
  } catch (err: any) {
    console.error(`[Trip API] GET /:tripID/delay-insights error for trip ${req.params?.tripID}:`, err?.message || err);
    const status = err?.message?.includes('not found') ? 404 : 500;
    return fail(res, status, err?.message || 'Failed to calculate delay insights');
  }
});

// Destination Weather for Trip (Advisory, Read-Only)
tripRouter.get('/:tripID/destination-weather', requireOrgMembership(), async (req, res) => {
  try {
    const { tripID } = req.params;
    const cleanId = String(tripID || '').trim().replace(/^#/, '');
    const orgId = getTrustedOrgId(req);
    const currentRole = normalizeRole(req.user?.role);
    const currentUserId = req.user?.id || req.user?.userId;

    const trip = await findTrip(cleanId);
    if (!trip || (trip.organization_id && orgId && trip.organization_id !== orgId)) {
      return fail(res, 404, 'Trip not found');
    }

    // RBAC: Drivers can only access destination weather for their own assigned trips
    if (currentRole === CanonicalRole.DRIVER) {
      const tDriver = String(trip.driverID || trip.driverid || '').toLowerCase();
      if (tDriver && tDriver !== String(currentUserId).toLowerCase()) {
        return fail(res, 403, 'You are only authorized to view destination weather for your assigned trips.');
      }
    }

    // 1. Resolve destination coordinates from trip record
    let destLat = Number(trip.destinationLatitude ?? trip.destinationlatitude);
    let destLng = Number(trip.destinationLongitude ?? trip.destinationlongitude);

    // Optional override/enrichment if valid coordinates were supplied in query
    if (req.query.lat && req.query.lon) {
      const qCheck = validateCoordinates(req.query.lat, req.query.lon);
      if (qCheck.valid) {
        destLat = qCheck.lat;
        destLng = qCheck.lon;
      }
    }

    // Fallback: resolve from destination city name if coordinates are missing
    if (isNaN(destLat) || isNaN(destLng)) {
      const c = resolveCityCoords(trip.destination);
      if (c) {
        destLat = c.lat;
        destLng = c.lng;
      }
    }

    if (isNaN(destLat) || isNaN(destLng)) {
      return fail(res, 400, 'Destination coordinates unavailable for this trip. Unable to load destination weather.');
    }

    const weather = await getDestinationWeather({
      latitude: destLat,
      longitude: destLng,
      destinationName: trip.destination || 'Destination',
    });

    return res.json({
      success: true,
      data: weather,
    });
  } catch (err: any) {
    console.error(`[Trip API] GET /:tripID/destination-weather error for trip ${req.params?.tripID}:`, err?.message || err);
    const status = err?.status || (err?.message?.includes('not found') ? 404 : 500);
    return fail(res, status, err?.message || 'Failed to retrieve destination weather');
  }
});
