import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../../backend/src/app';

describe('TC-TRIP-03: Trip Lifecycle Complete Status Progression', () => {
  it('progresses trip through all lifecycle stages: ACCEPTED -> GOING_TO_PICKUP -> ARRIVED_AT_PICKUP -> PICKED_UP -> IN_TRANSIT -> ARRIVED_AT_DROP -> DELIVERED', async () => {
    const timestamp = Date.now();

    // 1. Setup Manager & Driver
    const mgrRes = await request(app).post('/api/user/create').send({
      name: 'TC3 Manager',
      email: `tc3_mgr_${timestamp}@logisphere.ai`,
      password: 'Password123',
      phoneNo: '9988776651',
      role: 'ROLE_MANAGER',
    });
    expect(mgrRes.status).toBe(201);
    const mgrToken = mgrRes.body.token;

    const drvRes = await request(app).post('/api/user/create').send({
      name: 'TC3 Driver',
      email: `tc3_drv_${timestamp}@logisphere.ai`,
      password: 'Password123',
      phoneNo: '9988776652',
      role: 'ROLE_DRIVER',
      licenseNo: `DL-TC3-${timestamp}`,
      licenseExpiryDate: '2030-01-01',
    });
    expect(drvRes.status).toBe(201);
    const drvToken = drvRes.body.token;
    const drvId = drvRes.body.user.id;

    // 2. Setup Vehicle
    const vehRes = await request(app).post('/api/vehicle/create').send({
      registrationNumber: `GJ01TC${timestamp.toString().slice(-4)}`,
      name: 'TC3-TRUCK',
      type: 'TRUCK',
      maxLoadCapacity: 3000,
      odometer: 15000,
      acquisitionCost: 900000,
    });
    expect(vehRes.status).toBe(201);
    const vehData = vehRes.body.vehicle || vehRes.body;
    const vehId = vehData.vehicleID || vehData.id;

    // 3. Manager creates trip -> PENDING_APPROVAL
    const createRes = await request(app)
      .post('/api/trip/create')
      .set('Authorization', `Bearer ${mgrToken}`)
      .send({
        source: 'Ahmedabad Warehouse',
        destination: 'Surat Terminal',
        cargoWeight: 1200,
        plannedDistance: 270,
        startingOdometer: 15000,
        vehicleID: vehId,
        driverID: drvId,
      });
    expect(createRes.status).toBe(201);
    const tripId = createRes.body.tripID || createRes.body.id;
    expect(tripId).toBeTruthy();

    // 4. Manager dispatches trip -> ACCEPTED
    const acceptRes = await request(app)
      .put(`/api/trip/dispatch/${tripId}`)
      .set('Authorization', `Bearer ${mgrToken}`)
      .send();
    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.status).toBe('ACCEPTED');

    // 5. Driver updates status: GOING_TO_PICKUP
    const s1 = await request(app)
      .put(`/api/trip/${tripId}/status`)
      .set('Authorization', `Bearer ${drvToken}`)
      .send({ status: 'GOING_TO_PICKUP' });
    expect(s1.status).toBe(200);
    expect(s1.body.status).toBe('GOING_TO_PICKUP');

    // 6. Driver updates status: ARRIVED_AT_PICKUP
    const s2 = await request(app)
      .put(`/api/trip/${tripId}/status`)
      .set('Authorization', `Bearer ${drvToken}`)
      .send({ status: 'ARRIVED_AT_PICKUP' });
    expect(s2.status).toBe(200);
    expect(s2.body.status).toBe('ARRIVED_AT_PICKUP');

    // 7. Driver updates status: PICKED_UP
    const s3 = await request(app)
      .put(`/api/trip/${tripId}/status`)
      .set('Authorization', `Bearer ${drvToken}`)
      .send({ status: 'PICKED_UP' });
    expect(s3.status).toBe(200);
    expect(s3.body.status).toBe('PICKED_UP');

    // 8. Driver updates status: IN_TRANSIT
    const s4 = await request(app)
      .put(`/api/trip/${tripId}/status`)
      .set('Authorization', `Bearer ${drvToken}`)
      .send({ status: 'IN_TRANSIT' });
    expect(s4.status).toBe(200);
    expect(s4.body.status).toBe('IN_TRANSIT');

    // 9. Driver updates status: ARRIVED_AT_DROP
    const s5 = await request(app)
      .put(`/api/trip/${tripId}/status`)
      .set('Authorization', `Bearer ${drvToken}`)
      .send({ status: 'ARRIVED_AT_DROP' });
    expect(s5.status).toBe(200);
    expect(s5.body.status).toBe('ARRIVED_AT_DROP');

    // 10. Driver completes delivery: DELIVERED
    const s6 = await request(app)
      .put(`/api/trip/${tripId}/status`)
      .set('Authorization', `Bearer ${drvToken}`)
      .send({ status: 'DELIVERED', finalOdometer: 15275, fuelConsumed: 42 });
    expect(s6.status).toBe(200);
    expect(s6.body.status).toBe('DELIVERED');
  }, 25000);
});
