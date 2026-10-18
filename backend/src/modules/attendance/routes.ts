import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { db } from '../../config/database';
import { distanceMeters } from '../../utils/distance';
import { optionalAuth, getTrustedOrgId } from '../../middleware/auth';
import { fail, ok } from '../../utils/http';
import {
  BUSINESS_TIMEZONE,
  getBusinessDateString,
  extractRecordDateKey,
  runAutoClockOutReconciliation,
} from './autoClockOut';
import {
  generateAttendancePdf,
  GroupedAttendanceReportItem,
  AttendanceSessionReportItem,
} from './pdfGenerator';

export const attendanceRouter = Router();

function normalizeRecord(row: any) {
  if (!row) return null;
  const isAuto = Boolean(row.auto_clock_out ?? row.autoclockout ?? row.autoClockOut ?? false);
  const clockOut = row.clockOutTime || row.clockouttime || null;
  const clockOutType =
    row.clock_out_type ||
    row.clockouttype ||
    row.clockOutType ||
    (isAuto ? 'AUTOMATIC' : clockOut ? 'MANUAL' : null);

  return {
    id: row.id,
    userId: row.userId || row.userid,
    date: row.date || new Date().toLocaleDateString('en-IN'),
    clockInTime: row.clockInTime || row.clockintime,
    clockOutTime: clockOut,
    autoClockOut: isAuto,
    clockOutType,
    latitude: Number(row.latitude ?? 0),
    longitude: Number(row.longitude ?? 0),
    locationName: row.locationName || row.locationname || 'LogiSphere Head Office',
    distanceFromOffice: Number(row.distanceFromOffice ?? row.distancefromoffice ?? 0),
    status: row.status || 'Verified Location',
    createdAt: row.createdAt || row.createdat || row.created_at,
    updatedAt: row.updatedAt || row.updatedat || row.updated_at,
  };
}

export function parseTimeToMinutes(timeStr: string): number | null {
  if (!timeStr) return null;
  const trimmed = timeStr.trim().toUpperCase();
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const meridiem = match12[3];
    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }
  try {
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) {
      return d.getHours() * 60 + d.getMinutes();
    }
  } catch (_) {}
  return null;
}

