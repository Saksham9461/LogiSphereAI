import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { db } from '../src/config/database';

describe('Live GPS Fleet Tracking Pipeline Tests', () => {
  let managerToken: string;
  let driver1Token: string;
  let driver2Token: string;
  let driver1UserId: string;
  let driver2UserId: string;
  let vehicle1ID: string;
  let vehicle2ID: string;
  let trip1ID: string;
  let trip2ID: string;

  it('1. Setup Manager, 2 Drivers, and 2 Vehicles', { timeout: 30000 }, async () => {
    const timestamp = Date.now();

    // Signup Manager
    const mgrRes = await request(app).post('/api/user/create').send({
      name: 'Fleet Manager',
      email: `mgr_track_${timestamp}@logisphere.ai`,
      password: 'Password123',
      phoneNo: '9876543210',
      role: 'ROLE_MANAGER',
    });
    expect(mgrRes.status).toBe(201);
    managerToken = mgrRes.body.token;

    // Signup Driver 1
    const drv1Res = await request(app).post('/api/user/create').send({
      name: 'Driver One',
      email: `drv1_${timestamp}@logisphere.ai`,
      password: 'Password123',
      phoneNo: '9876543211',
      role: 'ROLE_DRIVER',
      licenseNo: `DL1-${timestamp}`,
      licenseExpiryDate: '2030-01-01',
    });
    expect(drv1Res.status).toBe(201);
    driver1Token = drv1Res.body.token;
    driver1UserId = drv1Res.body.user.id;

    // Signup Driver 2
    const drv2Res = await request(app).post('/api/user/create').send({
      name: 'Driver Two',
      email: `drv2_${timestamp}@logisphere.ai`,
      password: 'Password123',
      phoneNo: '9876543212',
      role: 'ROLE_DRIVER',
      licenseNo: `DL2-${timestamp}`,
      licenseExpiryDate: '2030-01-01',
    });
    expect(drv2Res.status).toBe(201);
    driver2Token = drv2Res.body.token;
    driver2UserId = drv2Res.body.user.id;

    // Create Vehicle 1
    const veh1Res = await request(app).post('/api/vehicle/create').send({
      registrationNumber: `GJ01TK${timestamp.toString().slice(-4)}`,
      name: 'FLEET-TRUCK-1',
      type: 'TRUCK',
      maxLoadCapacity: 3000,
      odometer: 5000,
      acquisitionCost: 900000,
    });
    expect(veh1Res.status).toBe(201);
    vehicle1ID =
      veh1Res.body.vehicle?.vehicleID ||
      veh1Res.body.vehicle?.vehicleid ||
      veh1Res.body.vehicleID ||
      veh1Res.body.vehicleid ||
      veh1Res.body.id;

    // Create Vehicle 2
    const veh2Res = await request(app).post('/api/vehicle/create').send({
      registrationNumber: `GJ01TK${(timestamp + 1).toString().slice(-4)}`,
      name: 'FLEET-TRUCK-2',
      type: 'TRUCK',
      maxLoadCapacity: 3000,
      odometer: 8000,
      acquisitionCost: 900000,
    });
    expect(veh2Res.status).toBe(201);
    vehicle2ID =
      veh2Res.body.vehicle?.vehicleID ||
      veh2Res.body.vehicle?.vehicleid ||
      veh2Res.body.vehicleID ||
      veh2Res.body.vehicleid ||
      veh2Res.body.id;
  });

  it('2. Manager creates Trip 1 and assigns Driver 1', { timeout: 30000 }, async () => {
    const tripRes = await request(app)
      .post('/api/trip/create')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        source: 'Gandhinagar Hub',
        destination: 'Ahmedabad Warehouse',
        vehicleID: vehicle1ID,
        driverID: driver1UserId,
        cargoWeight: 1500,
        plannedDistance: 32,
        startingOdometer: 5000,
      });

    expect(tripRes.status).toBe(201);
    trip1ID = tripRes.body.tripID || tripRes.body.tripid || tripRes.body.id;
    expect(trip1ID).toBeTruthy();

    // Manager assigns/dispatches
    const assignRes = await request(app)
      .put(`/api/trip/${trip1ID}/status`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ status: 'ASSIGNED' });
    expect(assignRes.status).toBe(200);
  });

  it('3. Driver 1 starts trip (GOING_TO_PICKUP)', { timeout: 30000 }, async () => {
    const startRes = await request(app)
      .put(`/api/trip/${trip1ID}/status`)
      .set('Authorization', `Bearer ${driver1Token}`)
      .send({ status: 'GOING_TO_PICKUP' });

    expect(startRes.status).toBe(200);
    expect(startRes.body.status).toBe('GOING_TO_PICKUP');
  });

  it('4. Driver 1 submits initial real GPS location', { timeout: 30000 }, async () => {
    const locRes = await request(app)
      .post('/api/tracking/location')
      .set('Authorization', `Bearer ${driver1Token}`)
      .send({
        tripID: trip1ID,
        latitude: 23.2156,
        longitude: 72.6369,
        speed: 42,
        accuracy: 12.5,
        heading: 180,
        deviceTimestamp: new Date().toISOString(),
      });

    expect(locRes.status).toBe(200);
    expect(locRes.body.success).toBe(true);
    expect(locRes.body.data.latitude).toBe(23.2156);
    expect(locRes.body.data.longitude).toBe(72.6369);
    expect(locRes.body.data.speed).toBe(42);
  });

  it('5. Storage boundedness: Second update atomically overwrites without creating duplicate rows', { timeout: 30000 }, async () => {
    const locRes2 = await request(app)
      .post('/api/tracking/location')
      .set('Authorization', `Bearer ${driver1Token}`)
      .send({
        tripID: trip1ID,
        latitude: 23.2011,
        longitude: 72.6255,
        speed: 55,
        accuracy: 8.2,
        heading: 195,
        deviceTimestamp: new Date().toISOString(),
      });

    expect(locRes2.status).toBe(200);
    expect(locRes2.body.data.latitude).toBe(23.2011);
    expect(locRes2.body.data.speed).toBe(55);

    // Verify database contains strictly ONE record for trip1ID
    const allLocs = await db.list('tracking_locations');
    const tripLocs = (allLocs || []).filter(
      (l: any) => String(l.tripID || l.tripid || '').toLowerCase() === trip1ID.toLowerCase()
    );
    expect(tripLocs.length).toBe(1);
    expect(Number(tripLocs[0].latitude)).toBe(23.2011);
  });

  it('6. Security check: Driver 2 cannot submit location for Driver 1 trip (Forbidden)', { timeout: 30000 }, async () => {
    const res = await request(app)
      .post('/api/tracking/location')
      .set('Authorization', `Bearer ${driver2Token}`)
      .send({
        tripID: trip1ID,
        latitude: 23.1111,
        longitude: 72.1111,
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/Forbidden/i);
  });

  it('7. Validation check: Invalid coordinate ranges are rejected', { timeout: 30000 }, async () => {
    const res = await request(app)
      .post('/api/tracking/location')
      .set('Authorization', `Bearer ${driver1Token}`)
      .send({
        tripID: trip1ID,
        latitude: 999.0, // Invalid lat
        longitude: 72.0,
      });

    expect(res.status).toBe(400);
  });

  it('8. Manager GET /api/tracking/live returns real vehicle coordinates with LIVE freshness', { timeout: 30000 }, async () => {
    const liveRes = await request(app)
      .get('/api/tracking/live')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(liveRes.status).toBe(200);
    expect(liveRes.body.success).toBe(true);

    const vehicle1 = liveRes.body.data.find(
      (v: any) => String(v.tripID).toLowerCase() === trip1ID.toLowerCase()
    );
    expect(vehicle1).toBeDefined();
    expect(vehicle1.latitude).toBe(23.2011);
    expect(vehicle1.longitude).toBe(72.6255);
    expect(vehicle1.speed).toBe(55);
    expect(vehicle1.isLive).toBe(true);
    expect(vehicle1.freshness).toBe('LIVE');
  });

  it('9. Multiple vehicles: Create and track Trip 2 independently', { timeout: 30000 }, async () => {
    // Create Trip 2
    const trip2Res = await request(app)
      .post('/api/trip/create')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        source: 'Surat Depot',
        destination: 'Navsari Terminal',
        vehicleID: vehicle2ID,
        driverID: driver2UserId,
        cargoWeight: 800,
        plannedDistance: 25,
        startingOdometer: 8000,
      });
    expect(trip2Res.status).toBe(201);
    trip2ID = trip2Res.body.tripID || trip2Res.body.tripid || trip2Res.body.id;
    expect(trip2ID).toBeTruthy();

    // Manager assigns Trip 2
    await request(app)
      .put(`/api/trip/${trip2ID}/status`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ status: 'ASSIGNED' });

    // Driver 2 starts Trip 2
    await request(app)
      .put(`/api/trip/${trip2ID}/status`)
      .set('Authorization', `Bearer ${driver2Token}`)
      .send({ status: 'GOING_TO_PICKUP' });

    // Driver 2 uploads location (Surat: 21.1702, 72.8311)
    const loc2 = await request(app)
      .post('/api/tracking/location')
      .set('Authorization', `Bearer ${driver2Token}`)
      .send({
        tripID: trip2ID,
        latitude: 21.1702,
        longitude: 72.8311,
        speed: 60,
      });
    expect(loc2.status).toBe(200);

    // Live fleet check: both vehicles must be tracked with their distinct coordinates
    const fleetRes = await request(app)
      .get('/api/tracking/live')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(fleetRes.body.data.length).toBeGreaterThanOrEqual(2);
    const v1 = fleetRes.body.data.find(
      (v: any) => String(v.tripID).toLowerCase() === trip1ID.toLowerCase()
    );
    const v2 = fleetRes.body.data.find(
      (v: any) => String(v.tripID).toLowerCase() === trip2ID.toLowerCase()
    );
    expect(v1).toBeDefined();
    expect(v2).toBeDefined();
    expect(v1.latitude).toBe(23.2011);
    expect(v2.latitude).toBe(21.1702);
  });

  it('10. Lifecycle Cleanup: Completed trip removes tracking record and rejects subsequent updates', { timeout: 30000 }, async () => {
    // Move Trip 1 through lifecycle to DELIVERED
    await request(app)
      .put(`/api/trip/${trip1ID}/status`)
      .set('Authorization', `Bearer ${driver1Token}`)
      .send({ status: 'ARRIVED_AT_PICKUP' });

    await request(app)
      .put(`/api/trip/${trip1ID}/status`)
      .set('Authorization', `Bearer ${driver1Token}`)
      .send({ status: 'PICKED_UP' });

    await request(app)
      .put(`/api/trip/${trip1ID}/status`)
      .set('Authorization', `Bearer ${driver1Token}`)
      .send({ status: 'IN_TRANSIT' });

    await request(app)
      .put(`/api/trip/${trip1ID}/status`)
      .set('Authorization', `Bearer ${driver1Token}`)
      .send({ status: 'ARRIVED_AT_DROP' });

    const deliveredRes = await request(app)
      .put(`/api/trip/${trip1ID}/status`)
      .set('Authorization', `Bearer ${driver1Token}`)
      .send({ status: 'DELIVERED', finalOdometer: 5045 });

    expect(deliveredRes.status).toBe(200);

    // Verify Trip 1 location is removed from tracking_locations table
    const allLocs = await db.list('tracking_locations');
    const remainingTrip1 = (allLocs || []).find(
      (l: any) => String(l.tripID || l.tripid || '').toLowerCase() === trip1ID.toLowerCase()
    );
    expect(remainingTrip1).toBeUndefined();

    // Verify Trip 2 location remains untouched and active!
    const remainingTrip2 = (allLocs || []).find(
      (l: any) => String(l.tripID || l.tripid || '').toLowerCase() === trip2ID.toLowerCase()
    );
    expect(remainingTrip2).toBeDefined();

    // Verify subsequent updates for finished Trip 1 are rejected
    const lateUpdateRes = await request(app)
      .post('/api/tracking/location')
      .set('Authorization', `Bearer ${driver1Token}`)
      .send({
        tripID: trip1ID,
        latitude: 23.3,
        longitude: 72.7,
      });

    expect(lateUpdateRes.status).toBe(400);
    expect(lateUpdateRes.body.message).toMatch(/finished trip/i);
  });
});
