import {Router} from 'express';
import {db} from '../../config/database';
import {optionalAuth} from '../../middleware/auth';
import {fail} from '../../utils/http';

export const notificationRouter = Router();

export function normalizeNotification(n: any) {
  if (!n) return n;
  const rawDate = n.createdAt || n.createdat || n.created_at;
  const dateObj = rawDate ? new Date(rawDate) : new Date();
  const validDateStr = !isNaN(dateObj.getTime()) ? dateObj.toISOString() : new Date().toISOString();

  return {
    id: String(n.id || ''),
    userId: n.userId || n.userid || null,
    role: n.role || null,
    title: String(n.title || 'Notification'),
    message: String(n.message || n.body || ''),
    body: String(n.body || n.message || ''),
    tripId: n.tripId || n.tripid || null,
    createdAt: validDateStr,
    createdat: validDateStr,
    read: Boolean(n.read),
  };
}

notificationRouter.get('/', optionalAuth, async (req, res) => {
  try {
    const all = await db.list('notifications');
    const normalized = (all || []).map(normalizeNotification);
    const userId = req.user?.userId || (req.query.userId as string);
    const role = req.user?.role || (req.query.role as string);

    if (!userId && !role) {
      return res.json(normalized);
    }

    const filtered = normalized.filter((n: any) => {
      const nUser = n.userId || n.userid;
      if (nUser && userId && nUser === userId) return true;
      if (n.role && role && n.role === role) return true;
      if (!nUser && !n.role) return true;
      return false;
    });

    return res.json(filtered);
  } catch (error: any) {
    return fail(res, 500, error.message || 'Failed to fetch notifications');
  }
});

notificationRouter.put('/:id/read', async (req, res) => {
  try {
    const id = req.params.id;
    const updated = await db.update('notifications', {id}, {read: true});
    return res.json(updated || {id, read: true});
  } catch (error: any) {
    return fail(res, 500, error.message || 'Failed to update notification');
  }
});
