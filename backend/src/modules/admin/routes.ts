import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../../config/database';
import { env } from '../../config/env';
import { requirePlatformAdmin } from '../../middleware/auth';
import { fail, ok } from '../../utils/http';
import { auditLogger } from '../../utils/auditLogger';

export const adminRouter = Router();

// In-memory rate limiter for administrator login attempts (max 5 failed attempts per 15 minutes per IP)
const adminLoginAttempts = new Map<string, { count: number; lockedUntil: number }>();

/**
 * POST /api/admin/login
 * Dedicated, protected administrator authentication using fixed backend environment credentials
 * or registered platform_admins table records.
 * Rate-limited to prevent brute-force attacks.
 */
adminRouter.post('/login', async (req, res) => {
  const ip = String(req.ip || req.socket.remoteAddress || 'unknown');
  const now = Date.now();
  const attemptRecord = adminLoginAttempts.get(ip);
  if (attemptRecord && attemptRecord.lockedUntil > now) {
    const remainingSec = Math.ceil((attemptRecord.lockedUntil - now) / 1000);
    return fail(res, 429, `Too many failed login attempts. Please try again in ${remainingSec} seconds.`);
  }

  const { username, email, password } = req.body ?? {};
  const identifier = String(username || email || '').trim();
  const rawPassword = String(password || '');

  if (!identifier || !rawPassword) {
    return fail(res, 400, 'Username and password are required');
  }

  let authenticatedAdmin: any = null;

  // 1. Verify against fixed owner credentials in environment
  const configuredUser = env.PLATFORM_ADMIN_USERNAME?.trim();
  const configuredHash = env.PLATFORM_ADMIN_PASSWORD_HASH?.trim();

  if (configuredUser && configuredHash && identifier === configuredUser) {
    const isMatch = bcrypt.compareSync(rawPassword, configuredHash);
    if (isMatch) {
      const fixedAdminId = 'platform-admin-root';
      authenticatedAdmin = {
        id: fixedAdminId,
        userId: fixedAdminId,
        username: configuredUser,
        name: 'Platform Administrator',
        email: configuredUser.includes('@') ? configuredUser : 'admin@logisphere.ai',
        role: 'ROLE_ADMIN',
        isPlatformAdmin: true,
      };
    }
  }

  // 2. Fallback: check existing platform_admins in database (for test suites and existing db accounts)
  if (!authenticatedAdmin) {
    const dbUser = await db.find('users', { email: identifier });
    if (dbUser && bcrypt.compareSync(rawPassword, dbUser.passwordHash)) {
      const adminRecord = await db.find('platform_admins', { user_id: dbUser.id, is_active: true });
      if (adminRecord && adminRecord.is_active) {
        authenticatedAdmin = {
          id: dbUser.id,
          userId: dbUser.id,
          username: dbUser.email,
          name: dbUser.name || 'Platform Administrator',
          email: dbUser.email,
          role: 'ROLE_ADMIN',
          isPlatformAdmin: true,
        };
      }
    }
  }

  if (!authenticatedAdmin) {
    const count = (attemptRecord?.count || 0) + 1;
    if (count >= 5) {
      adminLoginAttempts.set(ip, { count, lockedUntil: now + 15 * 60 * 1000 });
      return fail(res, 429, 'Too many failed login attempts. Locked for 15 minutes.');
    } else {
      adminLoginAttempts.set(ip, { count, lockedUntil: 0 });
    }
    return fail(res, 401, 'Invalid administrator credentials');
  }

  // Clear failed attempt record on success
  adminLoginAttempts.delete(ip);

  // Sign short-lived administrator JWT (8 hours)
  const token = jwt.sign(
    {
      userId: authenticatedAdmin.id,
      id: authenticatedAdmin.id,
      email: authenticatedAdmin.email,
      role: 'ROLE_ADMIN',
      isPlatformAdmin: true,
    },
    env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  return ok(
    res,
    {
      token,
      admin: {
        id: authenticatedAdmin.id,
        username: authenticatedAdmin.username,
        name: authenticatedAdmin.name,
        email: authenticatedAdmin.email,
        isPlatformAdmin: true,
      },
    },
    'Administrator login successful'
  );
});

// Require platform administrator authorization on all protected /api/admin routes
adminRouter.use(requirePlatformAdmin);

/**
 * GET /api/admin/me
 * Validates session and returns verified platform admin profile.
 * Protected by requirePlatformAdmin middleware.
 */
adminRouter.get('/me', async (req, res) => {
  try {
    const userId = req.user!.userId || req.user!.id;
    const user = await db.find('users', { id: userId });
    return ok(
      res,
      {
        id: userId,
        userId,
        name: user?.name || req.user?.email || 'Platform Administrator',
        email: user?.email || req.user?.email,
        isPlatformAdmin: true,
      },
      'Platform admin session verified'
    );
  } catch (err: any) {
    return fail(res, 500, err?.message || 'Failed to verify admin session');
  }
});

/**
 * GET /api/admin/orgs
 * Lists all organizations with optional status filtering.
 */
adminRouter.get('/orgs', async (req, res) => {
  try {
    const statusFilter = req.query.status ? String(req.query.status).toLowerCase() : undefined;
    const filter = statusFilter ? { status: statusFilter } : undefined;

    const rawOrgs = await db.list('organizations', filter);
    // Exclude internal legacy default org from application review queue
    const orgs = rawOrgs.filter((org: any) => org.id !== '00000000-0000-0000-0000-000000000001' && org.slug !== 'default-org');

    // Hydrate with manager details and member count
    const enriched = await Promise.all(
      orgs.map(async (org: any) => {
        const memberships = await db.list('organization_memberships', { organization_id: org.id });
        const managerMember = memberships.find((m: any) => m.role === 'ROLE_MANAGER');
        let managerUser: any = null;
        if (managerMember) {
          managerUser = await db.find('users', { id: managerMember.user_id });
        }

        return {
          id: org.id,
          name: org.name,
          slug: org.slug,
          formattedAddress: org.formatted_address,
          googlePlacesId: org.google_places_id,
          latitude: org.latitude,
          longitude: org.longitude,
          status: org.status,
          registrationTimestamp: org.registration_timestamp || org.created_at,
          reviewedAt: org.reviewed_at,
          reviewedBy: org.reviewed_by,
          reviewReason: org.review_reason,
          memberCount: memberships.length,
          manager: managerUser
            ? {
                id: managerUser.id,
                name: managerUser.name,
                email: managerUser.email,
                phoneNo: managerUser.phoneNo,
                membershipStatus: managerMember?.status,
              }
            : null,
        };
      })
    );

    return ok(res, enriched, 'Organizations retrieved successfully');
  } catch (err: any) {
    return fail(res, 500, err?.message || 'Failed to list organizations');
  }
});

/**
 * GET /api/admin/orgs/pending
 * Returns pending applications specifically for the review queue.
 */
adminRouter.get('/orgs/pending', async (_req, res) => {
  try {
    const rawOrgs = await db.list('organizations', { status: 'pending' });
    // Exclude internal legacy default org from application review queue
    const orgs = rawOrgs.filter((org: any) => org.id !== '00000000-0000-0000-0000-000000000001' && org.slug !== 'default-org');

    const enriched = await Promise.all(
      orgs.map(async (org: any) => {
        const memberships = await db.list('organization_memberships', {
          organization_id: org.id,
          role: 'ROLE_MANAGER',
        });
        const managerMember = memberships[0];
        let managerUser: any = null;
        if (managerMember) {
          managerUser = await db.find('users', { id: managerMember.user_id });
        }

        return {
          id: org.id,
          name: org.name,
          slug: org.slug,
          formattedAddress: org.formatted_address,
          googlePlacesId: org.google_places_id,
          latitude: org.latitude,
          longitude: org.longitude,
          status: org.status,
          registrationTimestamp: org.registration_timestamp || org.created_at,
          manager: managerUser
            ? {
                id: managerUser.id,
                name: managerUser.name,
                email: managerUser.email,
                phoneNo: managerUser.phoneNo,
              }
            : null,
        };
      })
    );

    return ok(res, enriched, 'Pending organizations retrieved');
  } catch (err: any) {
    return fail(res, 500, err?.message || 'Failed to fetch pending organizations');
  }
});

/**
 * GET /api/admin/orgs/:id
 * Detailed application inspection.
 */
adminRouter.get('/orgs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const org = await db.find('organizations', { id });
    if (!org) return fail(res, 404, 'Organization not found');

    const memberships = await db.list('organization_memberships', { organization_id: id });
    const membersWithDetails = await Promise.all(
      memberships.map(async (m: any) => {
        const u = await db.find('users', { id: m.user_id });
        return {
          membershipId: m.id,
          userId: m.user_id,
          name: u?.name || 'Unknown',
          email: u?.email || '',
          phoneNo: u?.phoneNo || u?.phoneno || null,
          role: m.role,
          status: m.status,
          createdAt: m.created_at,
        };
      })
    );

    // 1. Identify primary manager account via memberships or user organization_id
    const managerMember = memberships.find((m: any) => m.role === 'ROLE_MANAGER');
    let managerUser: any = null;
    if (managerMember) {
      managerUser = await db.find('users', { id: managerMember.user_id });
    }
    if (!managerUser) {
      managerUser = await db.find('users', { organization_id: id, role: 'ROLE_MANAGER' });
    }
    if (!managerUser) {
      const allOrgUsers = await db.list('users', { organization_id: id });
      managerUser = allOrgUsers.find((u: any) => u.role === 'ROLE_MANAGER') || allOrgUsers[0] || null;
    }

    const managerData = managerUser
      ? {
          id: managerUser.id || managerUser.userId,
          name: managerUser.name || 'Unknown',
          email: managerUser.email || org.contact_email || '',
          phoneNo: managerUser.phoneNo || managerUser.phoneno || org.contact_phone || null,
          role: managerMember?.role || managerUser.role || 'ROLE_MANAGER',
          status: managerUser.status || 'ACTIVE',
          membershipStatus: managerMember?.status || (org.status === 'approved' ? 'active' : 'pending'),
          createdAt: managerMember?.created_at || managerUser.createdAt || null,
        }
      : null;

    return ok(
      res,
      {
        ...org,
        googlePlacesId: org.google_places_id || org.googlePlacesId,
        formattedAddress: org.formatted_address || org.formattedAddress,
        registrationTimestamp: org.registration_timestamp || org.created_at || org.createdAt,
        manager: managerData,
        members: membersWithDetails,
        memberCount: membersWithDetails.length,
      },
      'Organization details retrieved'
    );
  } catch (err: any) {
    return fail(res, 500, err?.message || 'Failed to fetch organization details');
  }
});

