import type {NextFunction, Request, Response} from 'express';
import jwt from 'jsonwebtoken';
import {env} from '../config/env';
import {fail} from '../utils/http';

declare global {
  namespace Express {
    interface Request {
      user?: {userId: string; email: string; role: string};
    }
  }
}

export const signToken = (user: any) =>
  jwt.sign({userId: user.id, email: user.email, role: user.role}, env.JWT_SECRET, {expiresIn: env.JWT_EXPIRES_IN as any});

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return fail(res, 401, 'Authentication required');
  try {
    req.user = jwt.verify(token, env.JWT_SECRET) as any;
    next();
  } catch {
    return fail(res, 401, 'Invalid or expired token');
  }
}

export const optionalAuth = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      req.user = jwt.verify(token, env.JWT_SECRET) as any;
    } catch {}
  }
  next();
};

export const authorize = (...roles: string[]) => (req: Request, res: Response, next: NextFunction) =>
  req.user && roles.includes(req.user.role) ? next() : fail(res, 403, 'Forbidden');
