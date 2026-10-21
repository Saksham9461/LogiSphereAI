import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { db } from '../src/config/database';
import { signToken } from '../src/middleware/auth';

describe('LogiSphere AI — Active Trip-Based Geofence Attendance Exception Test Suite', () => {
  const timestamp = Date.now();

  // Organizations
  const orgHubAId = `00000000-0000-4000-a000-${timestamp.toString().slice(-12)}`;
  const orgHubBId = `00000000-0000-4000-b000-${(timestamp + 1).toString().slice(-12)}`;

  // Hub A coordinates (Ahmedabad: 23.0225, 72.5714, radius: 250m)
  const hubACoords = { latitude: 23.0225, longitude: 72.5714 };
  // Outside Hub A: Surat coordinates (~260 km away: 21.1702, 72.8311)
  const outsideHubACoords = { latitude: 21.1702, longitude: 72.8311 };
  // Inside Hub A: (~15m away)
  const insideHubACoords = { latitude: 23.02255, longitude: 72.57145 };

  // Users
  const driverA = {
    id: `drv-a-${timestamp}`,
    name: 'Raju Driver A',
    email: `raju_a_${timestamp}@logi.ai`,
    role: 'ROLE_DRIVER',
    organization_id: orgHubAId,
  };

  const driverB = {
    id: `drv-b-${timestamp}`,
    name: 'Suresh Driver B',
    email: `suresh_b_${timestamp}@logi.ai`,
    role: 'ROLE_DRIVER',
    organization_id: orgHubBId,
  };

  const managerA = {
    id: `mgr-a-${timestamp}`,
    name: 'Vikram Manager A',
    email: `vikram_a_${timestamp}@logi.ai`,
    role: 'ROLE_MANAGER',
    organization_id: orgHubAId,
  };

  let tokenDriverA = '';
  let tokenDriverB = '';
  let tokenManagerA = '';

  // Trips for Driver A
  const activeTripAId = `TRP-ACT-${timestamp.toString().slice(-8)}`;
  const completedTripAId = `TRP-CMP-${timestamp.toString().slice(-8)}`;
  const cancelledTripAId = `TRP-CAN-${timestamp.toString().slice(-8)}`;
  const otherDriverTripId = `TRP-OTH-${timestamp.toString().slice(-8)}`;

  beforeAll(async () => {
    // 1. Provision Organizations
    await db.insert('organizations', {
      id: orgHubAId,
      name: 'Gujarat Central Hub',
      slug: `gujarat-hub-${timestamp}`,
      formatted_address: 'Ahmedabad Logistics Park, Gujarat',
      latitude: hubACoords.latitude,
      longitude: hubACoords.longitude,
      geofence_radius: 250,
      status: 'approved',
    });

    await db.insert('organizations', {
      id: orgHubBId,
      name: 'Maharashtra Freight Hub',
      slug: `maharashtra-hub-${timestamp}`,
      formatted_address: 'Navi Mumbai Freight Center',
      latitude: 19.033,
      longitude: 73.0297,
      geofence_radius: 200,
      status: 'approved',
    });

    // 2. Provision Users
    await db.insert('users', {
      id: driverA.id,
      name: driverA.name,
      email: driverA.email,
      role: driverA.role,
      password: 'HashedPassword123!',
      organization_id: orgHubAId,
    });

    await db.insert('users', {
      id: driverB.id,
      name: driverB.name,
      email: driverB.email,
      role: driverB.role,
      password: 'HashedPassword123!',
      organization_id: orgHubBId,
    });

    await db.insert('users', {
      id: managerA.id,
      name: managerA.name,
      email: managerA.email,
      role: managerA.role,
      password: 'HashedPassword123!',
      organization_id: orgHubAId,
    });

    tokenDriverA = signToken({
      id: driverA.id,
      userId: driverA.id,
      email: driverA.email,
      role: driverA.role,
      organizationId: orgHubAId,
    });

    tokenDriverB = signToken({
      id: driverB.id,
      userId: driverB.id,
      email: driverB.email,
      role: driverB.role,
      organizationId: orgHubBId,
    });

    tokenManagerA = signToken({
      id: managerA.id,
      userId: managerA.id,
      email: managerA.email,
      role: managerA.role,
      organizationId: orgHubAId,
    });

    // 3. Provision Trips
    // Active trip assigned to Driver A in Hub A
    await db.insert('trips', {
      tripID: activeTripAId,
      source: 'Ahmedabad Hub',
      destination: 'Surat Center',
      status: 'IN_TRANSIT',
      driverID: driverA.id,
      organization_id: orgHubAId,
    });

    // Completed trip assigned to Driver A
    await db.insert('trips', {
      tripID: completedTripAId,
      source: 'Ahmedabad Hub',
      destination: 'Vadodara Hub',
      status: 'COMPLETED',
      driverID: driverA.id,
      organization_id: orgHubAId,
    });

    // Cancelled trip assigned to Driver A
    await db.insert('trips', {
      tripID: cancelledTripAId,
      source: 'Ahmedabad Hub',
      destination: 'Rajkot Depot',
      status: 'CANCELLED',
      driverID: driverA.id,
      organization_id: orgHubAId,
    });

    // Trip belonging to Driver B in Hub B
    await db.insert('trips', {
      tripID: otherDriverTripId,
      source: 'Mumbai Hub',
      destination: 'Pune Hub',
      status: 'IN_TRANSIT',
      driverID: driverB.id,
      organization_id: orgHubBId,
    });
  });

  // ---------------------------------------------------------------------------
  // 1. Authoritative Active Trip Lookup API
  // ---------------------------------------------------------------------------
  it('1. GET /api/attendance/active-trip returns active trip for eligible driver', async () => {
    const res = await request(app)
      .get('/api/attendance/active-trip')
      .set('Authorization', `Bearer ${tokenDriverA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.hasActiveTrip).toBe(true);
    expect(res.body.trip).toBeDefined();
    expect(res.body.trip.tripID).toBe(activeTripAId);
    expect(res.body.trip.status).toBe('IN_TRANSIT');
  });

  it('2. GET /api/attendance/active-trip returns false for manager role', async () => {
    const res = await request(app)
      .get('/api/attendance/active-trip')
      .set('Authorization', `Bearer ${tokenManagerA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.hasActiveTrip).toBe(false);
    expect(res.body.trip).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // 2. Normal In-Geofence Attendance (No Exception Needed)
  // ---------------------------------------------------------------------------
  it('3. Driver inside geofence clocks in normally without exception flag', async () => {
    const res = await request(app)
      .post('/api/attendance/clock-in')
      .set('Authorization', `Bearer ${tokenDriverA}`)
      .send({
        latitude: insideHubACoords.latitude,
        longitude: insideHubACoords.longitude,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('CLOCKED_IN');
    expect(res.body.record.isGeofenceException).toBe(false);
    expect(res.body.record.exceptionReason).toBeNull();
  });

  it('4. Attempting exception submission while INSIDE geofence is rejected', async () => {
    // Driver A is currently clocked in. Let's clock out first.
    await request(app)
      .post('/api/attendance/clock-out')
      .set('Authorization', `Bearer ${tokenDriverA}`)
      .send({
        latitude: insideHubACoords.latitude,
        longitude: insideHubACoords.longitude,
      });

    // Try clock in inside geofence with exception payload
    const res = await request(app)
      .post('/api/attendance/clock-in')
      .set('Authorization', `Bearer ${tokenDriverA}`)
      .send({
        latitude: insideHubACoords.latitude,
        longitude: insideHubACoords.longitude,
        tripId: activeTripAId,
        locationDescription: 'Trying to claim exception inside geofence',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('only permitted when driver coordinates are outside');
  });

  // ---------------------------------------------------------------------------
  // 3. Driver Outside Geofence WITHOUT Active Trip
  // ---------------------------------------------------------------------------
  it('5. Driver outside geofence without active trip is strictly blocked (standard geofence)', async () => {
    // Driver B has activeTrip in Hub B, but test an arbitrary driver C with NO trips
    const driverNoTrip = {
      id: `drv-notrip-${timestamp}`,
      name: 'No Trip Driver',
      email: `notrip_${timestamp}@logi.ai`,
      role: 'ROLE_DRIVER',
      organization_id: orgHubAId,
    };
    await db.insert('users', { ...driverNoTrip, password: 'HashedPassword123!' });
    const tokenNoTrip = signToken({
      id: driverNoTrip.id,
      userId: driverNoTrip.id,
      email: driverNoTrip.email,
      role: driverNoTrip.role,
      organizationId: orgHubAId,
    });

    const res = await request(app)
      .post('/api/attendance/clock-in')
      .set('Authorization', `Bearer ${tokenNoTrip}`)
      .send({
        latitude: outsideHubACoords.latitude,
        longitude: outsideHubACoords.longitude,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('outside the authorized geofence boundary');
    expect(res.body.data.distance).toBeGreaterThan(200000);
  });

  // ---------------------------------------------------------------------------
  // 4. Invalid Exceptions (Completed Trip, Other Driver Trip, Empty Reason, Role)
  // ---------------------------------------------------------------------------
  it('6. Driver outside geofence with COMPLETED trip is rejected for exception', async () => {
    const res = await request(app)
      .post('/api/attendance/clock-in')
      .set('Authorization', `Bearer ${tokenDriverA}`)
      .send({
        latitude: outsideHubACoords.latitude,
        longitude: outsideHubACoords.longitude,
        tripId: completedTripAId,
        locationDescription: 'Finished trip earlier today',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('not in an active operational state');
  });

  it('7. Driver outside geofence with CANCELLED trip is rejected for exception', async () => {
    const res = await request(app)
      .post('/api/attendance/clock-in')
      .set('Authorization', `Bearer ${tokenDriverA}`)
      .send({
        latitude: outsideHubACoords.latitude,
        longitude: outsideHubACoords.longitude,
        tripId: cancelledTripAId,
        locationDescription: 'Trip was cancelled but still on road',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('not in an active operational state');
  });

  it('8. Driver outside geofence with ANOTHER driver trip is rejected (anti-spoofing)', async () => {
    const res = await request(app)
      .post('/api/attendance/clock-in')
      .set('Authorization', `Bearer ${tokenDriverA}`)
      .send({
        latitude: outsideHubACoords.latitude,
        longitude: outsideHubACoords.longitude,
        tripId: otherDriverTripId,
        locationDescription: 'Borrowing another drivers trip',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Unauthorized: Trip belongs to another organization');
  });

  it('9. Non-driver role (Manager) attempting exception is denied (403)', async () => {
    const res = await request(app)
      .post('/api/attendance/clock-in')
      .set('Authorization', `Bearer ${tokenManagerA}`)
      .send({
        latitude: outsideHubACoords.latitude,
        longitude: outsideHubACoords.longitude,
        tripId: activeTripAId,
        locationDescription: 'Manager on site visit',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('strictly restricted to drivers');
  });

  it('10. Empty or whitespace-only location description is rejected (400)', async () => {
    const res = await request(app)
      .post('/api/attendance/clock-in')
      .set('Authorization', `Bearer ${tokenDriverA}`)
      .send({
        latitude: outsideHubACoords.latitude,
        longitude: outsideHubACoords.longitude,
        tripId: activeTripAId,
        locationDescription: '    ',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('non-empty location description is required');
  });

  it('11. Missing or invalid coordinates reject without geofence bypass', async () => {
    const res = await request(app)
      .post('/api/attendance/clock-in')
      .set('Authorization', `Bearer ${tokenDriverA}`)
      .send({
        latitude: 'invalid-lat',
        longitude: 72.5,
        tripId: activeTripAId,
        locationDescription: 'Near destination',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // 5. Valid Exception Clock-In and Clock-Out Flows
  // ---------------------------------------------------------------------------
  it('12. Valid exception clock-in records attendance with reason and trip reference', async () => {
    const description = 'Delivering industrial machinery order at Surat customer site';
    const res = await request(app)
      .post('/api/attendance/clock-in')
      .set('Authorization', `Bearer ${tokenDriverA}`)
      .send({
        latitude: outsideHubACoords.latitude,
        longitude: outsideHubACoords.longitude,
        tripId: activeTripAId,
        locationDescription: description,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('CLOCKED_IN');
    expect(res.body.record.isGeofenceException).toBe(true);
    expect(res.body.record.exceptionReason).toBe(description);
    expect(res.body.record.tripId).toBe(activeTripAId);
    expect(res.body.record.exceptionAction).toBe('CLOCK_IN');
    expect(res.body.record.distanceFromOffice).toBeGreaterThan(200000);
    expect(res.body.data.isException).toBe(true);
  });

  it('13. Duplicate clock-in is rejected while session is active', async () => {
    const res = await request(app)
      .post('/api/attendance/clock-in')
      .set('Authorization', `Bearer ${tokenDriverA}`)
      .send({
        latitude: outsideHubACoords.latitude,
        longitude: outsideHubACoords.longitude,
        tripId: activeTripAId,
        locationDescription: 'Trying to clock in again',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('already clocked in');
  });

  it('14. Valid exception clock-out records attendance with reason and trip reference', async () => {
    const outDescription = 'Completed unloading at customer warehouse Surat, returning to depot';
    const res = await request(app)
      .post('/api/attendance/clock-out')
      .set('Authorization', `Bearer ${tokenDriverA}`)
      .send({
        latitude: outsideHubACoords.latitude,
        longitude: outsideHubACoords.longitude,
        tripId: activeTripAId,
        locationDescription: outDescription,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('NOT_CLOCKED_IN');
    expect(res.body.record.isGeofenceException).toBe(true);
    expect(res.body.record.exceptionReason).toBe(outDescription);
    expect(res.body.record.tripId).toBe(activeTripAId);
    expect(res.body.record.exceptionAction).toBe('CLOCK_OUT');
    expect(res.body.record.clockOutTime).toBeDefined();
    expect(res.body.data.isException).toBe(true);
  });

  it('15. Duplicate clock-out or clock-out when not clocked in is rejected', async () => {
    const res = await request(app)
      .post('/api/attendance/clock-out')
      .set('Authorization', `Bearer ${tokenDriverA}`)
      .send({
        latitude: outsideHubACoords.latitude,
        longitude: outsideHubACoords.longitude,
        tripId: activeTripAId,
        locationDescription: 'Clock out again',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('No active clock-in session found');
  });

  it('16. GET /api/attendance/status provides geofence and activeTrip metadata', async () => {
    const res = await request(app)
      .get('/api/attendance/status')
      .set('Authorization', `Bearer ${tokenDriverA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.geofence).toBeDefined();
    expect(res.body.geofence.organizationName).toBe('Gujarat Central Hub');
    expect(res.body.geofence.geofenceRadius).toBe(250);
    expect(res.body.activeTrip).toBeDefined();
    expect(res.body.activeTrip.tripID).toBe(activeTripAId);
  });
});
