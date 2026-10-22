import { Router, Request, Response } from 'express';
import { db } from '../../config/database';
import {
  authenticate,
  requireOrgMembership,
  getTrustedOrgId,
  Permission,
  CanonicalRole,
  hasPermission,
  normalizeRole,
} from '../../middleware/auth';
import { fail } from '../../utils/http';
import { broadcastTrackingLocation } from '../chat/websocket';

export const trackingRouter = Router();

const ACTIVE_TRIP_STATUSES = [
  'ACCEPTED',
  'ASSIGNED',
  'DISPATCHED',
  'GOING_TO_PICKUP',
  'ARRIVED_AT_PICKUP',
  'PICKED_UP',
  'IN_TRANSIT',
  'ARRIVED_AT_DROP',
];

/**
 * GET /api/tracking/live
 * Returns active trips merged with their latest real GPS coordinates.
 * Scoped by role: Driver gets only assigned trip; Finance is forbidden; Managers/Dispatchers/Safety get fleet view.
 */
trackingRouter.get('/live', requireOrgMembership(), async (req: Request, res: Response) => {
  try {
    const currentRole = normalizeRole(req.user?.role);
    const currentUserId = req.user?.id || req.user?.userId;

    if (currentRole === CanonicalRole.FINANCE) {
      return fail(res, 403, 'Forbidden: Finance role is not authorized to access live GPS tracking');
    }

    const orgId = getTrustedOrgId(req);
    const orgFilter = orgId ? { organization_id: orgId } : undefined;
    const allTrips = await db.list('trips', orgFilter);
    const allVehicles = await db.list('vehicles', orgFilter);
    const allDrivers = await db.list('users', orgFilter);
    const allLocations = await db.list('tracking_locations', orgFilter);

    let activeTrips = (allTrips || []).filter((t: any) => {
      const normStatus = String(t.status || '').toUpperCase().replace(/[\s-]+/g, '_');
      return ACTIVE_TRIP_STATUSES.includes(normStatus);
    });

    if (currentRole === CanonicalRole.DRIVER) {
      activeTrips = activeTrips.filter((t: any) => {
        const dId = String(t.driverID || t.driverid || '');
        return dId.toLowerCase() === String(currentUserId).toLowerCase();
      });
    }

    const now = Date.now();

    const liveFleet = activeTrips.map((trip: any) => {
      const tripId = String(trip.tripID || trip.tripid || trip.id);
      const vehicleId = String(trip.vehicleID || trip.vehicleid || '');
      const driverId = String(trip.driverID || trip.driverid || '');

      const vehicle = (allVehicles || []).find((v: any) =>
        String(v.vehicleID || v.vehicleid || v.id) === vehicleId
      );
      const driver = (allDrivers || []).find((u: any) =>
        String(u.id || u.userId) === driverId
      );

      const loc = (allLocations || []).find((l: any) => {
        const lTripId = String(l.tripID || l.tripid || '');
        return lTripId && lTripId.toLowerCase() === tripId.toLowerCase();
      });

      let freshness: 'LIVE' | 'UPDATING' | 'STALE' | 'NO_SIGNAL' = 'NO_SIGNAL';
      let isLive = false;
      let latitude: number | null = null;
      let longitude: number | null = null;
      let speed = 0;
      let accuracy: number | null = null;
      let heading: number | null = null;
      let lastUpdated: string | null = null;

      if (loc && loc.latitude !== undefined && loc.longitude !== undefined) {
        const parsedLat = Number(loc.latitude);
        const parsedLng = Number(loc.longitude);

        if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
          latitude = parsedLat;
          longitude = parsedLng;
          speed = Number(loc.speed ?? 0);
          accuracy = loc.accuracy !== undefined && loc.accuracy !== null ? Number(loc.accuracy) : null;
          heading = loc.heading !== undefined && loc.heading !== null ? Number(loc.heading) : null;
          lastUpdated = loc.updatedAt || loc.updatedat || loc.receivedAt || loc.receivedat || loc.createdAt || loc.createdat || null;

          isLive = true;
          if (lastUpdated) {
            const ageSec = Math.max(0, (now - new Date(lastUpdated).getTime()) / 1000);
            if (ageSec <= 180) {
              freshness = 'LIVE'; // within 3 minutes
            } else if (ageSec <= 600) {
              freshness = 'UPDATING'; // within 10 minutes
            } else {
              freshness = 'STALE'; // > 10 minutes
            }
          } else {
            freshness = 'UPDATING';
          }
        }
      }

      // If no live coordinates reported yet, fall back to trip origin coordinates if available
      if (latitude === null || longitude === null) {
        const sLat = trip.sourceLatitude ?? trip.sourcelatitude;
        const sLng = trip.sourceLongitude ?? trip.sourcelongitude;
        if (sLat !== undefined && sLng !== undefined && !isNaN(Number(sLat)) && !isNaN(Number(sLng))) {
          latitude = Number(sLat);
          longitude = Number(sLng);
        } else {
          const s = String(trip.source || '').toLowerCase();
          if (s.includes('gandhinagar')) {
            latitude = 23.2156;
            longitude = 72.6369;
          } else if (s.includes('ahmedabad')) {
            latitude = 23.0225;
            longitude = 72.5714;
          } else if (s.includes('surat')) {
            latitude = 21.1702;
            longitude = 72.8311;
          } else if (s.includes('mumbai')) {
            latitude = 19.033;
            longitude = 73.0297;
          } else if (s.includes('pune')) {
            latitude = 18.5204;
            longitude = 73.8567;
          } else if (s.includes('jaipur')) {
            latitude = 26.9124;
            longitude = 75.7873;
          } else if (s.includes('jodhpur')) {
            latitude = 26.2389;
            longitude = 73.0243;
          }
        }
      }

      return {
        tripID: tripId,
        vehicleID: vehicleId,
        vehicleName: vehicle?.name || vehicle?.registrationNumber || vehicleId,
        registrationNumber: vehicle?.registrationNumber || '',
        driverID: driverId,
        driverName: driver?.name || driverId,
        driverPhone: driver?.phoneNo || driver?.phoneno || '',
        source: trip.source || '',
        destination: trip.destination || '',
        status: trip.status,
        latitude,
        longitude,
        speed,
        accuracy,
        heading,
        isLive,
        freshness,
        lastUpdated,
      };
    });

    return res.json({
      success: true,
      count: liveFleet.length,
      data: liveFleet,
    });
  } catch (err: any) {
    console.error('[Tracking API ERROR] GET /api/tracking/live failed:', err);
    return fail(res, 500, err.message || 'Failed to fetch live tracking snapshot');
  }
});

