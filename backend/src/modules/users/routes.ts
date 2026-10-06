import {Router} from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import {db} from '../../config/database';
import {supabase} from '../../config/supabase';
import {optionalAuth, signToken} from '../../middleware/auth';
import {fail, mustChangePasswordUsers, publicUser} from '../../utils/http';

export const userRouter = Router();
const normalizeRole = (role: string) => role?.startsWith('ROLE_') ? role : ({FLEET_MANAGER: 'ROLE_MANAGER', DISPATCHER: 'ROLE_DISPATCHER', SAFETY_OFFICER: 'ROLE_SAFETY_OFFICER', FINANCIAL_ANALYST: 'ROLE_FINANCE', DRIVER: 'ROLE_DRIVER'} as any)[role] ?? role;

function generateTempPassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  const bytes = crypto.randomBytes(12);
  let pass = 'LS-';
  for (let i = 0; i < 9; i++) {
    pass += chars[bytes[i] % chars.length];
  }
  return pass;
}

const formatLicenseExpiry = (raw: any): string | null => {
  if (!raw) return null;
  const str = String(raw).trim();
  if (!str) return null;
  if (/^\d{4}-\d{2}/.test(str)) return str;
  const parts = str.split('/');
  if (parts.length === 2) {
    const mm = parts[0].padStart(2, '0');
    const yyyy = parts[1];
    if (mm && yyyy && !isNaN(Number(mm)) && !isNaN(Number(yyyy))) {
      return `${yyyy}-${mm}-01`;
    }
  }
  return str;
};

userRouter.post('/create', optionalAuth, async (req, res) => {
  const {name, email, phoneNo, licenseNo, licenseExpiryDate} = req.body ?? {};
  const role = normalizeRole(req.body?.role);

  let passwordToUse = req.body?.password;
  let tempPasswordGenerated: string | null = null;

  if (role === 'ROLE_DRIVER' || !passwordToUse) {
    tempPasswordGenerated = generateTempPassword();
    passwordToUse = tempPasswordGenerated;
  }

  if (!name || !email || !passwordToUse || !role) {
    return fail(res, 400, 'name, email, password and role are required');
  }

  if (await db.find('users', {email})) {
    return fail(res, 409, 'Email already exists');
  }

  const userId = db.makeId(role === 'ROLE_DRIVER' ? 'drv-' : 'usr-');

  if (role === 'ROLE_DRIVER' || tempPasswordGenerated) {
    mustChangePasswordUsers.add(userId);
    mustChangePasswordUsers.add(email);
  }



  const user = await db.insert('users', {
    id: userId,
    name,
    email,
    phoneNo,
    role,
    licenseNo,
    licenseExpiryDate: formatLicenseExpiry(licenseExpiryDate),
    passwordHash: bcrypt.hashSync(passwordToUse, 10),
    trips: req.body?.trips !== undefined ? Number(req.body.trips) : 0,
    safetyScore: req.body?.safetyScore !== undefined ? Number(req.body.safetyScore) : 95,
    status: req.body?.status ? String(req.body.status).toUpperCase().replace(/\s+/g, '_') : (req.body?.driverStatus ? String(req.body.driverStatus).toUpperCase().replace(/\s+/g, '_') : (role === 'ROLE_DRIVER' ? 'AVAILABLE' : 'ACTIVE'))
  });

  const formattedUser = publicUser(user);
  const token = signToken(user);

  const responsePayload: Record<string, any> = {
    token,
    user: formattedUser,
    driver: formattedUser,
    success: true,
    message: role === 'ROLE_DRIVER' ? 'Driver account created successfully' : 'User created successfully',
    serviceResult: {...formattedUser, token}
  };

  if (tempPasswordGenerated) {
    responsePayload.credentials = {
      email,
      temporaryPassword: tempPasswordGenerated
    };
  }

  return res.status(201).json(responsePayload);
});

userRouter.get('/', async (req, res) => {
  const role = req.query.role ? normalizeRole(String(req.query.role)) : undefined;
  const users = await db.list('users', role ? {role} : undefined);
  res.json(users.map(publicUser));
});

userRouter.put('/update', optionalAuth, async (req, res) => {
  try {
    const id = String(req.query.id ?? req.body?.id ?? req.body?.userID ?? req.body?.driverID ?? '');
    if (!id) return fail(res, 400, 'User ID is required');

    const body = req.body ?? {};
    const patch: Record<string, any> = {};

    if (body.name !== undefined) patch.name = String(body.name).trim();
    if (body.phoneNo !== undefined || body.phone !== undefined || body.contact !== undefined) {
      patch.phoneNo = String(body.phoneNo ?? body.phone ?? body.contact).trim();
    }
    if (body.licenseNo !== undefined || body.licenseNumber !== undefined) {
      patch.licenseNo = String(body.licenseNo ?? body.licenseNumber).trim();
    }
    if (body.licenseExpiryDate !== undefined || body.licenseExpiry !== undefined) {
      patch.licenseExpiryDate = formatLicenseExpiry(body.licenseExpiryDate ?? body.licenseExpiry);
    }
    if (body.trips !== undefined || body.tripsCompleted !== undefined) {
      const tripsVal = Number(body.trips ?? body.tripsCompleted);
      if (!isNaN(tripsVal)) patch.trips = tripsVal;
    }
    if (body.safetyScore !== undefined) {
      const safetyVal = Number(body.safetyScore);
      if (!isNaN(safetyVal)) patch.safetyScore = safetyVal;
    }
    if (body.status !== undefined || body.driverStatus !== undefined) {
      patch.status = String(body.status ?? body.driverStatus).trim().toUpperCase().replace(/\s+/g, '_');
    }

    const updated = await db.update('users', {id}, patch);
    if (!updated) return fail(res, 404, 'User not found');
    const formatted = publicUser(updated);
    return res.json({success: true, user: formatted, data: formatted});
  } catch (error: any) {
    console.error('Error updating user:', error?.message || error);
    return fail(res, 500, error?.message || 'Failed to update user');
  }
});

