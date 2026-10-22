import { Router } from 'express';
import { db } from '../../config/database';
import { requireOrgMembership, getTrustedOrgId } from '../../middleware/auth';
import { CanonicalRole, normalizeRole } from '../../config/permissions';
import { fail } from '../../utils/http';
import { getDestinationWeather, validateCoordinates } from './weatherService';

export const weatherRouter = Router();

/**
 * GET /api/weather/destination?lat={latitude}&lon={longitude}&tripId={tripId}
 * 
 * Fetches destination weather with caching, stale fallback, and request coalescing.
 * When tripId is supplied, validates that caller belongs to the trip's organization
 * and that driver callers are assigned to the trip.
 */
weatherRouter.get('/destination', requireOrgMembership(), async (req, res) => {
  try {
    const { lat, lon, tripId, destinationName } = req.query;
    const orgId = getTrustedOrgId(req);
    const currentRole = normalizeRole(req.user?.role);
    const currentUserId = req.user?.id || req.user?.userId;

    let targetLat = lat ? Number(lat) : NaN;
    let targetLon = lon ? Number(lon) : NaN;
    let resolvedName = (destinationName as string) || undefined;

    // If tripId is provided, enforce trip access controls and resolve trip destination
    if (tripId) {
      const trip = await db.find('trips', { tripID: String(tripId).trim().replace(/^#/, '') });
      if (!trip || (trip.organization_id && orgId && trip.organization_id !== orgId)) {
        return fail(res, 404, 'Trip not found');
      }

      // If Driver, verify ownership of the trip
      if (currentRole === CanonicalRole.DRIVER) {
        const tDriver = String(trip.driverID || trip.driverid || '').toLowerCase();
        if (tDriver && tDriver !== String(currentUserId).toLowerCase()) {
          return fail(res, 403, 'You are only authorized to view destination weather for your assigned trips.');
        }
      }

      resolvedName = resolvedName || trip.destination;

      // If coordinates weren't supplied in query, use the trip's destination coordinates
      if (isNaN(targetLat) || isNaN(targetLon)) {
        targetLat = Number(trip.destinationLatitude ?? trip.destinationlatitude);
        targetLon = Number(trip.destinationLongitude ?? trip.destinationlongitude);
      }
    }

    const coordCheck = validateCoordinates(targetLat, targetLon);
    if (!coordCheck.valid) {
      return fail(res, 400, coordCheck.error || 'Valid latitude and longitude are required');
    }

    const weather = await getDestinationWeather({
      latitude: coordCheck.lat,
      longitude: coordCheck.lon,
      destinationName: resolvedName,
    });

    return res.json({
      success: true,
      data: weather,
    });
  } catch (err: any) {
    const status = err?.status || 500;
    return fail(res, status, err?.message || 'Failed to retrieve destination weather');
  }
});