/**
 * GET /api/tracking/:tripID
 * Returns latest location for a specific active trip
 */
trackingRouter.get('/:tripID', authenticate, async (req: Request, res: Response) => {
  try {
    const { tripID } = req.params;
    const orgId = getTrustedOrgId(req);
    const trips = await db.list('trips', orgId ? { organization_id: orgId } : undefined);
    const trip = (trips || []).find((t: any) =>
      String(t.tripID || t.tripid || t.id).toLowerCase() === tripID.toLowerCase()
    );

    if (!trip || (trip.organization_id && trip.organization_id !== orgId)) {
      return fail(res, 404, `Trip ${tripID} not found`);
    }

    const currentRole = normalizeRole(req.user?.role);
    if (currentRole === CanonicalRole.FINANCE) {
      return fail(res, 403, 'Forbidden: Finance role is not authorized to access live GPS tracking');
    }
    if (currentRole === CanonicalRole.DRIVER) {
      const driverId = String(trip.driverID || trip.driverid || '').toLowerCase();
      if (driverId !== String(req.user?.userId || req.user?.id).toLowerCase()) {
        return fail(res, 403, 'Forbidden: You are not assigned to this trip');
      }
    }

    const locations = await db.list('tracking_locations', orgId ? { organization_id: orgId } : undefined);
    const loc = (locations || []).find((l: any) =>
      String(l.tripID || l.tripid || '').toLowerCase() === tripID.toLowerCase()
    );

    return res.json({
      success: true,
      data: {
        tripID: trip.tripID || trip.tripid,
        status: trip.status,
        vehicleID: trip.vehicleID || trip.vehicleid,
        driverID: trip.driverID || trip.driverid,
        location: loc || null,
      },
    });
  } catch (err: any) {
    console.error('[Tracking API ERROR] GET /api/tracking/:tripID failed:', err);
    return fail(res, 500, err.message || 'Failed to fetch trip tracking');
  }
});

/**
 * POST /api/tracking/location
 * Ingests live GPS coordinate from authenticated driver for an active assigned trip.
 * Validates driver assignment, trip status, coordinate boundaries, and updates atomically (UPSERT).
 */
