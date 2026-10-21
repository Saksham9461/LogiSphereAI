import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { db } from '../src/config/database';
import { signToken } from '../src/middleware/auth';

describe('LogiSphere AI — Multi-Tenant Organization Geofencing E2E Test Suite', () => {
  const timestamp = Date.now();

  // Organization 1: Mumbai Fleet Hub (19.0760, 72.8777, radius: 200m)
  const orgMumbaiId = `00000000-0000-4000-8000-${timestamp.toString().slice(-12)}`;
  const mumbaiCoords = { latitude: 19.076, longitude: 72.8777 };

  // Organization 2: Delhi Distribution Hub (28.6139, 77.2090, radius: 300m)
  const orgDelhiId = `00000000-0000-4000-9000-${(timestamp + 1).toString().slice(-12)}`;
  const delhiCoords = { latitude: 28.6139, longitude: 77.209 };

  // Organization 3: Missing Coordinates Organization
  const orgNoCoordsId = `00000000-0000-4000-7000-${(timestamp + 2).toString().slice(-12)}`;

  // Drivers
  const mumbaiDriver = {
    id: `drv-mum-${timestamp}`,
    name: 'Rajesh Mumbai Driver',
    email: `rajesh_mum_${timestamp}@logisphere.ai`,
    role: 'ROLE_DRIVER',
  };

  const delhiDriver = {
    id: `drv-del-${timestamp}`,
    name: 'Amit Delhi Driver',
    email: `amit_del_${timestamp}@logisphere.ai`,
    role: 'ROLE_DRIVER',
  };

  const unlinkedDriver = {
    id: `drv-unlink-${timestamp}`,
    name: 'Unlinked Driver',
    email: `unlinked_${timestamp}@logisphere.ai`,
    role: 'ROLE_DRIVER',
  };

  let mumbaiDriverToken = '';
  let delhiDriverToken = '';
  let unlinkedDriverToken = '';

  beforeAll(async () => {
    // 1. Provision Mumbai Organization
    await db.insert('organizations', {
      id: orgMumbaiId,
      name: 'Mumbai Central Logistics Hub',
      slug: `mumbai-logistics-${timestamp}`,
      formatted_address: 'Andheri East, Mumbai, Maharashtra 400069',
      latitude: mumbaiCoords.latitude,
      longitude: mumbaiCoords.longitude,
      geofence_radius: 200,
      status: 'approved',
    });

    // 2. Provision Delhi Organization
    await db.insert('organizations', {
      id: orgDelhiId,
      name: 'Delhi Northern Freight Center',
      slug: `delhi-freight-${timestamp}`,
      formatted_address: 'Connaught Place, New Delhi 110001',
      latitude: delhiCoords.latitude,
      longitude: delhiCoords.longitude,
      geofence_radius: 300,
      status: 'approved',
    });

    // 3. Provision No-Coords Organization
    await db.insert('organizations', {
      id: orgNoCoordsId,
      name: 'Unregistered Coords Fleet Ltd',
      slug: `no-coords-${timestamp}`,
      formatted_address: 'Virtual Address Nowhere',
      latitude: null,
      longitude: null,
      geofence_radius: 200,
      status: 'approved',
    });

    // 4. Provision Driver Users
    await db.insert('users', {
      id: mumbaiDriver.id,
      name: mumbaiDriver.name,
      email: mumbaiDriver.email,
      role: mumbaiDriver.role,
      password: 'HashedPassword123!',
      organization_id: orgMumbaiId,
    });

    await db.insert('users', {
      id: delhiDriver.id,
      name: delhiDriver.name,
      email: delhiDriver.email,
      role: delhiDriver.role,
      password: 'HashedPassword123!',
      organization_id: orgDelhiId,
    });

    await db.insert('users', {
      id: unlinkedDriver.id,
      name: unlinkedDriver.name,
      email: unlinkedDriver.email,
      role: unlinkedDriver.role,
      password: 'HashedPassword123!',
      organization_id: orgNoCoordsId,
    });

    // 5. Provision Active Memberships
    await db.insert('organization_memberships', {
      id: `mem-mum-${timestamp}`,
      organization_id: orgMumbaiId,
      user_id: mumbaiDriver.id,
      role: 'ROLE_DRIVER',
      status: 'active',
    });

    await db.insert('organization_memberships', {
      id: `mem-del-${timestamp}`,
      organization_id: orgDelhiId,
      user_id: delhiDriver.id,
      role: 'ROLE_DRIVER',
      status: 'active',
    });

    await db.insert('organization_memberships', {
      id: `mem-unlink-${timestamp}`,
      organization_id: orgNoCoordsId,
      user_id: unlinkedDriver.id,
      role: 'ROLE_DRIVER',
      status: 'active',
    });

    mumbaiDriverToken = signToken({ ...mumbaiDriver, organization_id: orgMumbaiId });
    delhiDriverToken = signToken({ ...delhiDriver, organization_id: orgDelhiId });
    unlinkedDriverToken = signToken({ ...unlinkedDriver, organization_id: orgNoCoordsId });
  });

  // ---------------------------------------------------------------------------
  // 1. Organization Registration Validations
  // ---------------------------------------------------------------------------
  it('1. Organization registration saves valid coordinates and geofence radius', async () => {
    const regPayload = {
      organizationName: `Apex Transit Global ${timestamp}`,
      slug: `apex-transit-${timestamp}`,
      formattedAddress: 'SG Highway, Ahmedabad, Gujarat',
      latitude: 23.05129,
      longitude: 72.61881,
      geofenceRadius: 250,
      managerName: 'Sunil Sharma',
      managerEmail: `sunil.${timestamp}@apextransit.com`,
      password: 'SecureManager2026!',
    };

    const res = await request(app).post('/api/org/register').send(regPayload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.organization.status).toBe('pending');

    const inDb = await db.find('organizations', { id: res.body.data.organization.id });
    expect(inDb).toBeDefined();
    expect(Number(inDb.latitude)).toBeCloseTo(23.05129, 4);
    expect(Number(inDb.longitude)).toBeCloseTo(72.61881, 4);
  });

  it('2. Organization registration rejects invalid (0, 0) coordinates', async () => {
    const invalidPayload = {
      organizationName: `Bogus Fleet ${timestamp}`,
      formattedAddress: 'Null Island',
      latitude: 0,
      longitude: 0,
      managerName: 'Fake Manager',
      managerEmail: `fake.${timestamp}@nullisland.com`,
      password: 'SecurePassword123!',
    };

    const res = await request(app).post('/api/org/register').send(invalidPayload);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('(0, 0)');
  });

  it('3. Organization registration rejects asymmetric coordinates (one provided without the other)', async () => {
    const asymmetricPayload = {
      organizationName: `Partial Coords ${timestamp}`,
      formattedAddress: 'Somewhere',
      latitude: 23.05129,
      // longitude missing
      managerName: 'Partial Manager',
      managerEmail: `partial.${timestamp}@partial.com`,
      password: 'SecurePassword123!',
    };

    const res = await request(app).post('/api/org/register').send(asymmetricPayload);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // 2. Organization Coordinate Lookups & Multi-Tenant Isolation
  // ---------------------------------------------------------------------------
  it('4. Mumbai driver successfully clocks in within Mumbai organization radius', async () => {
    // Exact location ~15m from Mumbai facility
    const res = await request(app)
      .post('/api/attendance/clock-in')
      .set('Authorization', `Bearer ${mumbaiDriverToken}`)
      .send({
        latitude: 19.07605,
        longitude: 72.87775,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('CLOCKED_IN');
    expect(res.body.record.organization_id).toBe(orgMumbaiId);
    expect(res.body.data.isInside).toBe(true);
    expect(res.body.data.distance).toBeLessThanOrEqual(200);
    expect(res.body.data.organizationName).toBe('Mumbai Central Logistics Hub');
  });

  it('5. Mumbai driver is REJECTED when attempting to clock in from Delhi coordinates (~1150 km away)', async () => {
    // Delhi coordinates
    const res = await request(app)
      .post('/api/attendance/clock-in')
      .set('Authorization', `Bearer ${mumbaiDriverToken}`)
      .send({
        latitude: delhiCoords.latitude,
        longitude: delhiCoords.longitude,
      });

    // Should fail (already clocked in from previous test or outside radius)
    // First, let's clock out Mumbai driver so we test fresh clock-in
    await request(app)
      .post('/api/attendance/clock-out')
      .set('Authorization', `Bearer ${mumbaiDriverToken}`)
      .send({
        latitude: 19.07605,
        longitude: 72.87775,
      });

    // Now attempt clock-in from Delhi
    const distantRes = await request(app)
      .post('/api/attendance/clock-in')
      .set('Authorization', `Bearer ${mumbaiDriverToken}`)
      .send({
        latitude: delhiCoords.latitude,
        longitude: delhiCoords.longitude,
      });

    expect(distantRes.status).toBe(400);
    expect(distantRes.body.success).toBe(false);
    expect(distantRes.body.message).toContain('outside the authorized geofence boundary');
    expect(distantRes.body.data.distance).toBeGreaterThan(1000000); // > 1000 km
  });

  it('6. Delhi driver successfully clocks in at Delhi location (independent from Mumbai org)', async () => {
    const res = await request(app)
      .post('/api/attendance/clock-in')
      .set('Authorization', `Bearer ${delhiDriverToken}`)
      .send({
        latitude: delhiCoords.latitude,
        longitude: delhiCoords.longitude,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('CLOCKED_IN');
    expect(res.body.record.organization_id).toBe(orgDelhiId);
    expect(res.body.data.organizationName).toBe('Delhi Northern Freight Center');
    expect(res.body.data.distance).toBeLessThanOrEqual(300);
  });

  // ---------------------------------------------------------------------------
  // 3. Security Fix: Client Spoofing Prevention
  // ---------------------------------------------------------------------------
  it('7. Client submitting distanceFromOffice: 0 CANNOT bypass geofencing when driver is distant', async () => {
    // Mumbai driver is currently not clocked in. Submit Delhi coordinates with spoofed distanceFromOffice: 0!
    const spoofAttempt = await request(app)
      .post('/api/attendance/clock-in')
      .set('Authorization', `Bearer ${mumbaiDriverToken}`)
      .send({
        latitude: delhiCoords.latitude, // ~1150 km away
        longitude: delhiCoords.longitude,
        distanceFromOffice: 0, // Malicious spoof claim
      });

    expect(spoofAttempt.status).toBe(400);
    expect(spoofAttempt.body.success).toBe(false);
    expect(spoofAttempt.body.message).toContain('outside the authorized geofence boundary');
    // Distance must reflect real calculated distance, NOT the spoofed 0
    expect(spoofAttempt.body.data.distance).toBeGreaterThan(1000000);
  });

  it('8. Client supplying organizationId in body CANNOT hijack another organization context', async () => {
    // Mumbai driver supplies Delhi's organizationId in body while at Delhi
    const hijackAttempt = await request(app)
      .post('/api/attendance/clock-in')
      .set('Authorization', `Bearer ${mumbaiDriverToken}`)
      .send({
        latitude: delhiCoords.latitude,
        longitude: delhiCoords.longitude,
        organizationId: orgDelhiId, // Attempt to switch organization context
        organization_id: orgDelhiId,
      });

    expect(hijackAttempt.status).toBe(400);
    expect(hijackAttempt.body.success).toBe(false);
    // Server must still resolve Mumbai organization based on trusted auth/membership records
    expect(hijackAttempt.body.message).toContain('outside the authorized geofence boundary');
  });

  // ---------------------------------------------------------------------------
  // 4. Missing / Invalid Coordinates Handling
  // ---------------------------------------------------------------------------
  it('9. Driver linked to organization with missing coordinates is rejected with clean error', async () => {
    const res = await request(app)
      .post('/api/attendance/clock-in')
      .set('Authorization', `Bearer ${unlinkedDriverToken}`)
      .send({
        latitude: 23.05288,
        longitude: 72.61891,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('does not have valid registered facility coordinates');
  });

  it('10. Clock-in rejects non-numeric or out-of-range GPS coordinates', async () => {
    // Out of range latitude (> 90)
    const outOfRange = await request(app)
      .post('/api/attendance/clock-in')
      .set('Authorization', `Bearer ${mumbaiDriverToken}`)
      .send({
        latitude: 195.0,
        longitude: 72.8777,
      });

    expect(outOfRange.status).toBe(400);
    expect(outOfRange.body.success).toBe(false);

    // Missing coordinates
    const missingCoords = await request(app)
      .post('/api/attendance/clock-in')
      .set('Authorization', `Bearer ${mumbaiDriverToken}`)
      .send({});

    expect(missingCoords.status).toBe(400);
    expect(missingCoords.body.success).toBe(false);
    expect(missingCoords.body.message).toContain('GPS coordinates');
  });

  // ---------------------------------------------------------------------------
  // 5. Clock-Out Geofencing & Ownership Checks
  // ---------------------------------------------------------------------------
  it('11. Another driver CANNOT clock out someone else\'s active attendance session', async () => {
    // Delhi driver is currently clocked in. Mumbai driver tries to clock out Delhi driver!
    const res = await request(app)
      .post('/api/attendance/clock-out')
      .set('Authorization', `Bearer ${mumbaiDriverToken}`)
      .send({
        userId: delhiDriver.id, // Trying to clock out Delhi driver
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Unauthorized');
  });

  it('12. Clock-out validates geofence against driver organization when coordinates are provided', async () => {
    // Delhi driver tries to clock out with distant Mumbai coordinates
    const badClockOut = await request(app)
      .post('/api/attendance/clock-out')
      .set('Authorization', `Bearer ${delhiDriverToken}`)
      .send({
        latitude: mumbaiCoords.latitude, // Distant location (~1150 km)
        longitude: mumbaiCoords.longitude,
      });

    expect(badClockOut.status).toBe(400);
    expect(badClockOut.body.success).toBe(false);
    expect(badClockOut.body.message).toContain('outside the authorized geofence boundary');

    // Valid clock out within Delhi facility radius
    const goodClockOut = await request(app)
      .post('/api/attendance/clock-out')
      .set('Authorization', `Bearer ${delhiDriverToken}`)
      .send({
        latitude: delhiCoords.latitude,
        longitude: delhiCoords.longitude,
      });

    expect(goodClockOut.status).toBe(200);
    expect(goodClockOut.body.success).toBe(true);
    expect(goodClockOut.body.status).toBe('NOT_CLOCKED_IN');
    expect(goodClockOut.body.record.clockOutTime).toBeDefined();
  });
});
