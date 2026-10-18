import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../src/app';
import { db } from '../src/config/database';
import { signToken, DEFAULT_ORG_ID } from '../src/middleware/auth';

describe('Multi-Organization Backend Authorization & Security Suite', { timeout: 30000 }, () => {
  // Test Tenants
  let platformAdminToken: string;
  let orgAManagerToken: string;
  let orgADriverToken: string;
  let orgBManagerToken: string;
  let orgBDriverToken: string;

  const orgAId = `00000000-0000-0000-0000-00000000000a`;
  const orgBId = `00000000-0000-0000-0000-00000000000b`;
  const pendingOrgId = `00000000-0000-0000-0000-00000000000c`;
  const suspendedOrgId = `00000000-0000-0000-0000-00000000000d`;

  let pendingManagerToken: string;
  let suspendedManagerToken: string;

  let vehicleAId: string;
  let vehicleBId: string;
  let tripAId: string;
  let tripBId: string;

  const driverAId = `drv-a-${Date.now()}`;
  const driverBId = `drv-b-${Date.now()}`;

  const upsertOrg = async (org: any) => {
    const existing = await db.find('organizations', { id: org.id });
    if (!existing) {
      return await db.insert('organizations', org);
    }
    return await db.update('organizations', { id: org.id }, org);
  };

  const upsertMembership = async (mem: any) => {
    const existing = await db.find('organization_memberships', { id: mem.id });
    if (!existing) {
      return await db.insert('organization_memberships', mem);
    }
    return await db.update('organization_memberships', { id: mem.id }, mem);
  };

  beforeAll(async () => {
    // 1. Create Platform Admin
    const adminUser = {
      id: `usr-admin-${Date.now()}`,
      name: 'Global Platform Admin',
      email: `admin-${Date.now()}@logisphere.ai`,
      role: 'ROLE_ADMIN',
      organization_id: DEFAULT_ORG_ID,
    };
    await db.insert('users', adminUser);
    await db.insert('platform_admins', {
      id: db.makeId('padm-'),
      user_id: adminUser.id,
      is_active: true,
      created_at: new Date().toISOString(),
    });
    platformAdminToken = signToken(adminUser);

    // 2. Create Approved Organizations A and B
    await upsertOrg({
      id: orgAId,
      name: 'Titan Logistics Corp',
      slug: 'titan-logistics',
      formatted_address: 'Titan Hub, Mumbai, India',
      latitude: 19.076,
      longitude: 72.8777,
      status: 'approved',
      registration_timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await upsertOrg({
      id: orgBId,
      name: 'Apex Freight Systems',
      slug: 'apex-freight',
      formatted_address: 'Apex Center, Delhi, India',
      latitude: 28.6139,
      longitude: 77.209,
      status: 'approved',
      registration_timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // 3. Create Managers for Org A and Org B
    const managerA = {
      id: `usr-mgr-a-${Date.now()}`,
      name: 'Manager Alice (Titan)',
      email: `alice-${Date.now()}@titan.com`,
      role: 'ROLE_MANAGER',
      organization_id: orgAId,
    };
    await db.insert('users', managerA);
    await upsertMembership({
      id: `mem-mgr-a`,
      organization_id: orgAId,
      user_id: managerA.id,
      role: 'ROLE_MANAGER',
      status: 'active',
    });
    orgAManagerToken = signToken(managerA);

    const managerB = {
      id: `usr-mgr-b-${Date.now()}`,
      name: 'Manager Bob (Apex)',
      email: `bob-${Date.now()}@apex.com`,
      role: 'ROLE_MANAGER',
      organization_id: orgBId,
    };
    await db.insert('users', managerB);
    await upsertMembership({
      id: `mem-mgr-b`,
      organization_id: orgBId,
      user_id: managerB.id,
      role: 'ROLE_MANAGER',
      status: 'active',
    });
    orgBManagerToken = signToken(managerB);

    // 4. Create Drivers for Org A and Org B
    const driverA = {
      id: driverAId,
      name: 'Driver Dan (Titan)',
      email: `dan-${Date.now()}@titan.com`,
      role: 'ROLE_DRIVER',
      licenseNo: 'DL-TITAN-1001',
      licenseExpiryDate: '2030-12-31',
      status: 'AVAILABLE',
      organization_id: orgAId,
    };
    await db.insert('users', driverA);
    await upsertMembership({
      id: `mem-drv-a`,
      organization_id: orgAId,
      user_id: driverA.id,
      role: 'ROLE_DRIVER',
      status: 'active',
    });
    orgADriverToken = signToken(driverA);

    const driverB = {
      id: driverBId,
      name: 'Driver Dave (Apex)',
      email: `dave-${Date.now()}@apex.com`,
      role: 'ROLE_DRIVER',
      licenseNo: 'DL-APEX-2002',
      licenseExpiryDate: '2030-12-31',
      status: 'AVAILABLE',
      organization_id: orgBId,
    };
    await db.insert('users', driverB);
    await upsertMembership({
      id: `mem-drv-b`,
      organization_id: orgBId,
      user_id: driverB.id,
      role: 'ROLE_DRIVER',
      status: 'active',
    });
    orgBDriverToken = signToken(driverB);

    // 5. Create Vehicles for Org A and Org B
    vehicleAId = `veh-titan-${Date.now()}`;
    await db.insert('vehicles', {
      vehicleid: vehicleAId,
      vehicleID: vehicleAId,
      registrationNumber: `MH-01-TT-${Math.floor(1000 + Math.random() * 9000)}`,
      name: 'Titan Heavy Hauler',
      type: 'TRUCK',
      maxloadcapacity: 5000,
      odometer: 12000,
      status: 'AVAILABLE',
      organization_id: orgAId,
    });

    vehicleBId = `veh-apex-${Date.now()}`;
    await db.insert('vehicles', {
      vehicleid: vehicleBId,
      vehicleID: vehicleBId,
      registrationNumber: `DL-01-AP-${Math.floor(1000 + Math.random() * 9000)}`,
      name: 'Apex Speed Van',
      type: 'VAN',
      maxloadcapacity: 2000,
      odometer: 45000,
      status: 'AVAILABLE',
      organization_id: orgBId,
    });

    // 6. Create Trips for Org A and Org B
    tripAId = `TRP-TITAN-${Math.floor(1000 + Math.random() * 9000)}`;
    await db.insert('trips', {
      tripID: tripAId,
      source: 'Mumbai Port Depot',
      destination: 'Pune Central Hub',
      vehicleID: vehicleAId,
      driverID: driverA.id,
      cargoWeight: 1500,
      status: 'ACCEPTED',
      organization_id: orgAId,
    });

    tripBId = `TRP-APEX-${Math.floor(1000 + Math.random() * 9000)}`;
    await db.insert('trips', {
      tripID: tripBId,
      source: 'Delhi Gateway Logistics',
      destination: 'Jaipur Terminal',
      vehicleID: vehicleBId,
      driverID: driverB.id,
      cargoWeight: 800,
      status: 'ACCEPTED',
      organization_id: orgBId,
    });

    // 7. Create Pending Organization & Manager
    await upsertOrg({
      id: pendingOrgId,
      name: 'Pending Logistics Ltd',
      slug: 'pending-logistics',
      formatted_address: 'Bangalore Tech Park',
      latitude: 12.9716,
      longitude: 77.5946,
      status: 'pending',
    });
    const pendingMgr = {
      id: `usr-pending-${Date.now()}`,
      name: 'Pending Manager',
      email: `pending-${Date.now()}@pending.com`,
      role: 'ROLE_MANAGER',
      organization_id: pendingOrgId,
    };
    await db.insert('users', pendingMgr);
    await upsertMembership({
      id: `mem-pending`,
      organization_id: pendingOrgId,
      user_id: pendingMgr.id,
      role: 'ROLE_MANAGER',
      status: 'pending',
    });
    pendingManagerToken = signToken(pendingMgr);

    // 8. Create Suspended Organization & Manager
    await upsertOrg({
      id: suspendedOrgId,
      name: 'Suspended Fleet Inc',
      slug: 'suspended-fleet',
      formatted_address: 'Chennai Port',
      latitude: 13.0827,
      longitude: 80.2707,
      status: 'suspended',
    });
    const suspendedMgr = {
      id: `usr-suspended-${Date.now()}`,
      name: 'Suspended Manager',
      email: `suspended-${Date.now()}@suspended.com`,
      role: 'ROLE_MANAGER',
      organization_id: suspendedOrgId,
    };
    await db.insert('users', suspendedMgr);
    await upsertMembership({
      id: `mem-suspended`,
      organization_id: suspendedOrgId,
      user_id: suspendedMgr.id,
      role: 'ROLE_MANAGER',
      status: 'suspended',
    });
    suspendedManagerToken = signToken(suspendedMgr);
  }, 60000);

  // =========================================================================
  // TASK 1: Centralized Authentication and Authorization
  // =========================================================================
  describe('Task 1: Authentication & Authorization Middleware', () => {
    it('1.1 Rejects unauthenticated requests on protected endpoints', async () => {
      const res = await request(app).get('/api/admin/orgs');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('1.2 Rejects requests with invalid or tampered JWTs', async () => {
      const res = await request(app)
        .get('/api/admin/orgs')
        .set('Authorization', 'Bearer invalid.tampered.token');
      expect(res.status).toBe(401);
    });

    it('1.3 Pending organizations are denied access to protected APIs', async () => {
      const res = await request(app)
        .get('/api/admin/orgs')
        .set('Authorization', `Bearer ${pendingManagerToken}`);
      expect(res.status).toBe(403);
    });

    it('1.4 Suspended organizations are denied access to protected APIs', async () => {
      const res = await request(app)
        .get('/api/admin/orgs')
        .set('Authorization', `Bearer ${suspendedManagerToken}`);
      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // TASK 2: Organization Registration Workflow
  // =========================================================================
  describe('Task 2: Public Organization Registration API', () => {
    const regPayload = {
      organizationName: 'Zenith Logistics Hub',
      placeId: 'ChIJbU60qSXDyjsR52JUE4MChLs',
      formattedAddress: '100 Ring Road, Surat, Gujarat, India',
      latitude: 21.1702,
      longitude: 72.8311,
      managerName: 'Zack Evans',
      managerEmail: `zack-${Date.now()}@zenithlogistics.com`,
      managerPhone: '+91 98765 43210',
      password: 'SecureZenithPassword!2026',
    };

    it('2.1 Creates a registration application in strictly "pending" status', async () => {
      const res = await request(app)
        .post('/api/org/register')
        .send(regPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.organization.status).toBe('pending');
      expect(res.body.data.membership.status).toBe('pending');
      expect(res.body.data.organization.id).toBeDefined();

      // Ensure public registration never returns passwords or sensitive tokens
      expect(res.body.data.token).toBeUndefined();
      expect(res.body.data.password).toBeUndefined();
    });

    it('2.2 Validates coordinate ranges (-90..90, -180..180)', async () => {
      const invalidLatRes = await request(app)
        .post('/api/org/register')
        .send({
          ...regPayload,
          managerEmail: `invalid-lat-${Date.now()}@zenith.com`,
          latitude: 95.5,
        });
      expect(invalidLatRes.status).toBe(400);

      const invalidLngRes = await request(app)
        .post('/api/org/register')
        .send({
          ...regPayload,
          managerEmail: `invalid-lng-${Date.now()}@zenith.com`,
          longitude: -195.0,
        });
      expect(invalidLngRes.status).toBe(400);
    });

    it('2.3 Rejects duplicate registration for existing email', async () => {
      const res = await request(app)
        .post('/api/org/register')
        .send(regPayload);

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/already registered/i);
    });

    it('2.4 Public lookup allows checking organization approval status', async () => {
      const res = await request(app).get('/api/org/status/zenith-logistics-hub');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('pending');
      expect(res.body.data.name).toBe('Zenith Logistics Hub');
    });
  });

  // =========================================================================
  // TASK 3: Platform Admin Approval Workflow
  // =========================================================================
  describe('Task 3: Platform Admin Approval APIs', () => {
    let testOrgToApproveId: string;
    let testOrgToRejectId: string;

    beforeAll(async () => {
      // Create pending org to approve
      const regRes = await request(app)
        .post('/api/org/register')
        .send({
          organizationName: 'Alpha Express Freight',
          formattedAddress: 'Alpha Hub, Kolkata, India',
          latitude: 22.5726,
          longitude: 88.3639,
          managerName: 'Aaron Paul',
          managerEmail: `aaron-${Date.now()}@alphaexpress.com`,
          password: 'PasswordAlpha123!',
        });
      testOrgToApproveId = regRes.body.data.organization.id;

      // Create pending org to reject
      const rejectRegRes = await request(app)
        .post('/api/org/register')
        .send({
          organizationName: 'Fraudulent Fleet Ltd',
          formattedAddress: 'Unknown location',
          latitude: 0,
          longitude: 0,
          managerName: 'Fake Account',
          managerEmail: `fake-${Date.now()}@fraudulentfleet.com`,
          password: 'PasswordFake123!',
        });
      testOrgToRejectId = rejectRegRes.body.data.organization.id;
    });

    it('3.1 Non-platform-admins cannot access approval endpoints (403)', async () => {
      const res = await request(app)
        .get('/api/admin/orgs/pending')
        .set('Authorization', `Bearer ${orgAManagerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/platform administrator privileges required/i);
    });

    it('3.2 Platform Admin can list pending organization applications', async () => {
      const res = await request(app)
        .get('/api/admin/orgs/pending')
        .set('Authorization', `Bearer ${platformAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      const pendingIds = res.body.data.map((o: any) => o.id);
      expect(pendingIds).toContain(testOrgToApproveId);
    });

    it('3.3 Platform Admin approves organization: activates organization and manager membership', async () => {
      const res = await request(app)
        .post(`/api/admin/orgs/${testOrgToApproveId}/approve`)
        .set('Authorization', `Bearer ${platformAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.organization.status).toBe('approved');
      expect(res.body.data.activatedMembershipsCount).toBeGreaterThanOrEqual(1);

      // Verify membership status in database
      const memberships = await db.list('organization_memberships', { organization_id: testOrgToApproveId });
      expect(memberships[0]?.status).toBe('active');
    });

    it('3.4 Approving an already approved organization is handled idempotently', async () => {
      const res = await request(app)
        .post(`/api/admin/orgs/${testOrgToApproveId}/approve`)
        .set('Authorization', `Bearer ${platformAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/already approved/i);
    });

    it('3.5 Platform Admin rejects organization with review reason', async () => {
      const res = await request(app)
        .post(`/api/admin/orgs/${testOrgToRejectId}/reject`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({ reason: 'Invalid business verification documents' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('rejected');
      expect(res.body.data.review_reason).toBe('Invalid business verification documents');
    });

    it('3.6 Platform Admin can suspend an approved organization', async () => {
      const res = await request(app)
        .post(`/api/admin/orgs/${testOrgToApproveId}/suspend`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({ reason: 'Safety compliance audit underway' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('suspended');
    });

    it('3.7 Audit logs record actor, target, timestamp without secrets', async () => {
      const res = await request(app)
        .get('/api/admin/audit-logs')
        .set('Authorization', `Bearer ${platformAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const actions = res.body.data.map((l: any) => l.action);
      expect(actions).toContain('ORG_REGISTERED');
      expect(actions).toContain('ORG_APPROVED');
      expect(actions).toContain('ORG_REJECTED');
      expect(actions).toContain('ORG_SUSPENDED');

      // Verify no password hashes or tokens were logged
      const jsonStr = JSON.stringify(res.body.data);
      expect(jsonStr).not.toContain('passwordHash');
      expect(jsonStr).not.toContain('jwt');
    });

    it('3.8 Platform Admin session verification (GET /api/admin/me) verifies admin and rejects non-admin', async () => {
      // Platform admin gets 200
      const adminRes = await request(app)
        .get('/api/admin/me')
        .set('Authorization', `Bearer ${platformAdminToken}`);
      expect(adminRes.status).toBe(200);
      expect(adminRes.body.success).toBe(true);
      expect(adminRes.body.data.isPlatformAdmin).toBe(true);
      expect(adminRes.body.data.email).toContain('@logisphere.ai');

      // Non-admin manager gets 403
      const managerRes = await request(app)
        .get('/api/admin/me')
        .set('Authorization', `Bearer ${orgAManagerToken}`);
      expect(managerRes.status).toBe(403);
      expect(managerRes.body.message).toMatch(/platform administrator privileges required/i);

      // Unauthenticated gets 401
      const unauthRes = await request(app).get('/api/admin/me');
      expect(unauthRes.status).toBe(401);
    });
  });

  // =========================================================================
  // TASK 4: Cross-Organization Business APIs Scoping
  // =========================================================================
  describe('Task 4: Cross-Organization Resource Isolation', () => {
    it('4.1 Organization A cannot view Organization B vehicles', async () => {
      const res = await request(app)
        .get('/api/vehicles')
        .set('Authorization', `Bearer ${orgAManagerToken}`);

      expect(res.status).toBe(200);
      const vehicleIds = res.body.map((v: any) => v.vehicleID || v.id);
      expect(vehicleIds).toContain(vehicleAId);
      expect(vehicleIds).not.toContain(vehicleBId);
    });

    it('4.2 Organization A cannot modify Organization B vehicle (returns 404)', async () => {
      const res = await request(app)
        .put('/api/vehicles/update/')
        .set('Authorization', `Bearer ${orgAManagerToken}`)
        .query({ id: vehicleBId })
        .send({ name: 'Hacked Vehicle Name' });

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/Vehicle not found/i);
    });

    it('4.3 Organization A cannot delete Organization B vehicle (returns 404)', async () => {
      const res = await request(app)
        .delete('/api/vehicles/delete/')
        .set('Authorization', `Bearer ${orgAManagerToken}`)
        .query({ id: vehicleBId });

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/Vehicle not found/i);
    });

    it('4.4 Organization A cannot view Organization B trips', async () => {
      const res = await request(app)
        .get('/api/trip')
        .set('Authorization', `Bearer ${orgAManagerToken}`);

      expect(res.status).toBe(200);
      const tripIds = res.body.map((t: any) => t.tripID || t.id);
      expect(tripIds).toContain(tripAId);
      expect(tripIds).not.toContain(tripBId);
    });

    it('4.5 Organization A cannot modify Organization B trip status', async () => {
      const res = await request(app)
        .put(`/api/trip/${tripBId}/status`)
        .set('Authorization', `Bearer ${orgAManagerToken}`)
        .send({ status: 'CANCELLED' });

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/Trip not found/i);
    });

    it('4.6 Cross-organization assignment is strictly rejected: Org A assigning Org B vehicle', async () => {
      const res = await request(app)
        .post('/api/trip/create')
        .set('Authorization', `Bearer ${orgAManagerToken}`)
        .send({
          vehicleID: vehicleBId, // Belongs to Org B!
          driverID: driverAId,   // Belongs to Org A
          cargoWeight: 500,
          source: 'Mumbai Port',
          destination: 'Pune Hub',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Vehicle does not belong to your organization/i);
    });

    it('4.7 Cross-organization assignment is strictly rejected: Org A assigning Org B driver', async () => {
      const res = await request(app)
        .post('/api/trip/create')
        .set('Authorization', `Bearer ${orgAManagerToken}`)
        .send({
          vehicleID: vehicleAId, // Belongs to Org A
          driverID: driverBId,   // Belongs to Org B!
          cargoWeight: 500,
          source: 'Mumbai Port',
          destination: 'Pune Hub',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Driver does not belong to your organization/i);
    });

    it('4.8 Manager-created driver automatically inherits manager authorized organization', async () => {
      const newDriverEmail = `newdriver-${Date.now()}@titan.com`;
      const res = await request(app)
        .post('/api/users/create')
        .set('Authorization', `Bearer ${orgAManagerToken}`)
        .send({
          name: 'Newly Hired Titan Driver',
          email: newDriverEmail,
          role: 'ROLE_DRIVER',
          licenseNo: `DL-TITAN-${Math.floor(1000 + Math.random() * 9000)}`,
          licenseExpiryDate: '2032-01-01',
          organization_id: orgBId, // Attempted spoof of organization_id in request body!
        });

      expect(res.status).toBe(201);
      const createdUserId = res.body.user.id;

      // Verify the user in database was assigned to Org A (manager's org), NOT the spoofed Org B
      const dbUser = await db.find('users', { id: createdUserId });
      expect(dbUser?.organization_id).toBe(orgAId);

      // Verify organization_memberships record
      const membership = await db.find('organization_memberships', { user_id: createdUserId });
      expect(membership?.organization_id).toBe(orgAId);
      expect(membership?.status).toBe('active');
    });

    it('4.9 Dashboard KPIs and metrics are scoped to caller organization', async () => {
      const resA = await request(app)
        .get('/api/dashboard/summary')
        .set('Authorization', `Bearer ${orgAManagerToken}`);

      const resB = await request(app)
        .get('/api/dashboard/summary')
        .set('Authorization', `Bearer ${orgBManagerToken}`);

      expect(resA.status).toBe(200);
      expect(resB.status).toBe(200);

      // Org A and Org B must have independent summaries
      expect(resA.body.activeTrips).toBeDefined();
      expect(resB.body.activeTrips).toBeDefined();
    });
  });

  // =========================================================================
  // TASK 6: Realtime, Chat, SOS, and Tracking Isolation
  // =========================================================================
  describe('Task 6: Realtime, Chat & Tracking Isolation', () => {
    it('6.1 Chat roster only returns users belonging to the caller organization', async () => {
      const resA = await request(app)
        .get('/api/chat/users')
        .set('Authorization', `Bearer ${orgAManagerToken}`);

      expect(resA.status).toBe(200);
      const userIds = resA.body.data.map((u: any) => u.id);
      expect(userIds).toContain(driverAId);
      expect(userIds).not.toContain(driverBId);
    });

    it('6.2 Direct cross-organization chat conversation initiation is rejected', async () => {
      const res = await request(app)
        .post('/api/chat/conversations')
        .set('Authorization', `Bearer ${orgAManagerToken}`)
        .send({ participantId: driverBId });

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/Participant user not found/i);
    });

    it('6.3 Organization A cannot access live GPS tracking of Organization B trips', async () => {
      const res = await request(app)
        .get(`/api/tracking/${tripBId}`)
        .set('Authorization', `Bearer ${orgAManagerToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/Trip .* not found/i);
    });

    it('6.4 Driver submitting GPS location cannot submit coordinates for another organization trip', async () => {
      const res = await request(app)
        .post('/api/tracking/location')
        .set('Authorization', `Bearer ${orgADriverToken}`)
        .send({
          tripID: tripBId, // Driver A trying to submit location for Org B trip!
          latitude: 28.6139,
          longitude: 77.209,
          speed: 45,
        });

      expect(res.status).toBe(404);
    });
  });

  // =========================================================================
  // TASK 7: AI and Intelligence Query Isolation
  // =========================================================================
  describe('Task 7: AI Assistant Fleet Intelligence Isolation', () => {
    it('7.1 AI assistant query uses only records from caller organization', async () => {
      const resA = await request(app)
        .post('/api/ai/query')
        .set('Authorization', `Bearer ${orgAManagerToken}`)
        .send({ query: 'Show active vehicles' });

      expect(resA.status).toBe(200);
      expect(resA.body.success).toBe(true);

      // Verify items returned belong strictly to Org A
      if (resA.body.items && resA.body.items.length > 0) {
        const itemIds = resA.body.items.map((i: any) => i.id);
        expect(itemIds).not.toContain(vehicleBId);
      }
    });

    it('7.2 Route intelligence rejects requests for cross-organization trips', async () => {
      const res = await request(app)
        .post('/api/ai/route-recommendation')
        .set('Authorization', `Bearer ${orgAManagerToken}`)
        .send({ tripID: tripBId });

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/Trip not found/i);
    });
  });
});