trackingRouter.post('/location', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return fail(res, 401, 'Authentication required');
    }

    const {
      tripID,
      latitude,
      longitude,
      speed,
      accuracy,
      heading,
      deviceTimestamp,
    } = req.body;

    // 1. Validate payload presence
    if (!tripID) {
      return fail(res, 400, 'tripID is required');
    }

    if (latitude === undefined || latitude === null || longitude === undefined || longitude === null) {
      return fail(res, 400, 'latitude and longitude are required');
    }

    const lat = Number(latitude);
    const lng = Number(longitude);

    // 2. Validate coordinate bounds
    if (isNaN(lat) || lat < -90 || lat > 90) {
      return fail(res, 400, 'latitude must be a valid number between -90 and 90');
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      return fail(res, 400, 'longitude must be a valid number between -180 and 180');
    }

    // 3. Find trip
    const orgId = getTrustedOrgId(req);
    const trips = await db.list('trips', orgId ? { organization_id: orgId } : undefined);
    const trip = (trips || []).find((t: any) =>
      String(t.tripID || t.tripid || t.id).toLowerCase() === String(tripID).toLowerCase()
    );

    if (!trip || (trip.organization_id && trip.organization_id !== orgId)) {
      return fail(res, 404, `Trip ${tripID} not found`);
    }

    const tripStatus = String(trip.status || '').toUpperCase();
    const assignedDriverId = String(trip.driverID || trip.driverid || '');
    const assignedVehicleId = String(trip.vehicleID || trip.vehicleid || '');

    // 4. Validate driver assignment and authorization
    if (user.role === 'ROLE_DRIVER') {
      if (assignedDriverId !== user.userId) {
        return fail(res, 403, 'Forbidden: You are not the driver assigned to this trip');
      }
    } else if (!['ROLE_MANAGER', 'ROLE_DISPATCHER'].includes(user.role)) {
      return fail(res, 403, 'Forbidden: Unauthorized to submit vehicle location');
    }

    // 5. Check trip active status
    if (['DELIVERED', 'COMPLETED', 'CANCELLED', 'REJECTED'].includes(tripStatus)) {
      return fail(res, 400, `Cannot submit location for finished trip (status: ${tripStatus})`);
    }

    if (!ACTIVE_TRIP_STATUSES.includes(tripStatus)) {
      return fail(res, 400, `Trip is not in an active tracking state (status: ${tripStatus})`);
    }

    // 6. Handle out-of-order or stale device timestamps
    const existingLocations = await db.list('tracking_locations', orgId ? { organization_id: orgId } : undefined);
    const existingLoc = (existingLocations || []).find((l: any) =>
      String(l.tripID || l.tripid || '').toLowerCase() === String(tripID).toLowerCase()
    );

    if (deviceTimestamp && existingLoc) {
      const existingDeviceTime = new Date(existingLoc.deviceTimestamp || existingLoc.devicetimestamp || 0).getTime();
      const incomingDeviceTime = new Date(deviceTimestamp).getTime();
      // If incoming device timestamp is more than 30 seconds older than current recorded fix, ignore stale reading
      if (existingDeviceTime > 0 && incomingDeviceTime > 0 && incomingDeviceTime < existingDeviceTime - 30000) {
        console.warn(`[Tracking API] Ignoring stale coordinate packet for trip ${tripID}`);
        return res.json({
          success: true,
          message: 'Ignored stale location packet',
          data: {
            tripID: trip.tripID || trip.tripid,
            latitude: Number(existingLoc.latitude),
            longitude: Number(existingLoc.longitude),
            updatedAt: existingLoc.updatedAt || existingLoc.updatedat,
          },
        });
      }
    }

    const receivedAt = new Date().toISOString();
    const parsedSpeed = speed !== undefined && !isNaN(Number(speed)) ? Math.max(0, Number(speed)) : 0;
    const parsedAccuracy = accuracy !== undefined && !isNaN(Number(accuracy)) ? Number(accuracy) : null;
    const parsedHeading = heading !== undefined && !isNaN(Number(heading)) ? Number(heading) : null;

    const locationRecord = {
      id: `loc-${trip.tripID || trip.tripid}`,
      tripID: trip.tripID || trip.tripid,
      vehicleID: assignedVehicleId,
      driverID: assignedDriverId,
      organization_id: orgId,
      latitude: lat,
      longitude: lng,
      speed: parsedSpeed,
      accuracy: parsedAccuracy,
      heading: parsedHeading,
      deviceTimestamp: deviceTimestamp ? new Date(deviceTimestamp).toISOString() : receivedAt,
      receivedAt,
      updatedAt: receivedAt,
    };

    // 7. Atomic UPSERT into tracking_locations (maintaining strictly 1 row per active trip)
    const savedRecord = await db.upsert('tracking_locations', 'tripID', locationRecord);

    // 8. Broadcast live update to WebSocket subscribers (managers and dispatchers)
    const broadcastPayload = {
      tripID: locationRecord.tripID,
      vehicleID: locationRecord.vehicleID,
      driverID: locationRecord.driverID,
      organization_id: orgId,
      latitude: locationRecord.latitude,
      longitude: locationRecord.longitude,
      speed: locationRecord.speed,
      accuracy: locationRecord.accuracy,
      heading: locationRecord.heading,
      status: tripStatus,
      updatedAt: receivedAt,
      freshness: 'LIVE',
    };

    try {
      broadcastTrackingLocation(broadcastPayload);
    } catch (wsErr) {
      console.warn('[Tracking WebSocket Broadcast Note]', wsErr);
    }

    return res.status(200).json({
      success: true,
      data: {
        tripID: locationRecord.tripID,
        vehicleID: locationRecord.vehicleID,
        latitude: locationRecord.latitude,
        longitude: locationRecord.longitude,
        speed: locationRecord.speed,
        accuracy: locationRecord.accuracy,
        updatedAt: receivedAt,
      },
    });
  } catch (err: any) {
    console.error('[Tracking API ERROR] POST /api/tracking/location failed:', err);
    return fail(res, 500, err.message || 'Failed to record tracking location');
  }
});
