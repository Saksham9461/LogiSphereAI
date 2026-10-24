import { Router } from 'express';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../../config/database';
import { authenticate } from '../../middleware/auth';
import { fail, ok } from '../../utils/http';
import { auditLogger } from '../../utils/auditLogger';

export const organizationRouter = Router();

// Validation schema for organization registration
const registerOrgSchema = z
  .object({
    name: z.string().trim().min(2, 'Organization name must be at least 2 characters').max(100).optional(),
    organizationName: z.string().trim().min(2, 'Organization name must be at least 2 characters').max(100).optional(),
    slug: z
      .string()
      .trim()
      .min(2)
      .max(50)
      .regex(/^[a-z0-9-]+$/i, 'Slug must contain only alphanumeric characters and hyphens')
      .optional(),
    formattedAddress: z.string().trim().optional(),
    address: z.string().trim().optional(),
    googlePlacesId: z.string().trim().optional(),
    placeId: z.string().trim().optional(),
    latitude: z
      .number()
      .min(-90, 'Latitude must be between -90 and 90')
      .max(90, 'Latitude must be between -90 and 90')
      .refine(val => isFinite(val), 'Latitude must be a finite number')
      .optional(),
    longitude: z
      .number()
      .min(-180, 'Longitude must be between -180 and 180')
      .max(180, 'Longitude must be between -180 and 180')
      .refine(val => isFinite(val), 'Longitude must be a finite number')
      .optional(),
    geofenceRadius: z
      .number()
      .int()
      .min(50, 'Geofence radius must be at least 50 meters')
      .max(5000, 'Geofence radius cannot exceed 5000 meters')
      .optional(),
    managerName: z.string().trim().min(2, 'Manager name must be at least 2 characters'),
    managerEmail: z.string().trim().email('Valid manager email is required'),
    managerPassword: z.string().min(8, 'Password must be at least 8 characters long').optional(),
    password: z.string().min(8, 'Password must be at least 8 characters long').optional(),
    managerPhone: z.string().trim().optional(),
    contactEmail: z.string().trim().email().optional(),
    contactPhone: z.string().trim().optional(),
  })
  .refine(data => Boolean(data.name || data.organizationName), {
    message: 'Organization name is required and must be at least 2 characters',
    path: ['name'],
  })
  .refine(data => Boolean(data.managerPassword || data.password), {
    message: 'Password must be at least 8 characters long',
    path: ['managerPassword'],
  })
  .refine(data => (data.latitude === undefined && data.longitude === undefined) || (data.latitude !== undefined && data.longitude !== undefined), {
    message: 'Both latitude and longitude must be provided together',
    path: ['latitude'],
  })
  .refine(data => !(data.latitude === 0 && data.longitude === 0), {
    message: 'Coordinates cannot be (0, 0)',
    path: ['latitude'],
  });

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * POST /api/org/register
 * Public registration endpoint for company onboarding via Web Portal.
 * Creates an organization in 'pending' status and links the initial manager as a 'pending' member.
 * Public registration NEVER creates an approved organization or active manager.
 */
