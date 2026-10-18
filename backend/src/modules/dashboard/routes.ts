import {Router} from 'express';
import {db} from '../../config/database';
import {optionalAuth, getTrustedOrgId} from '../../middleware/auth';

export const dashboardRouter = Router();

dashboardRouter.get('/summary', optionalAuth, async (req, res) => {
  const orgId = getTrustedOrgId(req);
  const orgFilter = orgId ? { organization_id: orgId } : undefined;
  const [vehicles, trips, drivers] = await Promise.all([
    db.list('vehicles', orgFilter),
    db.list('trips', orgFilter),
    db.list('users', { role: 'ROLE_DRIVER', ...(orgFilter || {}) }),
  ]);
  const availableVehicles = vehicles.filter((v: any) => v.status === 'AVAILABLE').length;
  const activeTrips = trips.filter((t: any) => t.status === 'DISPATCHED').length;
  const vehiclesInMaintenance = vehicles.filter((v: any) => v.status === 'IN_SHOP').length;
  const previousTrips = trips.filter((t: any) => ['COMPLETED', 'CANCELLED'].includes(t.status)).length;
  res.json({
    activeVehicles: vehicles.filter((v: any) => v.status !== 'RETIRED').length,
    availableVehicles,
    vehiclesInMaintenance,
    activeTrips,
    previousTrips,
    driversOnDuty: drivers.filter((d: any) => d.status !== 'OFF_DUTY').length,
    fleetUtilization: vehicles.length ? Math.round((activeTrips / vehicles.length) * 100) : 0,
    statusBreakdown: [
      {label: 'Available', value: availableVehicles},
      {label: 'On Trip', value: vehicles.filter((v: any) => v.status === 'ON_TRIP').length},
      {label: 'In Shop', value: vehiclesInMaintenance},
      {label: 'Not Avail', value: vehicles.filter((v: any) => ['RETIRED', 'SUSPENDED'].includes(v.status)).length}
    ],
    recentTrips: trips.slice(0, 10)
  });
});
