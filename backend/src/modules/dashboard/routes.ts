import { Router } from 'express';
import { db } from '../../config/database';
import {
  requireOrgMembership,
  optionalAuth,
  getTrustedOrgId,
  CanonicalRole,
  normalizeRole,
} from '../../middleware/auth';

export const dashboardRouter = Router();

dashboardRouter.get('/summary', optionalAuth, async (req, res) => {
  const currentRole = req.user ? normalizeRole(req.user.role) : null;
  const currentUserId = req.user?.id || req.user?.userId;
  const orgId = req.user ? getTrustedOrgId(req) : null;
  const orgFilter = orgId ? { organization_id: orgId } : undefined;

  const [vehicles, trips, drivers] = await Promise.all([
    db.list('vehicles', orgFilter),
    db.list('trips', orgFilter),
    db.list('users', { role: 'ROLE_DRIVER', ...(orgFilter || {}) }),
  ]);

  if (currentRole === CanonicalRole.DRIVER) {
    const userTrips = trips.filter((t: any) => String(t.driverID || t.driverid || '').toLowerCase() === String(currentUserId).toLowerCase());
    const activeTrips = userTrips.filter((t: any) => ['DISPATCHED', 'IN_TRANSIT', 'GOING_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'PICKED_UP', 'ARRIVED_AT_DROP'].includes(String(t.status || '').toUpperCase())).length;
    const completedTrips = userTrips.filter((t: any) => ['COMPLETED', 'DELIVERED'].includes(String(t.status || '').toUpperCase())).length;
    const driverObj = drivers.find((d: any) => String(d.id || d.userId || '').toLowerCase() === String(currentUserId).toLowerCase());
    return res.json({
      isDriver: true,
      activeTrips,
      previousTrips: completedTrips,
      tripsCompleted: completedTrips,
      safetyScore: driverObj?.safetyScore ?? 95,
      status: driverObj?.status || 'AVAILABLE',
      recentTrips: userTrips.slice(0, 10),
    });
  }

  const availableVehicles = vehicles.filter((v: any) => v.status === 'AVAILABLE').length;
  const activeTrips = trips.filter((t: any) => t.status === 'DISPATCHED' || t.status === 'IN_TRANSIT').length;
  const vehiclesInMaintenance = vehicles.filter((v: any) => v.status === 'IN_SHOP').length;
  const previousTrips = trips.filter((t: any) => ['COMPLETED', 'DELIVERED', 'CANCELLED'].includes(t.status)).length;
  res.json({
    activeVehicles: vehicles.filter((v: any) => v.status !== 'RETIRED').length,
    availableVehicles,
    vehiclesInMaintenance,
    activeTrips,
    previousTrips,
    driversOnDuty: drivers.filter((d: any) => d.status !== 'OFF_DUTY').length,
    fleetUtilization: vehicles.length ? Math.round((activeTrips / vehicles.length) * 100) : 0,
    statusBreakdown: [
      { label: 'Available', value: availableVehicles },
      { label: 'On Trip', value: vehicles.filter((v: any) => v.status === 'ON_TRIP').length },
      { label: 'In Shop', value: vehiclesInMaintenance },
      { label: 'Not Avail', value: vehicles.filter((v: any) => ['RETIRED', 'SUSPENDED'].includes(v.status)).length }
    ],
    recentTrips: trips.slice(0, 10)
  });
});
