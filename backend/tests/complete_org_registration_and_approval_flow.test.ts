import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { db } from '../src/config/database';

describe('Complete Organization Registration & Admin Approval End-to-End Flow', () => {
  const uniqueSuffix = Date.now();
  const testOrgData = {
    organizationName: `Apex Global Logistics ${uniqueSuffix}`,
    slug: `apex-global-${uniqueSuffix}`,
    formattedAddress: 'Kalapi Nagar, Ahmedabad, Gujarat 380016, India',
    googlePlacesId: 'ChIJI-Rd9B2EXjkRdHe8UkIlUrk',
    latitude: 23.05129,
    longitude: 72.61881,
    managerName: 'Vikram Malhotra',
    managerEmail: `vikram.manager.${uniqueSuffix}@apexlogistics.io`,
    managerPassword: 'StrongManagerPass2026!',
    managerPhone: '+91 98765 43210',
    contactEmail: `contact.${uniqueSuffix}@apexlogistics.io`,
    contactPhone: '+91 98765 00000',
  };

  let registeredOrgId: string;
  let adminToken: string;

  // UUID regex validating 8-4-4-4-12 hex format without prefixes
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  it('Step 1: Register new organization with complete details', async () => {
    const res = await request(app)
      .post('/api/org/register')
      .send(testOrgData);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.organization.name).toBe(testOrgData.organizationName);
    expect(res.body.data.organization.status).toBe('pending');
    expect(res.body.data.membership.status).toBe('pending');
    expect(res.body.data.membership.role).toBe('ROLE_MANAGER');

    registeredOrgId = res.body.data.organization.id;
    const membershipId = res.body.data.membership.id;

    // Verify valid standard UUIDs without invalid prefixes (prevents PostgreSQL UUID syntax errors)
    expect(registeredOrgId).toMatch(uuidRegex);
    expect(membershipId).toMatch(uuidRegex);
    expect(registeredOrgId).not.toContain('org-');
    expect(membershipId).not.toContain('mem-');
  });

  it('Step 2: Platform administrator logs in using configured fixed credentials', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({
        username: 'admin',
        password: 'Admin@LogiSphere2026!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.admin.isPlatformAdmin).toBe(true);

    adminToken = res.body.data.token;
  });

  it('Step 3: Admin verifies pending queue and stats include the new organization', async () => {
    // 3a. Stats
    const statsRes = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(statsRes.status).toBe(200);
    expect(statsRes.body.data.pendingApproval).toBeGreaterThanOrEqual(1);

    // 3b. Pending list
    const pendingRes = await request(app)
      .get('/api/admin/orgs/pending')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(pendingRes.status).toBe(200);
    const found = pendingRes.body.data.find((o: any) => o.id === registeredOrgId);
    expect(found).toBeDefined();
    expect(found.name).toBe(testOrgData.organizationName);
    expect(found.formattedAddress).toBe(testOrgData.formattedAddress);
    expect(found.status).toBe('pending');
  });

  it('Step 4: Admin views detailed application profile', async () => {
    const detailsRes = await request(app)
      .get(`/api/admin/orgs/${registeredOrgId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(detailsRes.status).toBe(200);
    expect(detailsRes.body.data.id).toBe(registeredOrgId);
    expect(detailsRes.body.data.googlePlacesId).toBe(testOrgData.googlePlacesId);
    expect(detailsRes.body.data.latitude).toBeCloseTo(testOrgData.latitude, 4);
    expect(detailsRes.body.data.longitude).toBeCloseTo(testOrgData.longitude, 4);
    expect(detailsRes.body.data.manager).toBeDefined();
    expect(detailsRes.body.data.manager.name).toBe(testOrgData.managerName);
    expect(detailsRes.body.data.manager.email).toBe(testOrgData.managerEmail);
    expect(detailsRes.body.data.manager.role).toBe('ROLE_MANAGER');
    expect(detailsRes.body.data.members).toBeDefined();
    expect(detailsRes.body.data.members.length).toBeGreaterThanOrEqual(1);
  });

  it('Step 5: Admin approves the organization request', async () => {
    const approveRes = await request(app)
      .post(`/api/admin/orgs/${registeredOrgId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.success).toBe(true);
    expect(approveRes.body.data.status).toBe('approved');
    expect(approveRes.body.data.activatedMembershipsCount).toBeGreaterThanOrEqual(1);
  });

  it('Step 6: Verifies organization is approved and removed from pending queue', async () => {
    // Verify pending list no longer includes it
    const pendingRes = await request(app)
      .get('/api/admin/orgs/pending')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(pendingRes.status).toBe(200);
    const inPending = pendingRes.body.data.some((o: any) => o.id === registeredOrgId);
    expect(inPending).toBe(false);

    // Verify organization status in database
    const orgInDb = await db.find('organizations', { id: registeredOrgId });
    expect(orgInDb).toBeDefined();
    expect(orgInDb.status).toBe('approved');
    expect(orgInDb.reviewed_by).toBeDefined();

    // Verify manager membership is now active
    const membership = await db.find('organization_memberships', {
      organization_id: registeredOrgId,
    });
    expect(membership).toBeDefined();
    expect(membership.status).toBe('active');
  });
});