export function formatMinutesToDuration(totalMinutes: number): string {
  if (totalMinutes <= 0) return '0m';
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function calculateSessionMinutes(clockIn: string, clockOut: string | null): number {
  if (!clockIn || !clockOut) return 0;
  const inMins = parseTimeToMinutes(clockIn);
  const outMins = parseTimeToMinutes(clockOut);
  if (inMins === null || outMins === null) return 0;
  if (outMins >= inMins) {
    return outMins - inMins;
  }
  return 1440 - inMins + outMins;
}

/**
 * Helper to authenticate user via Header or Query param
 */
function resolveAuthUser(req: any) {
  if (req.user?.userId) {
    return req.user;
  }
  let token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : req.query.token;

  if (typeof token === 'string' && token.trim()) {
    try {
      const decoded = jwt.verify(token.trim(), env.JWT_SECRET) as any;
      if (decoded && (decoded.userId || decoded.id)) {
        return {
          userId: decoded.userId || decoded.id,
          email: decoded.email,
          role: decoded.role || 'USER',
        };
      }
    } catch (_) {}
  }
  return null;
}

// GET /api/attendance/status - Get current active attendance status for user
attendanceRouter.get('/status', optionalAuth, async (req, res) => {
  try {
    const user = resolveAuthUser(req);
    const userId = user?.userId || (req.query.userId as string) || (req.headers['x-user-id'] as string);
    if (!userId) {
      return res.json({
        success: true,
        status: 'NOT_CLOCKED_IN',
        record: null,
        history: [],
      });
    }

    // Reconcile any past open sessions for this user so they don't block status
    await runAutoClockOutReconciliation(userId);

    const allRecords = await db.list('attendance_records');
    const userRecords = (allRecords || [])
      .filter((r: any) => String(r.userId || r.userid || '').toLowerCase() === String(userId).toLowerCase())
      .map(normalizeRecord)
      .filter(Boolean);

    // Active session strictly means clockOutTime is null
    const openRecord = userRecords.find((r: any) => !r.clockOutTime);

    // Only return today's attendance logs for recent logs view
    const todayDateKey = getBusinessDateString();
    const todayRecords = userRecords.filter((r: any) => {
      const recKey = extractRecordDateKey(r, BUSINESS_TIMEZONE);
      return recKey === todayDateKey;
    });

    if (openRecord) {
      return res.json({
        success: true,
        status: 'CLOCKED_IN',
        record: openRecord,
        history: todayRecords,
      });
    }

    return res.json({
      success: true,
      status: 'NOT_CLOCKED_IN',
      record: null,
      history: todayRecords,
    });
  } catch (error: any) {
    console.error('[Attendance API Error] GET /status failed:', error);
    return fail(res, 500, error.message || 'Failed to fetch attendance status');
  }
});

// POST /api/attendance/clock-in - Clock in user after geofence & active session check
attendanceRouter.post('/clock-in', optionalAuth, async (req, res) => {
  try {
    const user = resolveAuthUser(req);
    const userId = user?.userId || req.body?.userId || req.query?.userId || (req.headers['x-user-id'] as string);
    if (!userId) {
      return fail(res, 401, 'User identification required for clock in');
    }

    // 1. Reconcile any open past sessions first so yesterday's open session never blocks today!
    await runAutoClockOutReconciliation(userId);

    const allRecords = await db.list('attendance_records');
    const userRecords = (allRecords || [])
      .filter((r: any) => String(r.userId || r.userid || '').toLowerCase() === String(userId).toLowerCase())
      .map(normalizeRecord)
      .filter(Boolean);

    // 2. Check if user currently has an open session for today
    const existingOpen = userRecords.find((r: any) => !r.clockOutTime);
    if (existingOpen) {
      return fail(res, 400, 'User is already clocked in', {
        status: 'CLOCKED_IN',
        record: existingOpen,
        history: userRecords,
      });
    }

    // 3. Validate Geofence
    const { latitude, longitude, locationName } = req.body ?? {};
    if (latitude === undefined || longitude === undefined) {
      return fail(res, 400, 'GPS coordinates (latitude, longitude) are required for clock in');
    }

    const calculatedDistance = Math.round(
      distanceMeters(Number(latitude), Number(longitude), env.OFFICE_LATITUDE, env.OFFICE_LONGITUDE)
    );
    const distanceFromOffice = Number(req.body?.distanceFromOffice ?? calculatedDistance);

    if (distanceFromOffice > env.OFFICE_GEOFENCE_RADIUS) {
      return fail(
        res,
        400,
        `You are outside the authorized geofence boundary (${distanceFromOffice}m from office, required <= ${env.OFFICE_GEOFENCE_RADIUS}m)`,
        {
          distance: distanceFromOffice,
          requiredRadius: env.OFFICE_GEOFENCE_RADIUS,
          isInside: false,
        }
      );
    }

    // 4. Create Attendance Record
    const orgId = getTrustedOrgId(req);
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN');
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newRecordData = {
      id: db.makeId('att-'),
      organization_id: orgId,
      userId,
      date: dateStr,
      clockInTime: timeStr,
      clockOutTime: null,
      autoClockOut: false,
      clockOutType: 'MANUAL',
      latitude: Number(latitude),
      longitude: Number(longitude),
      locationName: locationName || 'LogiSphere Head Office',
      distanceFromOffice,
      status: 'Verified Location',
    };

    const savedRaw = await db.insert('attendance_records', newRecordData);
    const savedRecord = normalizeRecord(savedRaw) || newRecordData;

    const todayDateKey = getBusinessDateString();
    const updatedHistory = [savedRecord, ...userRecords].filter((r: any) => {
      const recKey = extractRecordDateKey(r, BUSINESS_TIMEZONE);
      return recKey === todayDateKey;
    });

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
    const user = resolveAuthUser(req);
    const userId = user?.userId || req.body?.userId || req.query?.userId || (req.headers['x-user-id'] as string);
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

    const updatedRaw = await db.update(
      'attendance_records',
      { id: recordId },
      {
        clockOutTime: timeStr,
        clockouttime: timeStr,
        autoClockOut: false,
        auto_clock_out: false,
        clockOutType: 'MANUAL',
        clock_out_type: 'MANUAL',
      }
    );
    const updatedRecord = normalizeRecord(updatedRaw) || {
      ...openRecord,
      clockOutTime: timeStr,
      clockOutType: 'MANUAL',
      autoClockOut: false,
    };

    const freshAll = await db.list('attendance_records');
    const todayDateKey = getBusinessDateString();
    const updatedHistory = (freshAll || [])
      .filter((r: any) => String(r.userId || r.userid || '').toLowerCase() === String(userId).toLowerCase())
      .map(normalizeRecord)
      .filter(Boolean)
      .filter((r: any) => {
        const recKey = extractRecordDateKey(r, BUSINESS_TIMEZONE);
        return recKey === todayDateKey;
      });

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

// POST /api/attendance/reconcile - Trigger auto clock-out reconciliation
attendanceRouter.post('/reconcile', optionalAuth, async (req, res) => {
  try {
    const user = resolveAuthUser(req);
    const targetUserId = req.body?.userId || (user && !['ROLE_MANAGER', 'FLEET_MANAGER', 'ADMIN'].includes(user.role) ? user.userId : undefined);
    const result = await runAutoClockOutReconciliation(targetUserId);
    return ok(res, result, 'Reconciliation complete');
  } catch (error: any) {
    return fail(res, 500, error.message || 'Reconciliation failed');
  }
});

// GET /api/attendance/history - Get list of attendance logs
attendanceRouter.get('/history', optionalAuth, async (req, res) => {
  try {
    const user = resolveAuthUser(req);
    const isManager = user && ['ROLE_MANAGER', 'FLEET_MANAGER', 'ADMIN'].includes(user.role);
    const requestedUserId = req.query.userId as string;

    // Strict Role authorization: non-managers can only see their own history
    const userId = !isManager && user ? user.userId : requestedUserId;

    const allRecords = await db.list('attendance_records');
    const filtered = userId
      ? (allRecords || []).filter((r: any) => String(r.userId || r.userid || '').toLowerCase() === String(userId).toLowerCase())
      : allRecords || [];

    const normalized = filtered.map(normalizeRecord).filter(Boolean);
    if (req.query.today === 'true') {
      const todayDateKey = getBusinessDateString();
      const todayOnly = normalized.filter((r: any) => {
        const recKey = extractRecordDateKey(r, BUSINESS_TIMEZONE);
        return recKey === todayDateKey;
      });
      return res.json(todayOnly);
    }
    return res.json(normalized);
  } catch (error: any) {
    return fail(res, 500, error.message || 'Failed to fetch attendance history');
  }
});

/**
 * Shared Report Builder Logic
 */
async function buildGroupedAttendanceReport(
  req: any
): Promise<{
  reportData: GroupedAttendanceReportItem[];
  metrics: {
    totalStaff: number;
    totalDays: number;
    totalSessions: number;
    totalWorkedMinutes: number;
    totalWorkedHours: string;
    totalAutoClosed: number;
  };
  currentUser: any;
  isManager: boolean;
}> {
  const user = resolveAuthUser(req);
  if (!user) {
    throw new Error('Authentication required');
  }

  const isManager = ['ROLE_MANAGER', 'FLEET_MANAGER', 'ADMIN'].includes(user.role);

  // 1. Run reconciliation to ensure any open sessions past 11:59 PM are cleanly closed
  await runAutoClockOutReconciliation();

  const orgId = getTrustedOrgId(req);
  const orgFilter = orgId ? { organization_id: orgId } : undefined;

  // 2. Load users to get accurate names, emails, roles
  const allUsers = await db.list('users', orgFilter);
  const userMap = new Map<string, any>();
  allUsers.forEach((u: any) => {
    const id = u.id || u.userID || u.driverID;
    if (id) userMap.set(String(id).toLowerCase(), u);
  });

  // 3. Load attendance records
  const allRecords = (await db.list('attendance_records', orgFilter))
    .map(normalizeRecord)
    .filter((r): r is NonNullable<ReturnType<typeof normalizeRecord>> => Boolean(r));

  // 4. Role-based filtering
  let authorizedRecords = allRecords;
  if (!isManager) {
    // Non-managers strictly view only their own records
    authorizedRecords = allRecords.filter(
      (r: any) => String(r.userId).toLowerCase() === String(user.userId).toLowerCase()
    );
  } else if (req.query.userId) {
    // Managers can optionally filter by specific staff
    authorizedRecords = allRecords.filter(
      (r: any) => String(r.userId).toLowerCase() === String(req.query.userId).toLowerCase()
    );
  }

  // 5. Query Filters
  const { search, startDate, endDate, status } = req.query;

  // Date range filtering
  if (startDate || endDate) {
    authorizedRecords = authorizedRecords.filter((r: any) => {
      const dateKey = extractRecordDateKey(r, BUSINESS_TIMEZONE);
      if (startDate && dateKey < String(startDate)) return false;
      if (endDate && dateKey > String(endDate)) return false;
      return true;
    });
  }

  // Status filtering (e.g. ALL, COMPLETED, IN_PROGRESS, AUTO_CLOSED)
  if (status && status !== 'ALL') {
    authorizedRecords = authorizedRecords.filter((r: any) => {
      if (status === 'IN_PROGRESS') return !r.clockOutTime;
      if (status === 'AUTO_CLOSED') return r.autoClockOut;
      if (status === 'COMPLETED') return Boolean(r.clockOutTime && !r.autoClockOut);
      return true;
    });
  }

  // Search filtering (staff name, email, role)
  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim().toLowerCase();
    authorizedRecords = authorizedRecords.filter((r: any) => {
      const uInfo = userMap.get(String(r.userId).toLowerCase());
      const name = (uInfo?.name || '').toLowerCase();
      const email = (uInfo?.email || '').toLowerCase();
      const role = (uInfo?.role || '').toLowerCase();
      return name.includes(q) || email.includes(q) || role.includes(q);
    });
  }

  // 6. Group by (userId, dateKey)
  const groupMap = new Map<string, {
    userId: string;
    date: string;
    dateKey: string;
    rawSessions: any[];
  }>();

  for (const r of authorizedRecords) {
    if (!r) continue;
    const uId = String(r.userId).toLowerCase();
    const dateKey = extractRecordDateKey(r, BUSINESS_TIMEZONE);
    const groupKey = `${uId}__${dateKey}`;

    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, {
        userId: r.userId,
        date: r.date,
        dateKey,
        rawSessions: [],
      });
    }
    groupMap.get(groupKey)!.rawSessions.push(r);
  }

  // 7. Process grouped items
  const reportData: GroupedAttendanceReportItem[] = [];

  for (const [groupKey, group] of groupMap.entries()) {
    const uInfo = userMap.get(String(group.userId).toLowerCase()) || {};
    const staffName = uInfo.name || (group.userId === user.userId ? 'You' : 'Staff Member');
    const staffEmail = uInfo.email || '';
    const staffRole = uInfo.role || 'STAFF';

    // Sort sessions chronologically
    const sortedRaw = [...group.rawSessions].sort((a, b) => {
      const tA = parseTimeToMinutes(a.clockInTime) ?? 0;
      const tB = parseTimeToMinutes(b.clockInTime) ?? 0;
      return tA - tB;
    });

    let dailyTotalMins = 0;
    let hasInProgress = false;
    let hasAutoClosed = false;

    const formattedSessions: AttendanceSessionReportItem[] = sortedRaw.map((s, idx) => {
      const isAuto = Boolean(s.autoClockOut);
      const isClosed = Boolean(s.clockOutTime);
      const sessionMins = isClosed ? calculateSessionMinutes(s.clockInTime, s.clockOutTime) : 0;

      if (!isClosed) hasInProgress = true;
      if (isAuto) hasAutoClosed = true;
      dailyTotalMins += sessionMins;

      return {
        id: s.id,
        sessionNumber: idx + 1,
        clockInTime: s.clockInTime,
        clockOutTime: s.clockOutTime,
        durationMinutes: sessionMins,
        duration: isClosed ? formatMinutesToDuration(sessionMins) : 'In Progress',
        clockOutType: isAuto ? 'AUTOMATIC' : isClosed ? 'MANUAL' : 'IN_PROGRESS',
        autoClockOut: isAuto,
        locationName: s.locationName || 'LogiSphere Head Office',
        distanceFromOffice: s.distanceFromOffice || 0,
        status: s.status || 'Verified Location',
      };
    });

    const dayStatus: 'COMPLETED' | 'IN_PROGRESS' | 'AUTO_CLOSED' = hasInProgress
      ? 'IN_PROGRESS'
      : hasAutoClosed
      ? 'AUTO_CLOSED'
      : 'COMPLETED';

    reportData.push({
      id: groupKey,
      userId: group.userId,
      staffName,
      staffEmail,
      staffRole,
      date: group.date,
      dateKey: group.dateKey,
      totalWorkedMinutes: dailyTotalMins,
      totalWorkedDuration: formatMinutesToDuration(dailyTotalMins),
      sessionsCount: formattedSessions.length,
      status: dayStatus,
      hasAutoClockOut: hasAutoClosed,
      sessions: formattedSessions,
    });
  }

  // Sort report items by dateKey descending, then staffName
  reportData.sort((a, b) => {
    if (a.dateKey !== b.dateKey) {
      return b.dateKey.localeCompare(a.dateKey);
    }
    return a.staffName.localeCompare(b.staffName);
  });

  // Calculate overall metrics
  const totalStaff = new Set(reportData.map(r => r.userId)).size;
  const totalDays = reportData.length;
  const totalSessions = reportData.reduce((acc, r) => acc + r.sessionsCount, 0);
  const totalWorkedMinutes = reportData.reduce((acc, r) => acc + r.totalWorkedMinutes, 0);
  const totalAutoClosed = reportData.filter(r => r.hasAutoClockOut).length;

  return {
    reportData,
    metrics: {
      totalStaff,
      totalDays,
      totalSessions,
      totalWorkedMinutes,
      totalWorkedHours: (totalWorkedMinutes / 60).toFixed(1),
      totalAutoClosed,
    },
    currentUser: user,
    isManager,
  };
}

// GET /api/attendance/report - Get grouped attendance report
attendanceRouter.get('/report', optionalAuth, async (req, res) => {
  try {
    const { reportData, metrics, currentUser, isManager } = await buildGroupedAttendanceReport(req);

    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.max(1, Math.min(100, parseInt(String(req.query.limit || '50'), 10)));
    const offset = (page - 1) * limit;

    const paginated = reportData.slice(offset, offset + limit);

    return ok(res, {
      items: paginated,
      total: reportData.length,
      page,
      limit,
      totalPages: Math.ceil(reportData.length / limit),
      metrics,
      userRole: currentUser.role,
      isManager,
    });
  } catch (error: any) {
    if (error.message === 'Authentication required') {
      return fail(res, 401, 'Authentication required');
    }
    console.error('[Attendance Report Error]:', error);
    return fail(res, 500, error.message || 'Failed to fetch attendance report');
  }
});

// GET /api/attendance/report/export-pdf - Export attendance report as PDF
attendanceRouter.get('/report/export-pdf', optionalAuth, async (req, res) => {
  try {
    const { reportData, currentUser, isManager } = await buildGroupedAttendanceReport(req);

    const { startDate, endDate, search, status } = req.query;
    let dateRangeText = '';
    if (startDate && endDate) {
      dateRangeText = `${startDate} to ${endDate}`;
    } else if (startDate) {
      dateRangeText = `From ${startDate}`;
    } else if (endDate) {
      dateRangeText = `Until ${endDate}`;
    }

    const doc = generateAttendancePdf(reportData, {
      title: isManager ? 'ATTENDANCE & STAFF HOURS REPORT' : 'MY ATTENDANCE & HOURS REPORT',
      generatedBy: currentUser.email || currentUser.userId,
      userRole: isManager ? 'Fleet Management' : currentUser.role,
      dateRangeText,
      searchQuery: typeof search === 'string' ? search : undefined,
      statusFilter: typeof status === 'string' ? status : undefined,
    });

    const filename = `Attendance_Report_${getBusinessDateString()}_${Date.now()}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);
    doc.end();
  } catch (error: any) {
    if (error.message === 'Authentication required') {
      return fail(res, 401, 'Authentication required');
    }
    console.error('[Attendance Export PDF Error]:', error);
    return fail(res, 500, error.message || 'Failed to export attendance report as PDF');
  }
});
