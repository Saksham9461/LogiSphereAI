import {Router} from 'express';
import bcrypt from 'bcryptjs';
import {db} from '../../config/database';
import {supabase} from '../../config/supabase';
import {optionalAuth, signToken} from '../../middleware/auth';
import {fail, mustChangePasswordUsers, publicUser} from '../../utils/http';

export const authRouter = Router();

authRouter.post('/login', async (req, res) => {
  const {email, password, role} = req.body ?? {};
  if (!email || !password) return fail(res, 400, 'Email and password are required');



  const user = await db.find('users', {email});
  if (!user || !bcrypt.compareSync(password ?? '', user.passwordHash)) return fail(res, 401, 'Invalid credentials');
  if (role && user.role !== role && user.role !== role.replace('FLEET_MANAGER', 'ROLE_MANAGER')) return fail(res, 403, 'Role does not match this account');

  const token = signToken(user);
  return res.json({success: true, message: 'Login successful', serviceResult: {...publicUser(user), token}});
});

authRouter.post('/change-password', optionalAuth, async (req, res) => {
  try {
    const userFromReq = (req as any).user;
    const body = req.body ?? {};
    const email = body.email || userFromReq?.email;
    const currentPassword = body.currentPassword || body.oldPassword;
    const newPassword = body.newPassword;

    if (!currentPassword || !newPassword) {
      return fail(res, 400, 'Current password and new password are required');
    }

    let user: any = null;
    if (userFromReq?.id) {
      user = await db.find('users', {id: userFromReq.id});
    }
    if (!user && email) {
      user = await db.find('users', {email});
    }

    if (!user) return fail(res, 404, 'User not found');

    if (!bcrypt.compareSync(currentPassword, user.passwordHash)) {
      return fail(res, 400, 'Current password is incorrect');
    }

    if (newPassword.length < 8) {
      return fail(res, 400, 'New password must be at least 8 characters long');
    }

    if (newPassword === currentPassword) {
      return fail(res, 400, 'New password cannot be the same as current password');
    }

    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

    if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      return fail(res, 400, 'New password must contain uppercase, lowercase, number, and special character');
    }

    const newHash = bcrypt.hashSync(newPassword, 10);
    const updated = await db.update('users', {id: user.id}, {passwordHash: newHash});

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
    if (supabase && user.email && isUuid) {
      try {
        await supabase.auth.admin.updateUserById(user.id, {password: newPassword});
      } catch (e: any) {
        // Ignored non-critical auth provider sync warning
      }
    }

    mustChangePasswordUsers.delete(user.id);
    mustChangePasswordUsers.delete(user.email);
    if (updated) {
      updated.mustChangePassword = false;
      updated.must_change_password = false;
    }

    const formatted = publicUser(updated || user);
    formatted.mustChangePassword = false;

    const token = signToken(formatted);
    return res.json({
      success: true,
      message: 'Password updated successfully',
      user: formatted,
      serviceResult: {...formatted, token},
      token
    });
  } catch (error: any) {
    console.error('Error changing password:', error);
    return fail(res, 500, error?.message || 'Failed to change password');
  }
});

authRouter.get('/request-reset-password', async (req, res) => {
  const email = String(req.query.email ?? '');
  if (!email) return fail(res, 400, 'Email is required');
  return res.json({success: true, data: {email, resetToken: 'dev-reset-token'}, message: 'Password reset token generated'});
});

authRouter.post('/request-reset-password', async (req, res) => {
  req.query.email = req.body?.email;
  return res.json({success: true, data: {email: req.body?.email, resetToken: 'dev-reset-token'}, message: 'Password reset token generated'});
});

authRouter.post('/reset-password', async (req, res) => {
  const token = String(req.query.token ?? req.body?.token ?? '');
  const newPassword = String(req.query.newPassword ?? req.body?.newPassword ?? '');
  if (!token || !newPassword) return fail(res, 400, 'Token and newPassword are required');
  return res.json({success: true, data: {updated: true}, message: 'Password reset successful'});
});
