import request from 'supertest';
import {describe, expect, it} from 'vitest';
import {app} from '../src/app';

describe('Trip Lifecycle Integration Tests', () => {
  let managerToken: string;
  let driverToken: string;
  let managerUserId: string;
  let driverUserId: string;
  let createdTripID: string;
  let vehicleID: string;

  it('1. Prepares test Manager, Driver, and Vehicle', async () => {
    const timestamp = Date.now();

    // Signup Manager
    const mgrRes = await request(app).post('/api/user/create').send({
      name: 'Lifecycle Manager',
      email: `mgr_${timestamp}@logisphere.ai`,
      password: 'Password123',
      phoneNo: '9998887771',
      role: 'ROLE_MANAGER',
    });
    expect(mgrRes.status).toBe(201);
    managerToken = mgrRes.body.token;
    managerUserId = mgrRes.body.user.id;

    // Signup Driver
    const drvRes = await request(app).post('/api/user/create').send({
      name: 'Lifecycle Driver',
      email: `drv_${timestamp}@logisphere.ai`,
      password: 'Password123',
      phoneNo: '9998887772',
      role: 'ROLE_DRIVER',
      licenseNo: `DL-${timestamp}`,
      licenseExpiryDate: '2030-01-01',
    });
    expect(drvRes.status).toBe(201);
    driverToken = drvRes.body.token;
    driverUserId = drvRes.body.user.id;

    // Create Available Vehicle
    const vehRes = await request(app).post('/api/vehicle/create').send({
      registrationNumber: `GJ01LC${timestamp.toString().slice(-4)}`,
      name: 'LIFECYCLE-TRUCK',
      type: 'TRUCK',
      maxLoadCapacity: 2000,
      odometer: 10000,
      acquisitionCost: 800000,
    });
    expect(vehRes.status).toBe(201);
    const vData = vehRes.body.vehicle || vehRes.body.data || vehRes.body;
    vehicleID = vData.vehicleID || vData.id || vData.vehicleid;
    expect(vehicleID).toBeTruthy();
  });

  it('2. Manager creates trip -> status PENDING_APPROVAL', async () => {
    const res = await request(app)
      .post('/api/trip/create')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        source: 'Depot A',
        destination: 'Hub B',
        vehicleID,
        driverID: driverUserId,
        cargoWeight: 1200,
        plannedDistance: 45,
        startingOdometer: 10000,
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('PENDING_APPROVAL');
    createdTripID = res.body.tripID || res.body.id || res.body.tripid;
    expect(createdTripID).toBeTruthy();
  });

  it('3. Driver cannot accept trip (Role check)', async () => {
    const res = await request(app)
      .put(`/api/trip/${createdTripID}/status`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ status: 'ACCEPTED' });

    expect(res.status).toBe(403);
  });

  it('4. Manager accepts trip -> status ACCEPTED & notification generated', async () => {
    const res = await request(app)
      .put(`/api/trip/${createdTripID}/status`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ status: 'ACCEPTED' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ACCEPTED');

    // Check notifications
    const notifRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${driverToken}`);

    expect(notifRes.status).toBe(200);
    const driverNotifs = notifRes.body.filter((n: any) => n.userId === driverUserId || n.role === 'ROLE_DRIVER');
    expect(driverNotifs.length).toBeGreaterThan(0);
    expect(driverNotifs[0].title).toBe('New trip assigned');
  });

  it('5. Driver transitions through complete lifecycle', { timeout: 30000 }, async () => {
    // GOING_TO_PICKUP
    let res = await request(app)
      .put(`/api/trip/${createdTripID}/status`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ status: 'GOING_TO_PICKUP' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('GOING_TO_PICKUP');

    // ARRIVED_AT_PICKUP
    res = await request(app)
      .put(`/api/trip/${createdTripID}/status`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ status: 'ARRIVED_AT_PICKUP' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ARRIVED_AT_PICKUP');

    // PICKED_UP
    res = await request(app)
      .put(`/api/trip/${createdTripID}/status`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ status: 'PICKED_UP' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('PICKED_UP');

    // IN_TRANSIT
    res = await request(app)
      .put(`/api/trip/${createdTripID}/status`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ status: 'IN_TRANSIT' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('IN_TRANSIT');

    // ARRIVED_AT_DROP
    res = await request(app)
      .put(`/api/trip/${createdTripID}/status`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ status: 'ARRIVED_AT_DROP' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ARRIVED_AT_DROP');

    // DELIVERED
    res = await request(app)
      .put(`/api/trip/${createdTripID}/status`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ status: 'DELIVERED', finalOdometer: 10045, fuelConsumed: 12 });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('DELIVERED');
  });

  it('6. Invalid transition fails', async () => {
    // Attempting to transition DELIVERED -> GOING_TO_PICKUP
    const res = await request(app)
      .put(`/api/trip/${createdTripID}/status`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ status: 'GOING_TO_PICKUP' });

    expect(res.status).toBe(400);
  });
});