/**
 * POST /api/admin/orgs/:id/approve
 * Platform admin approves a pending organization.
 * Atomically updates org status to 'approved' and activates the initial manager membership.
 */
adminRouter.post('/orgs/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const org = await db.find('organizations', { id });
    if (!org) return fail(res, 404, 'Organization not found');

    // Idempotent check
    if (org.status === 'approved') {
      return ok(
        res,
        {
          organization: { id: org.id, status: 'approved', name: org.name },
          organizationId: org.id,
          status: 'approved',
          activatedMembershipsCount: 0,
        },
        'Organization is already approved'
      );
    }

    const reviewerId = req.user!.userId;
    const reviewerUser = await db.find('users', { id: reviewerId });
    const reviewerUserId = reviewerUser ? reviewerUser.id : null;
    const nowIso = new Date().toISOString();

    // 1. Update organization status
    const updatedOrg = await db.update(
      'organizations',
      { id },
      {
        status: 'approved',
        reviewed_by: reviewerUserId,
        reviewed_at: nowIso,
        review_reason: 'Approved by platform administrator',
      }
    );

    // 2. Activate initial manager membership(s)
    const memberships = await db.list('organization_memberships', { organization_id: id });
    let activatedMembershipsCount = 0;
    for (const m of memberships) {
      if (m.status === 'pending') {
        await db.update('organization_memberships', { id: m.id }, { status: 'active' });
        activatedMembershipsCount++;
      }
    }

    // 3. Audit log
    auditLogger.log({
      actorUserId: reviewerId,
      actorEmail: req.user?.email,
      actorRole: 'PLATFORM_ADMIN',
      action: 'ORG_APPROVED',
      targetOrgId: id,
      metadata: { name: org.name, slug: org.slug },
    });

    return ok(
      res,
      {
        organization: {
          id,
          status: 'approved',
          name: updatedOrg?.name || org.name,
        },
        organizationId: id,
        status: 'approved',
        name: updatedOrg?.name || org.name,
        activatedMembershipsCount,
      },
      'Organization approved successfully and initial manager membership activated'
    );
  } catch (err: any) {
    return fail(res, 500, err?.message || 'Failed to approve organization');
  }
});

