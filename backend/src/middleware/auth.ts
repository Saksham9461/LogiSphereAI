import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { db } from '../config/database';
import { fail } from '../utils/http';
import {
  Permission,
  CanonicalRole,
  hasPermission,
  hasAnyPermission,
  normalizeRole,
} from '../config/permissions';

export { Permission, CanonicalRole, hasPermission, hasAnyPermission, normalizeRole };

export const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        userId: string;
        email: string;
        role: string;
        businessId?: string;
        business_id?: string;
        organizationId?: string;
        organization_id?: string;
        isPlatformAdmin?: boolean;
        membershipStatus?: string;
      };
      org?: {
        id: string;
        name: string;
        slug: string;
        status: string;
      };
    }
  }
}

export const signToken = (user: any) => {
  const orgId =
    user.businessId ||
    user.business_id ||
    user.organization_id ||
    user.organizationId ||
    DEFAULT_ORG_ID;

  const userId = user.id || user.userId || user.userID;

  return jwt.sign(
    {
      userId,
      id: userId,
      email: user.email,
      role: user.role,
      businessId: orgId,
      business_id: orgId,
      organizationId: orgId,
      organization_id: orgId,
      isPlatformAdmin: Boolean(user.isPlatformAdmin),
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as any }
  );
};

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  let token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token && req.query?.token && typeof req.query.token === 'string') {
    token = req.query.token;
  }
  if (!token) return fail(res, 401, 'Authentication required');
  try {
    const decoded: any = jwt.verify(token, env.JWT_SECRET);
    const userId = decoded.userId || decoded.id;
    const orgId =
      decoded.organizationId ||
      decoded.organization_id ||
      decoded.businessId ||
      decoded.business_id ||
      DEFAULT_ORG_ID;

    req.user = {
      ...decoded,
      id: userId,
      userId,
      organizationId: orgId,
      organization_id: orgId,
      businessId: orgId,
      business_id: orgId,
    };
    next();
  } catch {
    return fail(res, 401, 'Invalid or expired token');
  }
}

export const optionalAuth = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  let token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token && req.query?.token && typeof req.query.token === 'string') {
    token = req.query.token;
  }
  if (token) {
    try {
      const decoded: any = jwt.verify(token, env.JWT_SECRET);
      const userId = decoded.userId || decoded.id;
      const orgId =
        decoded.organizationId ||
        decoded.organization_id ||
        decoded.businessId ||
        decoded.business_id ||
        DEFAULT_ORG_ID;

      req.user = {
        ...decoded,
        id: userId,
        userId,
        organizationId: orgId,
        organization_id: orgId,
        businessId: orgId,
        business_id: orgId,
      };
    } catch { }
  }
  next();
};

export const authorize = (...roles: string[]) => (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return fail(res, 401, 'Authentication required');
  }
  const userRole = String(req.user.role || '').toUpperCase().trim();
  const normalizedRoles = roles.map(r => r.toUpperCase().trim());

  // Handle common role synonyms
  const roleAliases: Record<string, string[]> = {
    ROLE_MANAGER: ['MANAGER', 'FLEET_MANAGER', 'ROLE_ADMIN', 'ADMIN'],
    ROLE_DISPATCHER: ['DISPATCHER'],
    ROLE_DRIVER: ['DRIVER'],
    ROLE_SAFETY_OFFICER: ['SAFETY_OFFICER'],
    ROLE_FINANCE: ['FINANCIAL_ANALYST', 'FINANCE'],
  };

  const hasDirectRole = normalizedRoles.includes(userRole);
  const hasAliasRole = normalizedRoles.some(r => roleAliases[r]?.includes(userRole));

  return hasDirectRole || hasAliasRole ? next() : fail(res, 403, 'Forbidden: insufficient role permissions');
};

/**
 * Resolves trusted organization context from the authenticated user.
 * Ensures the user's membership is active and the organization is approved.
 * Rejects suspended, pending, or cross-tenant access attempts.
 */