userRouter.delete('/delete', optionalAuth, async (req, res) => {
  try {
    if (req.user && req.user.role === 'ROLE_DRIVER') {
      return fail(res, 403, 'Drivers are not authorized to delete driver records');
    }

    const id = String(req.query.id ?? req.body?.id ?? req.body?.driverID ?? '');
    const forceConfirm = req.query.confirm === 'true' || req.body?.confirm === true;
    if (!id) return fail(res, 400, 'Driver / User ID is required');

    const existing = await db.find('users', { id });
    if (!existing) return fail(res, 404, 'Driver not found');

    const driverIdLower = id.toLowerCase();
    const driverEmailLower = String(existing.email || '').toLowerCase();
    const driverNameLower = String(existing.name || '').toLowerCase();

    // 1. Check active trips
    const allTrips = await db.list('trips');
    const activeStatuses = new Set([
      'ACCEPTED',
      'ASSIGNED',
      'GOING_TO_PICKUP',
      'ARRIVED_AT_PICKUP',
      'PICKED_UP',
      'IN_TRANSIT',
      'ARRIVED_AT_DROP',
      'DISPATCHED',
      'PENDING_APPROVAL',
    ]);

    const activeTrip = (allTrips || []).find((t: any) => {
      const tDriverID = String(t.driverID || t.driverid || t.driver?.id || t.driver?.userID || '').toLowerCase();
      const tDriverEmail = String(t.driverEmail || t.driver?.email || '').toLowerCase();
      const tDriverName = String(t.driverName || t.driver?.name || '').toLowerCase();
      const matchesDriver =
        (tDriverID && tDriverID === driverIdLower) ||
        (tDriverEmail && tDriverEmail === driverEmailLower) ||
        (tDriverName && tDriverName === driverNameLower);

      const statusKey = String(t.status || '').trim().toUpperCase();
      return matchesDriver && activeStatuses.has(statusKey);
    });

    if (activeTrip) {
      return res.status(409).json({
        success: false,
        message: 'Driver cannot be deleted because the driver is currently assigned to an active trip.',
        activeTripID: activeTrip.tripID || activeTrip.tripid,
      });
    }

    // 2. Check driver status
    const currentStatus = String(existing.status || existing.driverStatus || '').toUpperCase().replace(/\s+/g, '_');
    if (currentStatus === 'ON_TRIP') {
      return res.status(409).json({
        success: false,
        message: 'Driver cannot be deleted because the driver status is ON_TRIP.',
      });
    }

    // 3. Check active attendance session (clocked in without clockout)
    const allAttendance = await db.list('attendance_records');
    const activeAttendance = (allAttendance || []).find((a: any) => {
      const aUserId = String(a.userId || a.userid || '').toLowerCase();
      const isDriver = aUserId === driverIdLower;
      const isClockedIn = !a.clockOutTime && !a.clockouttime;
      return isDriver && isClockedIn;
    });

    if (activeAttendance) {
      return res.status(409).json({
        success: false,
        message: 'Driver cannot be deleted because the driver has an active clock-in session. Please clock out the driver first.',
      });
    }

    // 4. Check historical completed records
    const completedTrips = (allTrips || []).filter((t: any) => {
      const tDriverID = String(t.driverID || t.driverid || t.driver?.id || t.driver?.userID || '').toLowerCase();
      const tDriverEmail = String(t.driverEmail || t.driver?.email || '').toLowerCase();
      const tDriverName = String(t.driverName || t.driver?.name || '').toLowerCase();
      const matchesDriver =
        (tDriverID && tDriverID === driverIdLower) ||
        (tDriverEmail && tDriverEmail === driverEmailLower) ||
        (tDriverName && tDriverName === driverNameLower);

      const statusKey = String(t.status || '').trim().toUpperCase();
      return matchesDriver && (statusKey === 'DELIVERED' || statusKey === 'COMPLETED' || statusKey === 'REJECTED' || statusKey === 'CANCELLED');
    });

    if (completedTrips.length > 0 && !forceConfirm) {
      return res.status(409).json({
        success: false,
        requiresConfirmation: true,
        historicalTripsCount: completedTrips.length,
        message: `This driver has ${completedTrips.length} historical trip record(s). Permanently deleting the driver will remove the driver record from Supabase PostgreSQL and set driver assignment to null on historical records. Do you want to continue?`,
      });
    }

    // PERMANENT HARD DELETE FROM SUPABASE POSTGRESQL
    await db.remove('users', { id });

    return res.json({
      success: true,
      message: 'Driver permanently deleted from database',
      id,
    });
  } catch (error: any) {
    console.error('Error deleting driver:', error?.message || error);
    return fail(res, 500, error?.message || 'Failed to delete driver');
  }
});

