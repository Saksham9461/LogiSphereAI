import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { db } from '../src/config/database';
import { signToken } from '../src/middleware/auth';

describe('AI Route Intelligence Integration Tests', () => {
  let driverToken: string;
  let otherDriverToken: string;
  let testTripId: string;

  beforeAll(async () => {
    // 1. Create Driver User
    const driverUser = {
      id: `drv-test-${Date.now()}`,
      name: 'Test Driver Alpha',
      email: `driver-${Date.now()}@logisphere.ai`,
      role: 'ROLE_DRIVER',
    };
    await db.insert('users', driverUser);
    driverToken = signToken(driverUser);

    // 2. Create Second Driver User
    const otherDriver = {
      id: `drv-other-${Date.now()}`,
      name: 'Other Driver',
      email: `other-${Date.now()}@logisphere.ai`,
      role: 'ROLE_DRIVER',
    };
    await db.insert('users', otherDriver);
    otherDriverToken = signToken(otherDriver);

    // 3. Create Test Vehicle
    const vehicle = {
      vehicleID: `veh-${Date.now()}`,
      name: 'VAN-99',
      status: 'AVAILABLE',
    };
    await db.insert('vehicles', vehicle);

    // 4. Create Test Trip
    testTripId = `TRP-TEST-${Math.floor(1000 + Math.random() * 9000)}`;
    const trip = {
      tripID: testTripId,
      source: 'Gandhinagar Depot',
      sourceLatitude: 23.2156,
      sourceLongitude: 72.6369,
      destination: 'Ahmedabad Hub',
      destinationLatitude: 23.0225,
      destinationLongitude: 72.5714,
      vehicleID: vehicle.vehicleID,
      driverID: driverUser.id,
      cargoWeight: 600,
      plannedDistance: 38,
      status: 'ACCEPTED',
    };
    await db.insert('trips', trip);
  });

  it('1. Unauthenticated request should return 401', async () => {
    const res = await request(app)
      .post('/api/ai/route-recommendation')
      .send({ tripID: testTripId });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('2. Driver requesting another driver\'s trip should return 403', async () => {
    const res = await request(app)
      .post('/api/ai/route-recommendation')
      .set('Authorization', `Bearer ${otherDriverToken}`)
      .send({ tripID: testTripId });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('3. Requesting non-existent trip should return 404', async () => {
    const res = await request(app)
      .post('/api/ai/route-recommendation')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ tripID: 'TRP-NONEXISTENT-9999' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('4. Authenticated driver requesting their assigned trip should return normalized routes & AI recommendation', async () => {
    const res = await request(app)
      .post('/api/ai/route-recommendation')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        tripID: testTripId,
        currentLatitude: 23.2156,
        currentLongitude: 72.6369,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    expect(data).toHaveProperty('tripID', testTripId);
    expect(data.origin).toHaveProperty('latitude');
    expect(data.origin).toHaveProperty('longitude');
    expect(data.destination).toHaveProperty('latitude');
    expect(data.destination).toHaveProperty('longitude');

    expect(Array.isArray(data.routes)).toBe(true);
    expect(data.routes.length).toBeGreaterThan(0);

    const firstRoute = data.routes[0];
    expect(firstRoute).toHaveProperty('id');
    expect(firstRoute).toHaveProperty('distanceMeters');
    expect(firstRoute).toHaveProperty('durationSeconds');
    expect(firstRoute).toHaveProperty('encodedPolyline');

    expect(data.recommendation).toHaveProperty('routeId');
    expect(data.recommendation).toHaveProperty('reason');
    expect(data.recommendation).toHaveProperty('confidence');
    expect(data.recommendation).toHaveProperty('source');
  });
});
