import {Router} from 'express';
import {db} from '../../config/database';
import {optionalAuth} from '../../middleware/auth';
import {fail} from '../../utils/http';

export const notificationRouter = Router();

notificationRouter.get('/', optionalAuth, async (req, res) => {
  try {
    const all = await db.list('notifications');
    const userId = req.user?.userId || (req.query.userId as string);
    const role = req.user?.role || (req.query.role as string);

    if (!userId && !role) {
      return res.json(all);
    }

    const filtered = all.filter((n: any) => {
      if (n.userId && userId && n.userId === userId) return true;
      if (n.role && role && n.role === role) return true;
      if (!n.userId && !n.role) return true;
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
