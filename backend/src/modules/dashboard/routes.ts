import {Router} from 'express';
import {db} from '../../config/database';

export const dashboardRouter = Router();

dashboardRouter.get('/summary', async (_req, res) => {
  const [vehicles, trips, drivers] = await Promise.all([db.list('vehicles'), db.list('trips'), db.list('users', {role: 'ROLE_DRIVER'})]);
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
