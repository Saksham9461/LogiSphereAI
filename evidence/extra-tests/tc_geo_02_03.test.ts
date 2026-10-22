import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../../backend/src/app';

describe('TC-GEO-02 & TC-GEO-03: Geofence Attendance Enforcement & Exception Handling', () => {
  it('TC-GEO-02: rejects clock-in outside geofence boundary without active trip exception', async () => {
    const timestamp = Date.now();
    const drvEmail = `tc_geo_drv_${timestamp}@logisphere.ai`;

    // 1. Create Driver without active trip
    const drvRes = await request(app).post('/api/user/create').send({
      name: 'Geo Driver 1',
      email: drvEmail,
      password: 'Password123',
      phoneNo: '9988112233',
      role: 'ROLE_DRIVER',
      licenseNo: `DL-GEO-${timestamp}`,
      licenseExpiryDate: '2030-01-01',
    });
    expect(drvRes.status).toBe(201);
    const drvToken = drvRes.body.token;

    // 2. Attempt clock-in far outside geofence (Mumbai: 19.0760, 72.8777 vs Ahmedabad: 23.05288, 72.61891, ~440km away)
    const clockInRes = await request(app)
      .post('/api/attendance/clock-in')
      .set('Authorization', `Bearer ${drvToken}`)
      .send({
        latitude: 19.0760,
        longitude: 72.8777,
        locationName: 'Mumbai Highway',
      });

    // 3. Must fail with 400 Bad Request indicating geofence violation
    expect(clockInRes.status).toBe(400);
    expect(clockInRes.body.success).toBe(false);
    expect(clockInRes.body.message).toMatch(/outside the authorized geofence boundary/i);
  });

  it('TC-GEO-03: allows clock-in outside geofence when driver has an active authorized trip and provides location reason', async () => {
    const timestamp = Date.now();

    // 1. Create Manager & Driver
    const mgrRes = await request(app).post('/api/user/create').send({
      name: 'Geo Manager 2',
      email: `tc_geo_mgr2_${timestamp}@logisphere.ai`,
      password: 'Password123',
      phoneNo: '9988112244',
      role: 'ROLE_MANAGER',
    });
    expect(mgrRes.status).toBe(201);
    const mgrToken = mgrRes.body.token;

    const drvRes = await request(app).post('/api/user/create').send({
      name: 'Geo Driver 2',
      email: `tc_geo_drv2_${timestamp}@logisphere.ai`,
      password: 'Password123',
      phoneNo: '9988112255',
      role: 'ROLE_DRIVER',
      licenseNo: `DL-GEO2-${timestamp}`,
      licenseExpiryDate: '2030-01-01',
    });
    expect(drvRes.status).toBe(201);
    const drvToken = drvRes.body.token;
    const drvId = drvRes.body.user.id;

    // 2. Create vehicle & trip
    const vehRes = await request(app).post('/api/vehicle/create').send({
      registrationNumber: `GJ01GE${timestamp.toString().slice(-4)}`,
      name: 'GEO-TRUCK',
      type: 'TRUCK',
      maxLoadCapacity: 4000,
      odometer: 20000,
      acquisitionCost: 1000000,
    });
    expect(vehRes.status).toBe(201);
    const vehId = vehRes.body.vehicle?.vehicleID || vehRes.body.vehicle?.id || vehRes.body.vehicleID || vehRes.body.id;

    const tripRes = await request(app)
      .post('/api/trip/create')
      .set('Authorization', `Bearer ${mgrToken}`)
      .send({
        source: 'Ahmedabad HQ',
        destination: 'Vadodara Station',
        cargoWeight: 1500,
        plannedDistance: 110,
        startingOdometer: 20000,
        vehicleID: vehId,
        driverID: drvId,
      });
    expect(tripRes.status).toBe(201);
    const tripId = tripRes.body.tripID || tripRes.body.id;

    // Dispatch trip to activate it
    await request(app)
      .put(`/api/trip/dispatch/${tripId}`)
      .set('Authorization', `Bearer ${mgrToken}`)
      .send();

    // 3. Driver clocks in outside geofence with active trip exception
    const clockInRes = await request(app)
      .post('/api/attendance/clock-in')
      .set('Authorization', `Bearer ${drvToken}`)
      .send({
        latitude: 22.3072, // Vadodara (~100km away)
        longitude: 73.1812,
        locationName: 'Vadodara Transit Hub',
        tripId: tripId,
        locationDescription: 'Dispatched on active trip to Vadodara',
      });

    expect(clockInRes.status).toBe(201);
    expect(clockInRes.body.success).toBe(true);
    expect(clockInRes.body.record.isGeofenceException || clockInRes.body.data.isException).toBe(true);
    expect(clockInRes.body.record.tripId || clockInRes.body.data.tripId).toBe(tripId);
  }, 25000);
});