organizationRouter.post('/register', async (req, res) => {
  try {
    const parseResult = registerOrgSchema.safeParse(req.body);
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0]?.message || 'Invalid input data';
      return fail(res, 400, firstError);
    }

    const {
      name,
      organizationName,
      formattedAddress,
      address,
      googlePlacesId,
      placeId,
      latitude,
      longitude,
      geofenceRadius,
      managerName,
      managerEmail,
      managerPassword,
      password,
      managerPhone,
      contactEmail,
      contactPhone,
    } = parseResult.data;

    const effectiveName = (name || organizationName || 'Organization').trim();
    const effectivePassword = managerPassword || password || '';

    // 1. Generate & verify slug
    let baseSlug = parseResult.data.slug ? slugify(parseResult.data.slug) : slugify(effectiveName);
    if (!baseSlug) baseSlug = 'org';

    let targetSlug = baseSlug;
    const existingOrgBySlug = await db.find('organizations', { slug: targetSlug });
    if (existingOrgBySlug) {
      targetSlug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
    }

    // 2. Check if manager user already exists
    let existingUser = await db.find('users', { email: managerEmail });
    if (existingUser) {
      return fail(
        res,
        409,
        'An account with this email is already registered. Please use a different email or log in.'
      );
    }

    const orgId = randomUUID();
    const addressToUse = formattedAddress || address || null;
    const placeIdToUse = googlePlacesId || placeId || null;

    // 3. Create Organization in STRICTLY 'pending' status
    const newOrg = await db.insert('organizations', {
      id: orgId,
      name: effectiveName,
      slug: targetSlug,
      formatted_address: addressToUse,
      google_places_id: placeIdToUse,
      latitude: latitude !== undefined ? latitude : null,
      longitude: longitude !== undefined ? longitude : null,
      geofence_radius: geofenceRadius || 500,
      status: 'pending', // Public registration is ALWAYS pending
      registration_timestamp: new Date().toISOString(),
      contact_email: contactEmail || managerEmail,
      contact_phone: contactPhone || managerPhone || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    let managerUserId: string;
    let membershipId: string = randomUUID();

    // 4. Create user account
    try {
      managerUserId = db.makeId('usr-');
      existingUser = await db.insert('users', {
        id: managerUserId,
        name: managerName,
        email: managerEmail,
        phoneNo: managerPhone || null,
        role: 'ROLE_MANAGER',
        passwordHash: bcrypt.hashSync(effectivePassword, 10),
        status: 'ACTIVE',
        organization_id: orgId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // 5. Create membership in 'pending' status
      await db.insert('organization_memberships', {
        id: membershipId,
        organization_id: orgId,
        user_id: managerUserId,
        role: 'ROLE_MANAGER',
        status: 'pending', // Inactive until platform administrator approves organization
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } catch (membershipError) {
      // Rollback organization creation on partial failure
      console.error('[Org Registration] Error creating manager membership, rolling back organization:', membershipError);
      await db.remove('organizations', { id: orgId });
      throw membershipError;
    }

    // 6. Audit Log
    auditLogger.log({
      actorUserId: managerUserId,
      actorEmail: managerEmail,
      actorRole: 'APPLICANT',
      action: 'ORG_REGISTERED',
      targetOrgId: orgId,
      metadata: { name: effectiveName, slug: targetSlug, address: addressToUse },
    });

    return res.status(201).json({
      success: true,
      message: 'Organization registration submitted successfully and is awaiting platform administrator review',
      data: {
        organization: {
          id: newOrg.id,
          name: newOrg.name,
          slug: newOrg.slug,
          status: 'pending',
          registrationTimestamp: newOrg.registration_timestamp,
        },
        membership: {
          id: membershipId,
          status: 'pending',
          role: 'ROLE_MANAGER',
        },
        organizationId: newOrg.id,
        name: newOrg.name,
        slug: newOrg.slug,
        status: 'pending',
        managerEmail: existingUser.email,
        registrationTimestamp: newOrg.registration_timestamp,
      },
    });
  } catch (err: any) {
    console.error('[Org Registration Exception]:', err);
    return fail(res, 500, err?.message || 'Failed to register organization');
  }
});

/**
 * GET /api/org/status/:slugOrId
 * Public endpoint to check organization application status.
 */
organizationRouter.get('/status/:slugOrId', async (req, res) => {
  const { slugOrId } = req.params;
  if (!slugOrId) return fail(res, 400, 'Organization slug or ID is required');

  const org =
    (await db.find('organizations', { slug: slugOrId })) ||
    (await db.find('organizations', { id: slugOrId }));

  if (!org) return fail(res, 404, 'Organization not found');

  return res.json({
    success: true,
    data: {
      organizationId: org.id,
      name: org.name,
      slug: org.slug,
      status: org.status,
      registrationTimestamp: org.registration_timestamp || org.created_at,
      reviewReason: org.status === 'rejected' ? org.review_reason : undefined,
    },
  });
});

/**
 * GET /api/org/my-organizations
 * Returns list of organizations that the authenticated user belongs to.
 */
organizationRouter.get('/my-organizations', authenticate, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const memberships = await db.list('organization_memberships', { user_id: userId });

    const orgIds = memberships.map((m: any) => m.organization_id);
    const orgs = await Promise.all(orgIds.map((id: string) => db.find('organizations', { id })));

    const result = memberships.map((m: any) => {
      const org = orgs.find((o: any) => o && o.id === m.organization_id);
      return {
        membershipId: m.id,
        organizationId: m.organization_id,
        name: org?.name || 'Unknown Organization',
        slug: org?.slug || '',
        orgStatus: org?.status || 'pending',
        role: m.role,
        membershipStatus: m.status,
      };
    });

    if (memberships.length === 0) {
      const u = await db.find('users', { id: userId });
      if (u?.organization_id) {
        const org = await db.find('organizations', { id: u.organization_id });
        if (org) {
          return ok(res, [{
            membershipId: 'direct',
            organizationId: org.id,
            name: org.name,
            slug: org.slug,
            orgStatus: org.status,
            role: u.role,
            membershipStatus: 'active',
          }], 'User organizations retrieved');
        }
      }
    }

    return ok(res, result, 'User organizations retrieved');
  } catch (err: any) {
    return fail(res, 500, err?.message || 'Failed to retrieve organizations');
  }
});