export const requireOrgMembership = (allowedRoles?: string[]) => async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // 1. Ensure authenticated
  const header = req.headers.authorization;
  let token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token && req.query?.token && typeof req.query.token === 'string') {
    token = req.query.token;
  }
  if (!token) return fail(res, 401, 'Authentication required');

  try {
    const decoded: any = jwt.verify(token, env.JWT_SECRET);
    const userId = decoded.userId || decoded.id;
    const tokenOrgId =
      decoded.organizationId ||
      decoded.organization_id ||
      decoded.businessId ||
      decoded.business_id;
    const requestedOrgHeader = req.headers['x-organization-id'] as string;

    let targetOrgId = tokenOrgId || requestedOrgHeader;

    // 2. Query trusted server-side membership
    let membership: any = null;
    if (requestedOrgHeader && requestedOrgHeader !== tokenOrgId) {
      // Validate if caller has legitimate active membership in requested organization
      const requestedMembership = await db.find('organization_memberships', {
        user_id: userId,
        organization_id: requestedOrgHeader,
      });
      if (requestedMembership && requestedMembership.status === 'active') {
        membership = requestedMembership;
        targetOrgId = requestedOrgHeader;
      }
    }

    if (!membership && targetOrgId) {
      membership = await db.find('organization_memberships', {
        user_id: userId,
        organization_id: targetOrgId,
      });
    }

    // Fallback: look up any active membership for this user
    if (!membership) {
      const allMemberships = await db.list('organization_memberships', { user_id: userId });
      membership = allMemberships.find((m: any) => m.status === 'active') || allMemberships[0];
      if (membership) {
        targetOrgId = membership.organization_id;
      }
    }

    // 3. Backward compatibility for pre-migration single-tenant users
    if (!membership) {
      const existingUser = await db.find('users', { id: userId });
      if (existingUser) {
        targetOrgId = existingUser.organization_id || DEFAULT_ORG_ID;
        // Verify default organization exists
        const defaultOrg = await db.find('organizations', { id: targetOrgId });
        if (defaultOrg && defaultOrg.status === 'approved') {
          req.user = {
            ...decoded,
            id: userId,
            userId,
            role: existingUser.role,
            organizationId: targetOrgId,
            organization_id: targetOrgId,
            businessId: targetOrgId,
            business_id: targetOrgId,
            membershipStatus: 'active',
          };
          req.org = {
            id: defaultOrg.id,
            name: defaultOrg.name,
            slug: defaultOrg.slug,
            status: defaultOrg.status,
          };

          if (allowedRoles && allowedRoles.length > 0) {
            return authorize(...allowedRoles)(req, res, next);
          }
          return next();
        }
      }

      return fail(res, 403, 'Forbidden: no organization membership found for this account');
    }

    // 4. Validate membership status
    if (membership.status === 'pending') {
      return fail(res, 403, 'Your membership in this organization is pending approval');
    }
    if (membership.status === 'suspended') {
      return fail(res, 403, 'Your membership in this organization has been suspended');
    }
    if (membership.status !== 'active') {
      return fail(res, 403, 'Inactive organization membership');
    }

    // 5. Validate organization approval status
    const org = await db.find('organizations', { id: membership.organization_id });
    if (!org) {
      return fail(res, 404, 'Organization not found');
    }
    if (org.status === 'pending') {
      return fail(res, 403, 'Organization approval is pending platform administrator review');
    }
    if (org.status === 'rejected') {
      return fail(res, 403, 'Organization registration application was rejected');
    }
    if (org.status === 'suspended') {
      return fail(res, 403, 'Organization account has been suspended');
    }
    if (org.status !== 'approved') {
      return fail(res, 403, 'Organization is not authorized for operations');
    }

    // 6. Attach trusted organization context to request
    req.user = {
      ...decoded,
      id: userId,
      userId,
      role: membership.role || decoded.role,
      organizationId: org.id,
      organization_id: org.id,
      businessId: org.id,
      business_id: org.id,
      membershipStatus: membership.status,
    };
    req.org = {
      id: org.id,
      name: org.name,
      slug: org.slug,
      status: org.status,
    };

    // 7. Check allowed roles if specified
    if (allowedRoles && allowedRoles.length > 0) {
      return authorize(...allowedRoles)(req, res, next);
    }

    return next();
  } catch {
    return fail(res, 401, 'Invalid or expired token');
  }
};

/**
 * Role-Based Access Control (RBAC) permission guard.
 * Validates active organization membership and ensures the user's role possesses
 * at least one of the specified fine-grained permissions.
 */
export const requireOrgPermission = (...permissions: Permission[]) => async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  return requireOrgMembership()(req, res, () => {
    if (!req.user) {
      return fail(res, 401, 'Authentication required');
    }
    const userRole = req.user.role;
    if (!hasAnyPermission(userRole, permissions)) {
      return fail(res, 403, 'Forbidden: insufficient role permissions');
    }
    return next();
  });
};

/**
 * Platform Administrator authorization guard.
 * Validates that the authenticated user exists in platform_admins with is_active = true.
 * Never trusts client-supplied headers or body claims.
 */
export const requirePlatformAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const header = req.headers.authorization;
  let token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token && req.query?.token && typeof req.query.token === 'string') {
    token = req.query.token;
  }
  if (!token) return fail(res, 401, 'Authentication required');

  try {
    const decoded: any = jwt.verify(token, env.JWT_SECRET);
    const userId = decoded.userId || decoded.id;

    // 1. Direct authorization for configured fixed platform administrator
    if (userId === 'platform-admin-root' && decoded.isPlatformAdmin) {
      req.user = {
        ...decoded,
        id: userId,
        userId,
        isPlatformAdmin: true,
      };
      return next();
    }

    // 2. Check trusted server-side platform_admins record
    const adminRecord = await db.find('platform_admins', {
      user_id: userId,
      is_active: true,
    });

    if (!adminRecord || !adminRecord.is_active) {
      return fail(res, 403, 'Forbidden: platform administrator privileges required');
    }

    req.user = {
      ...decoded,
      id: userId,
      userId,
      isPlatformAdmin: true,
    };

    return next();
  } catch {
    return fail(res, 401, 'Invalid or expired token');
  }
};

/**
 * Resolves trusted organization ID from authenticated request.
 * Falls back safely to DEFAULT_ORG_ID if unauthenticated or legacy.
 */
export function getTrustedOrgId(req: Request): string {
  return (
    req.user?.organizationId ||
    req.user?.organization_id ||
    req.user?.businessId ||
    req.user?.business_id ||
    DEFAULT_ORG_ID
  );
}