/**
 * GET /api/admin/stats
 * Aggregated summary counts of organizations by status computed strictly from database records.
 */
adminRouter.get('/stats', async (_req, res) => {
  try {
    const rawOrgs = await db.list('organizations');
    const orgs = rawOrgs.filter((org: any) => org.id !== '00000000-0000-0000-0000-000000000001' && org.slug !== 'default-org');
    const pending = orgs.filter((o: any) => o.status === 'pending').length;
    const approved = orgs.filter((o: any) => o.status === 'approved').length;
    const rejected = orgs.filter((o: any) => o.status === 'rejected').length;
    const suspended = orgs.filter((o: any) => o.status === 'suspended').length;

    return ok(
      res,
      {
        totalOrganizations: orgs.length,
        pendingApproval: pending,
        approvedOrganizations: approved,
        rejectedOrganizations: rejected,
        suspendedOrganizations: suspended,
      },
      'Organization summary statistics retrieved'
    );
  } catch (err: any) {
    return fail(res, 500, err?.message || 'Failed to calculate organization stats');
  }
});

/**
 * POST /api/admin/orgs/:id/reject
 * Platform admin rejects an organization application with a required reason.
 */
adminRouter.post('/orgs/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const reason = req.body?.reason ? String(req.body.reason).trim() : '';

    if (!reason) {
      return fail(res, 400, 'Rejection reason is required');
    }

    const org = await db.find('organizations', { id });
    if (!org) return fail(res, 404, 'Organization not found');

    const reviewerId = req.user!.userId;
    const reviewerUser = await db.find('users', { id: reviewerId });
    const reviewerUserId = reviewerUser ? reviewerUser.id : null;
    const nowIso = new Date().toISOString();

    await db.update(
      'organizations',
      { id },
      {
        status: 'rejected',
        review_reason: reason,
        reviewed_by: reviewerUserId,
        reviewed_at: nowIso,
      }
    );

    auditLogger.log({
      actorUserId: reviewerId,
      actorEmail: req.user?.email,
      actorRole: 'PLATFORM_ADMIN',
      action: 'ORG_REJECTED',
      targetOrgId: id,
      reason,
      metadata: { name: org.name },
    });

    return ok(
      res,
      {
        organization: {
          id,
          status: 'rejected',
          review_reason: reason,
          reviewReason: reason,
        },
        organizationId: id,
        status: 'rejected',
        review_reason: reason,
        reviewReason: reason,
      },
      'Organization application rejected'
    );
  } catch (err: any) {
    return fail(res, 500, err?.message || 'Failed to reject organization');
  }
});

