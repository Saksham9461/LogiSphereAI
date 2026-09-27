import { Router } from 'express';
import { env } from '../../config/env';
import { db } from '../../config/database';
import { distanceMeters } from '../../utils/distance';
import { optionalAuth } from '../../middleware/auth';
import { fail } from '../../utils/http';

export const attendanceRouter = Router();

function normalizeRecord(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.userId || row.userid,
    date: row.date || new Date().toLocaleDateString('en-IN'),
    clockInTime: row.clockInTime || row.clockintime,
    clockOutTime: row.clockOutTime || row.clockouttime || null,
    latitude: Number(row.latitude ?? 0),
    longitude: Number(row.longitude ?? 0),
    locationName: row.locationName || row.locationname || 'LogiSphere Head Office',
    distanceFromOffice: Number(row.distanceFromOffice ?? row.distancefromoffice ?? 0),
    status: row.status || 'Verified Location',
  };
}

// GET /api/attendance/status - Get current active attendance status for user
attendanceRouter.get('/status', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.userId || (req.query.userId as string);
    if (!userId) {
      return res.json({
        success: true,
        status: 'NOT_CLOCKED_IN',
        record: null,
        history: [],
      });
    }

    const allRecords = await db.list('attendance_records');
    const userRecords = (allRecords || [])
      .filter((r: any) => String(r.userId || r.userid || '').toLowerCase() === String(userId).toLowerCase())
      .map(normalizeRecord)
      .filter(Boolean);

    const openRecord = userRecords.find((r: any) => !r.clockOutTime);

    if (openRecord) {
      return res.json({
        success: true,
        status: 'CLOCKED_IN',
        record: openRecord,
        history: userRecords,
      });
    }

    return res.json({
      success: true,
      status: 'NOT_CLOCKED_IN',
      record: null,
      history: userRecords,
    });
  } catch (error: any) {
    console.error('[Attendance API Error] GET /status failed:', error);
    return fail(res, 500, error.message || 'Failed to fetch attendance status');
  }
});

// POST /api/attendance/clock-in - Clock in user after geofence & active session check
attendanceRouter.post('/clock-in', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.userId || req.body?.userId || req.query?.userId;
    if (!userId) {
      return fail(res, 401, 'User identification required for clock in');
    }

    const allRecords = await db.list('attendance_records');
    const userRecords = (allRecords || [])
      .filter((r: any) => String(r.userId || r.userid || '').toLowerCase() === String(userId).toLowerCase())
      .map(normalizeRecord)
      .filter(Boolean);

    // 1. Check if user is already clocked in
    const existingOpen = userRecords.find((r: any) => !r.clockOutTime);
    if (existingOpen) {
      return fail(res, 400, 'User is already clocked in', {
        status: 'CLOCKED_IN',
        record: existingOpen,
        history: userRecords,
      });
    }

    // 2. Validate Geofence
    const { latitude, longitude, locationName } = req.body ?? {};
    if (latitude === undefined || longitude === undefined) {
      return fail(res, 400, 'GPS coordinates (latitude, longitude) are required for clock in');
    }

    const calculatedDistance = Math.round(
      distanceMeters(Number(latitude), Number(longitude), env.OFFICE_LATITUDE, env.OFFICE_LONGITUDE)
    );
    const distanceFromOffice = Number(req.body?.distanceFromOffice ?? calculatedDistance);

    if (distanceFromOffice > env.OFFICE_GEOFENCE_RADIUS) {
      return fail(res, 400, `You are outside the authorized geofence boundary (${distanceFromOffice}m from office, required <= ${env.OFFICE_GEOFENCE_RADIUS}m)`, {
        distance: distanceFromOffice,
        requiredRadius: env.OFFICE_GEOFENCE_RADIUS,
        isInside: false,
      });
    }

    // 3. Create Attendance Record
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN');
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newRecordData = {
      id: db.makeId('att-'),
      userId,
      date: dateStr,
      clockInTime: timeStr,
      clockOutTime: null,
      latitude: Number(latitude),
      longitude: Number(longitude),
      locationName: locationName || 'LogiSphere Head Office',
      distanceFromOffice,
      status: 'Verified Location',
    };

    const savedRaw = await db.insert('attendance_records', newRecordData);
    const savedRecord = normalizeRecord(savedRaw) || newRecordData;

    const updatedHistory = [savedRecord, ...userRecords];

    return res.status(201).json({
      success: true,
      status: 'CLOCKED_IN',
      record: savedRecord,
      history: updatedHistory,
    });
  } catch (error: any) {
    console.error('[Attendance API Error] POST /clock-in failed:', error);
    return fail(res, 500, error.message || 'Clock in failed');
  }
});

// POST /api/attendance/clock-out - Clock out active session for user
attendanceRouter.post('/clock-out', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.userId || req.body?.userId || req.query?.userId;
    if (!userId) {
      return fail(res, 401, 'User identification required for clock out');
    }

    const allRecords = await db.list('attendance_records');
    const userRecords = (allRecords || [])
      .filter((r: any) => String(r.userId || r.userid || '').toLowerCase() === String(userId).toLowerCase())
      .map(normalizeRecord)
      .filter(Boolean);

    const openRecord = userRecords.find((r: any) => !r.clockOutTime);
    if (!openRecord) {
      return fail(res, 400, 'No active clock-in session found to clock out');
    }

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const recordId = openRecord.id;

    const updatedRaw = await db.update('attendance_records', { id: recordId }, { clockOutTime: timeStr, clockouttime: timeStr });
    const updatedRecord = normalizeRecord(updatedRaw) || { ...openRecord, clockOutTime: timeStr };

    const freshAll = await db.list('attendance_records');
    const updatedHistory = (freshAll || [])
      .filter((r: any) => String(r.userId || r.userid || '').toLowerCase() === String(userId).toLowerCase())
      .map(normalizeRecord)
      .filter(Boolean);

    return res.json({
      success: true,
      status: 'NOT_CLOCKED_IN',
      record: updatedRecord,
      history: updatedHistory,
    });
  } catch (error: any) {
    console.error('[Attendance API Error] POST /clock-out failed:', error);
    return fail(res, 500, error.message || 'Clock out failed');
  }
});

// GET /api/attendance/history - Get list of attendance logs
attendanceRouter.get('/history', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.userId || (req.query.userId as string);
    const allRecords = await db.list('attendance_records');
    const filtered = userId
      ? (allRecords || []).filter((r: any) => String(r.userId || r.userid || '').toLowerCase() === String(userId).toLowerCase())
      : allRecords || [];

    const normalized = filtered.map(normalizeRecord).filter(Boolean);
    return res.json(normalized);
  } catch (error: any) {
    return fail(res, 500, error.message || 'Failed to fetch attendance history');
  }
});

