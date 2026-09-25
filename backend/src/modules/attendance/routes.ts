import {Router} from 'express';
import {env} from '../../config/env';
import {db} from '../../config/database';
import {distanceMeters} from '../../utils/distance';

export const attendanceRouter = Router();

attendanceRouter.post('/clock-in', async (req, res) => {
  const {latitude, longitude, locationName} = req.body ?? {};
  const distanceFromOffice = Math.round(Number(req.body?.distanceFromOffice ?? distanceMeters(Number(latitude), Number(longitude), env.OFFICE_LATITUDE, env.OFFICE_LONGITUDE)));
  const now = new Date();
  const record = await db.insert('attendance_records', {
    id: db.makeId('att-'),
    userId: req.user?.userId ?? 'anonymous',
    date: now.toLocaleDateString('en-IN'),
    clockInTime: now.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}),
    clockOutTime: null,
    latitude,
    longitude,
    locationName: locationName ?? 'LogiSphere Head Office',
    distanceFromOffice,
    status: distanceFromOffice <= env.OFFICE_GEOFENCE_RADIUS ? 'Verified Location' : 'Manual Override'
  });
  res.status(201).json({success: true, record});
});

attendanceRouter.post('/clock-out', async (_req, res) => {
  const records = await db.list('attendance_records');
  const open = records.find((r: any) => !r.clockOutTime);
  const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
  const record = open ? await db.update('attendance_records', {id: open.id}, {clockOutTime: time}) : null;
  res.json({success: true, record});
});

attendanceRouter.get('/history', async (_req, res) => res.json(await db.list('attendance_records')));
