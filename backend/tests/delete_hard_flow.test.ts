import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app';

describe('Permanent Hard Delete Flow Tests for Drivers & Vehicles', () => {
  it('1. Create Driver and verify PERMANENT HARD DELETE removes record from database', async () => {
    const driverEmail = `delete_driver_${Date.now()}@logisphere.ai`;
    // Create Driver
    const createRes = await request(app).post('/api/user/create').send({
      name: 'Temp Delete Driver',
      email: driverEmail,
      phoneNo: '9998887770',
      licenseNo: `DL-DEL-${Date.now()}`,
      licenseExpiryDate: '12/2030',
      role: 'ROLE_DRIVER',
      status: 'AVAILABLE',
    });

    expect(createRes.status).toBe(201);
    expect(createRes.body.user).toBeDefined();
    const driverId = createRes.body.user.id;

    // Execute HARD DELETE
    const deleteRes = await request(app).delete('/api/user/delete').query({ id: driverId });
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);

    // Verify row is PERMANENTLY GONE from DB
    const listRes = await request(app).get('/api/user?role=ROLE_DRIVER');
    expect(listRes.status).toBe(200);
    const found = (listRes.body || []).find((d: any) => d.id === driverId || d.email === driverEmail);
    expect(found).toBeUndefined();
  });

  it('2. Create Driver with ACTIVE TRIP and verify DELETE is BLOCKED with 409 Conflict', async () => {
    const activeDriverEmail = `active_driver_${Date.now()}@logisphere.ai`;
    const vehReg = `VACT-${Math.floor(1000 + Math.random() * 9000)}`;

    // Create Driver
    const createDrvRes = await request(app).post('/api/user/create').send({
      name: 'Active Trip Driver',
      email: activeDriverEmail,
      phoneNo: '9998887771',
      licenseNo: `DL-ACT-${Date.now()}`,
      licenseExpiryDate: '12/2030',
      role: 'ROLE_DRIVER',
      status: 'AVAILABLE',
    });
    expect(createDrvRes.status).toBe(201);
    const actDriverId = createDrvRes.body.user.id;

    // Create Vehicle
    const createVehRes = await request(app).post('/api/vehicle/create').send({
      vehicleID: `veh-act-${Date.now().toString(36)}`,
      registrationNumber: vehReg,
      name: 'Active Test Vehicle',
      type: 'VAN',
      maxLoadCapacity: 1000,
      odometer: 1000,
      acquisitionCost: 200000,
      status: 'AVAILABLE',
    });
    expect(createVehRes.status).toBe(201);
    const actVehId = createVehRes.body.vehicle.vehicleID;

    // Create Active Trip for Driver
    const tripRes = await request(app).post('/api/trip/create').send({
      source: 'Depot A',
      destination: 'Hub B',
      driverID: actDriverId,
      vehicleID: actVehId,
      cargoWeight: 500,
      plannedDistance: 50,
      startingOdometer: 1000,
      status: 'ACCEPTED',
    });
    expect(tripRes.status).toBe(201);

    // Attempt DELETE -> Must be BLOCKED with 409
    const deleteRes = await request(app).delete('/api/user/delete').query({ id: actDriverId });
    expect(deleteRes.status).toBe(409);
    expect(deleteRes.body.success).toBe(false);
    expect(deleteRes.body.message).toContain('active trip');
  });

  it('3. Create Vehicle and verify PERMANENT HARD DELETE removes record from database', async () => {
    const vehicleId = `veh-del-${Date.now().toString(36)}`;
    const regNo = `DEL-${Math.floor(1000 + Math.random() * 9000)}`;

    // Create Vehicle
    const createRes = await request(app).post('/api/vehicle/create').send({
      vehicleID: vehicleId,
      registrationNumber: regNo,
      name: 'Delete Test Van',
      type: 'VAN',
      maxLoadCapacity: 1000,
      odometer: 15000,
      acquisitionCost: 500000,
      status: 'AVAILABLE',
    });

    expect(createRes.status).toBe(201);
    expect(createRes.body.vehicle).toBeDefined();

    // Execute HARD DELETE
    const deleteRes = await request(app).delete('/api/vehicle/delete/').query({ id: vehicleId });
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);

    // Verify row is PERMANENTLY GONE from DB
    const listRes = await request(app).get('/api/vehicle/');
    expect(listRes.status).toBe(200);
    const found = (listRes.body || []).find((v: any) => v.vehicleID === vehicleId || v.registrationNumber === regNo);
    expect(found).toBeUndefined();
  });

  it('4. Create Vehicle with ACTIVE TRIP and verify DELETE is BLOCKED with 409 Conflict', async () => {
    const activeVehId = `veh-act2-${Date.now().toString(36)}`;
    const activeReg = `ACT2-${Math.floor(1000 + Math.random() * 9000)}`;
    const driverEmail = `veh_driver_${Date.now()}@logisphere.ai`;

    // Create Driver
    const createDrvRes = await request(app).post('/api/user/create').send({
      name: 'Veh Driver Test',
      email: driverEmail,
      phoneNo: '9998887772',
      licenseNo: `DL-VEH-${Date.now()}`,
      licenseExpiryDate: '12/2030',
      role: 'ROLE_DRIVER',
      status: 'AVAILABLE',
    });
    expect(createDrvRes.status).toBe(201);
    const actDriverId = createDrvRes.body.user.id;

    // Create Vehicle
    const createRes = await request(app).post('/api/vehicle/create').send({
      vehicleID: activeVehId,
      registrationNumber: activeReg,
      name: 'Active Trip Vehicle',
      type: 'TRUCK',
      maxLoadCapacity: 5000,
      odometer: 20000,
      acquisitionCost: 1200000,
      status: 'AVAILABLE',
    });
    expect(createRes.status).toBe(201);

    // Create Active Trip for Vehicle
    const tripRes = await request(app).post('/api/trip/create').send({
      source: 'Warehouse X',
      destination: 'Outlet Y',
      driverID: actDriverId,
      vehicleID: activeVehId,
      cargoWeight: 2000,
      plannedDistance: 120,
      startingOdometer: 20000,
      status: 'IN_TRANSIT',
    });
    expect(tripRes.status).toBe(201);

    // Attempt DELETE -> Must be BLOCKED with 409
    const deleteRes = await request(app).delete('/api/vehicle/delete/').query({ id: activeVehId });
    expect(deleteRes.status).toBe(409);
    expect(deleteRes.body.success).toBe(false);
    expect(deleteRes.body.message).toContain('active trip');
  });
});
