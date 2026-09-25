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
    const id = String(req.query.id ?? req.body?.id ?? '');
    if (!id) return fail(res, 400, 'User ID is required');

    const existing = await db.find('users', {id});
    if (!existing) return fail(res, 404, 'User not found');

    await db.remove('users', {id});
    return res.json({success: true, message: 'User deleted successfully'});
  } catch (error: any) {
    console.error('Error deleting user:', error?.message || error);
    return fail(res, 500, error?.message || 'Failed to delete user');
  }
});

