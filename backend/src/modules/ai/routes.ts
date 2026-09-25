import {Router} from 'express';
import {db} from '../../config/database';

export const aiRouter = Router();

aiRouter.post('/query', async (req, res) => {
  const query = String(req.body?.query ?? '').toLowerCase();
  const [vehicles, trips, drivers, fuel, maintenance] = await Promise.all([
    db.list('vehicles'), db.list('trips'), db.list('users', {role: 'ROLE_DRIVER'}), db.list('fuel_logs'), db.list('maintenance_records')
  ]);
  if (query.includes('driver')) {
    return res.json({success: true, intent: 'DRIVER_PERFORMANCE', type: 'driver_summary', message: `${drivers.length} drivers are registered.`, data: drivers, suggestions: ['Show active vehicles', 'Show delayed trips']});
  }
  if (query.includes('maintenance')) {
    return res.json({success: true, intent: 'MAINTENANCE_ALERTS', type: 'maintenance_alert', message: `${maintenance.length} maintenance records found.`, data: maintenance, suggestions: ['Show fuel summary']});
  }
  if (query.includes('fuel')) {
    const liters = fuel.reduce((s: number, f: any) => s + Number(f.liters ?? 0), 0);
    return res.json({success: true, intent: 'FUEL_SUMMARY', type: 'fuel_summary', message: `${liters} liters logged.`, data: fuel, suggestions: ['Show fleet summary']});
  }
  if (query.includes('trip')) {
    return res.json({success: true, intent: 'TRIP_SUMMARY', type: 'trip_summary', message: `${trips.length} trips found.`, data: trips, suggestions: ['Show active vehicles']});
  }
  res.json({success: true, intent: 'ACTIVE_VEHICLES', type: 'fleet_summary', message: `${vehicles.filter((v: any) => v.status !== 'RETIRED').length} active vehicles in fleet.`, data: {vehicles, activeTrips: trips.filter((t: any) => t.status === 'DISPATCHED').length}, suggestions: ['Show trips', 'Show drivers', 'Show maintenance alerts']});
});