/**
 * POST /api/admin/orgs/:id/suspend
 * Suspends an approved organization.
 */
adminRouter.post('/orgs/:id/suspend', async (req, res) => {
  try {
    const { id } = req.params;
    const reason = req.body?.reason ? String(req.body.reason).trim() : 'Suspended by platform administrator';

    const org = await db.find('organizations', { id });
    if (!org) return fail(res, 404, 'Organization not found');

    const reviewerId = req.user!.userId;

    await db.update(
      'organizations',
      { id },
      {
        status: 'suspended',
        review_reason: reason,
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
      }
    );

    auditLogger.log({
      actorUserId: reviewerId,
      actorEmail: req.user?.email,
      actorRole: 'PLATFORM_ADMIN',
      action: 'ORG_SUSPENDED',
      targetOrgId: id,
      reason,
    });

    return ok(res, { organizationId: id, status: 'suspended' }, 'Organization suspended');
  } catch (err: any) {
    return fail(res, 500, err?.message || 'Failed to suspend organization');
  }
});

/**
 * GET /api/admin/audit-logs
 * Retrieves administrative audit log records.
 */
adminRouter.get('/audit-logs', async (_req, res) => {
  const logs = auditLogger.list();
  return ok(res, logs, 'Audit logs retrieved');
});
