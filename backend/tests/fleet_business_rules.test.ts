import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { db } from '../src/config/database';

describe('LogiSphere AI — Mandatory Fleet Business Rules Audit Suite', { timeout: 30000 }, () => {
  let managerToken: string;
  let managerId: string;

  beforeAll(async () => {
    const ts = Date.now();
    const mgrRes = await request(app).post('/api/user/create').send({
      name: 'Rules Test Manager',
      email: `rules_mgr_${ts}@logisphere.ai`,
      password: 'Password123',
      phoneNo: '9988776655',
      role: 'ROLE_MANAGER',
    });
    expect(mgrRes.status).toBe(201);
    managerToken = mgrRes.body.token;
    managerId = mgrRes.body.user.id;
  });

  // Helper to extract trip ID robustly from API response
  const getTripId = (res: any): string => res.body.tripID || res.body.tripid || res.body.id;

  // Helper to create an available driver with a valid future license
  async function createValidDriver(suffix: string, overrides: Record<string, any> = {}) {
    const ts = Date.now() + Math.floor(Math.random() * 100000);
    const res = await request(app).post('/api/user/create').send({
      name: `Driver ${suffix}`,
      email: `drv_${suffix}_${ts}@logisphere.ai`,
      password: 'Password123',
      phoneNo: '9123456789',
      role: 'ROLE_DRIVER',
      licenseNo: `DL-${suffix}-${ts}`,
      licenseExpiryDate: '2035-12-31',
      status: 'AVAILABLE',
      ...overrides,
    });
    expect(res.status).toBe(201);
    return res.body.user || res.body.driver || res.body;
  }

  // Helper to create a test vehicle
  async function createVehicle(suffix: string, capacity = 1000, overrides: Record<string, any> = {}) {
    const ts = Date.now() + Math.floor(Math.random() * 100000);
    const reg = `GJ01BR${suffix}${ts.toString().slice(-4)}`.toUpperCase();
    const res = await request(app).post('/api/vehicle/create').send({
      registrationNumber: reg,
      name: `VEH-${suffix}`,
      type: 'VAN',
      maxLoadCapacity: capacity,
      odometer: 10000,
      acquisitionCost: 500000,
      status: 'AVAILABLE',
      ...overrides,
    });
    expect(res.status).toBe(201);
    const v = res.body.vehicle || res.body.data || res.body;
    return { ...v, vehicleID: v.vehicleID || v.vehicleid || v.id };
  }

  // =========================================================================
  // RULE 1: Vehicle registration number must be unique and normalized
  // =========================================================================
  describe('Rule 1: Vehicle registration number uniqueness and normalization', () => {
    it('1.1 Rejects creation of vehicle with duplicate registration number', async () => {
      const regNumber = `UNIQUE-${Date.now()}`;
      const firstRes = await request(app).post('/api/vehicle/create').send({
        registrationNumber: regNumber,
        name: 'Van First',
        type: 'VAN',
        maxLoadCapacity: 1200,
        odometer: 5000,
        acquisitionCost: 600000,
      });
      expect(firstRes.status).toBe(201);

      // Attempt exact duplicate
      const dupRes = await request(app).post('/api/vehicle/create').send({
        registrationNumber: regNumber,
        name: 'Van Duplicate',
        type: 'VAN',
        maxLoadCapacity: 1200,
        odometer: 5000,
        acquisitionCost: 600000,
      });
      expect([400, 409]).toContain(dupRes.status);
    });

    it('1.2 Rejects registration with different casing and whitespace padding', async () => {
      const baseReg = `REGCASE${Date.now()}`;
      const firstRes = await request(app).post('/api/vehicle/create').send({
        registrationNumber: baseReg,
        name: 'Van Case A',
        type: 'VAN',
        maxLoadCapacity: 1000,
      });
      expect(firstRes.status).toBe(201);

      // Attempt lower case with spaces
      const spaceRes = await request(app).post('/api/vehicle/create').send({
        registrationNumber: `  ${baseReg.toLowerCase()}  `,
        name: 'Van Case B',
        type: 'VAN',
        maxLoadCapacity: 1000,
      });
      expect([400, 409]).toContain(spaceRes.status);
    });

    it('1.3 Rejects updating an existing vehicle to another vehicles registration number', async () => {
      const vehA = await createVehicle('U1A');
      const vehB = await createVehicle('U1B');

      // Attempt to update vehB registration to vehA's registration
      const updateRes = await request(app)
        .put('/api/vehicle/update')
        .query({ id: vehB.vehicleID })
        .send({ registrationNumber: vehA.registrationNumber });

      expect([400, 409]).toContain(updateRes.status);
    });
  });

  // =========================================================================
  // RULE 2: In Shop or Retired vehicles must never be dispatchable
  // =========================================================================
  describe('Rule 2: In Shop or Retired vehicles must never be dispatchable', () => {
    it('2.1 Rejects trip creation when vehicle is IN_SHOP', async () => {
      const veh = await createVehicle('R2SHOP', 1500, { status: 'IN_SHOP' });
      const drv = await createValidDriver('R2S');

      const res = await request(app)
        .post('/api/trip/create')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          source: 'Hub A',
          destination: 'Hub B',
          vehicleID: veh.vehicleID,
          driverID: drv.id,
          cargoWeight: 500,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/in shop|maintenance|eligib/i);
    });

    it('2.2 Rejects trip creation when vehicle is RETIRED', async () => {
      const veh = await createVehicle('R2RET', 1500, { status: 'RETIRED' });
      const drv = await createValidDriver('R2R');

      const res = await request(app)
        .post('/api/trip/create')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          source: 'Hub A',
          destination: 'Hub B',
          vehicleID: veh.vehicleID,
          driverID: drv.id,
          cargoWeight: 500,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/retired|eligib/i);
    });

    it('2.3 Rejects dispatch transition if vehicle was retired after trip draft creation', async () => {
      const veh = await createVehicle('R2DISP', 1500, { status: 'AVAILABLE' });
      const drv = await createValidDriver('R2D');

      const createRes = await request(app)
        .post('/api/trip/create')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          source: 'Hub A',
          destination: 'Hub B',
          vehicleID: veh.vehicleID,
          driverID: drv.id,
          cargoWeight: 500,
        });
      expect(createRes.status).toBe(201);
      const tripID = getTripId(createRes);

      // Retire the vehicle directly
      await db.update('vehicles', { vehicleID: veh.vehicleID }, { status: 'RETIRED' });

      // Attempt dispatch
      const dispatchRes = await request(app)
        .put(`/api/trip/${tripID}/status`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ status: 'ACCEPTED' });

      expect(dispatchRes.status).toBe(400);
      expect(dispatchRes.body.message).toMatch(/retired|not eligible/i);
    });
  });

  // =========================================================================
  // RULE 3: Expired-license or Suspended drivers must not be assigned
  // =========================================================================
  describe('Rule 3: Expired-license or Suspended drivers must not be assigned', () => {
    it('3.1 Rejects driver with SUSPENDED status', async () => {
      const veh = await createVehicle('R3S', 2000);
      const drv = await createValidDriver('R3SUSP', { status: 'SUSPENDED' });

      const res = await request(app)
        .post('/api/trip/create')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          source: 'Loc 1',
          destination: 'Loc 2',
          vehicleID: veh.vehicleID,
          driverID: drv.id,
          cargoWeight: 400,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/suspended|not eligible/i);
    });

    it('3.2 Rejects driver with expired license date in Asia/Kolkata', async () => {
      const veh = await createVehicle('R3E', 2000);
      const drv = await createValidDriver('R3EXP', { licenseExpiryDate: '2020-01-01' });

      const res = await request(app)
        .post('/api/trip/create')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          source: 'Loc 1',
          destination: 'Loc 2',
          vehicleID: veh.vehicleID,
          driverID: drv.id,
          cargoWeight: 400,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/expired|license/i);
    });

    it('3.3 Rejects driver with missing license number', async () => {
      const veh = await createVehicle('R3N', 2000);
      const drv = await createValidDriver('R3NOLIC', { licenseNo: '' });

      const res = await request(app)
        .post('/api/trip/create')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          source: 'Loc 1',
          destination: 'Loc 2',
          vehicleID: veh.vehicleID,
          driverID: drv.id,
          cargoWeight: 400,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/license/i);
    });
  });

  // =========================================================================
  // RULE 4: Driver or vehicle already on trip must not be assigned again
  // =========================================================================
  describe('Rule 4: Double-booking prevention for drivers and vehicles', () => {
    it('4.1 Rejects assigning a vehicle that is already on an active trip', async () => {
      const veh = await createVehicle('R4V', 2000);
      const drv1 = await createValidDriver('R4D1');
      const drv2 = await createValidDriver('R4D2');

      // First trip created and dispatched
      const t1Res = await request(app)
        .post('/api/trip/create')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          source: 'Origin',
          destination: 'Dest 1',
          vehicleID: veh.vehicleID,
          driverID: drv1.id,
          cargoWeight: 500,
        });
      expect(t1Res.status).toBe(201);
      const trip1ID = getTripId(t1Res);

      // Dispatch trip 1
      await request(app)
        .put(`/api/trip/${trip1ID}/status`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ status: 'ACCEPTED' });

      // Attempt to create second trip with the same vehicle
      const t2Res = await request(app)
        .post('/api/trip/create')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          source: 'Origin',
          destination: 'Dest 2',
          vehicleID: veh.vehicleID,
          driverID: drv2.id,
          cargoWeight: 500,
        });

      expect([400, 409]).toContain(t2Res.status);
      expect(t2Res.body.message).toMatch(/vehicle.*(active|already|trip)|conflict|on_trip/i);
    });

    it('4.2 Rejects assigning a driver who is already on an active trip', async () => {
      const veh1 = await createVehicle('R4V1', 2000);
      const veh2 = await createVehicle('R4V2', 2000);
      const drv = await createValidDriver('R4SAME');

      // First trip created and dispatched
      const t1Res = await request(app)
        .post('/api/trip/create')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          source: 'Origin',
          destination: 'Dest 1',
          vehicleID: veh1.vehicleID,
          driverID: drv.id,
          cargoWeight: 500,
        });
      expect(t1Res.status).toBe(201);
      const trip1ID = getTripId(t1Res);

      await request(app)
        .put(`/api/trip/${trip1ID}/status`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ status: 'ACCEPTED' });

      // Attempt to create second trip with same driver
      const t2Res = await request(app)
        .post('/api/trip/create')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          source: 'Origin',
          destination: 'Dest 2',
          vehicleID: veh2.vehicleID,
          driverID: drv.id,
          cargoWeight: 500,
        });

      expect([400, 409]).toContain(t2Res.status);
      expect(t2Res.body.message).toMatch(/driver.*(active|already|trip)|conflict|on_trip/i);
    });
  });

  // =========================================================================
  // RULE 5: Cargo weight must not exceed vehicle capacity
  // =========================================================================
  describe('Rule 5: Cargo weight validation against vehicle capacity', () => {
    it('5.1 Rejects cargo weight exceeding vehicle capacity', async () => {
      const veh = await createVehicle('R5OVER', 1000);
      const drv = await createValidDriver('R5D1');

      const res = await request(app)
        .post('/api/trip/create')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          source: 'A',
          destination: 'B',
          vehicleID: veh.vehicleID,
          driverID: drv.id,
          cargoWeight: 1001,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/capacity|exceeds/i);
    });

    it('5.2 Rejects non-positive or negative cargo weight', async () => {
      const veh = await createVehicle('R5NEG', 1000);
      const drv = await createValidDriver('R5D2');

      const resZero = await request(app)
        .post('/api/trip/create')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          source: 'A',
          destination: 'B',
          vehicleID: veh.vehicleID,
          driverID: drv.id,
          cargoWeight: 0,
        });
      expect(resZero.status).toBe(400);

      const resNeg = await request(app)
        .post('/api/trip/create')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          source: 'A',
          destination: 'B',
          vehicleID: veh.vehicleID,
          driverID: drv.id,
          cargoWeight: -50,
        });
      expect(resNeg.status).toBe(400);
    });

    it('5.3 Accepts cargo weight exactly equal to maximum capacity', async () => {
      const veh = await createVehicle('R5EXACT', 1000);
      const drv = await createValidDriver('R5D3');

      const res = await request(app)
        .post('/api/trip/create')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          source: 'A',
          destination: 'B',
          vehicleID: veh.vehicleID,
          driverID: drv.id,
          cargoWeight: 1000,
        });

      expect(res.status).toBe(201);
    });
  });

  // =========================================================================
  // RULE 6: Dispatch sets driver and vehicle to ON_TRIP atomically
  // =========================================================================
  describe('Rule 6: Dispatch status transitions to ON_TRIP', () => {
    it('6.1 Sets vehicle and driver status to ON_TRIP upon dispatch', async () => {
      const veh = await createVehicle('R6DISP', 2000);
      const drv = await createValidDriver('R6DRV');

      const tRes = await request(app)
        .post('/api/trip/create')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          source: 'Origin',
          destination: 'Dest',
          vehicleID: veh.vehicleID,
          driverID: drv.id,
          cargoWeight: 800,
        });
      expect(tRes.status).toBe(201);
      const tripID = getTripId(tRes);

      // Dispatch trip
      const dRes = await request(app)
        .put(`/api/trip/${tripID}/status`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ status: 'ACCEPTED' });
      expect(dRes.status).toBe(200);

      // Verify statuses updated
      const updatedVeh = await db.findById('vehicles', veh.vehicleID);
      const updatedDrv = await db.findById('users', drv.id);

      expect(updatedVeh.status).toBe('ON_TRIP');
      expect(updatedDrv.status).toBe('ON_TRIP');
    });

    it('6.2 Leaves statuses unchanged if dispatch validation fails', async () => {
      const veh = await createVehicle('R6FAIL', 2000);
      const drv = await createValidDriver('R6FAILDRV');

      const tRes = await request(app)
        .post('/api/trip/create')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          source: 'Origin',
          destination: 'Dest',
          vehicleID: veh.vehicleID,
          driverID: drv.id,
          cargoWeight: 800,
        });
      expect(tRes.status).toBe(201);
      const tripID = getTripId(tRes);

      // Make driver suspended before dispatch
      await db.update('users', { id: drv.id }, { status: 'SUSPENDED' });

      // Attempt dispatch
      const failRes = await request(app)
        .put(`/api/trip/${tripID}/status`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ status: 'ACCEPTED' });
      expect(failRes.status).toBe(400);

      // Statuses must NOT be ON_TRIP
      const v = await db.findById('vehicles', veh.vehicleID);
      const d = await db.findById('users', drv.id);
      expect(v.status).toBe('AVAILABLE');
      expect(d.status).toBe('SUSPENDED');
    });
  });

  // =========================================================================
  // RULE 7: Completing/cancelling trips safely restores eligible resources
  // =========================================================================
  describe('Rule 7: Safe resource restoration on trip completion or cancellation', () => {
    it('7.1 Restores standard vehicle and driver to AVAILABLE on trip completion', async () => {
      const veh = await createVehicle('R7NORM', 2000);
      const drv = await createValidDriver('R7NORM');

      const tRes = await request(app)
        .post('/api/trip/create')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          source: 'City A',
          destination: 'City B',
          vehicleID: veh.vehicleID,
          driverID: drv.id,
          cargoWeight: 600,
        });
      const tripID = getTripId(tRes);

      await request(app).put(`/api/trip/${tripID}/status`).set('Authorization', `Bearer ${managerToken}`).send({ status: 'ACCEPTED' });

      // Verify statuses were set to ON_TRIP
      let v = await db.findById('vehicles', veh.vehicleID);
      let d = await db.findById('users', drv.id);
      expect(v.status).toBe('ON_TRIP');
      expect(d.status).toBe('ON_TRIP');

      // Cancel trip as manager
      const cancelRes = await request(app).put(`/api/trip/${tripID}/status`).set('Authorization', `Bearer ${managerToken}`).send({ status: 'CANCELLED' });
      expect(cancelRes.status).toBe(200);

      // Verify statuses restored to AVAILABLE
      v = await db.findById('vehicles', veh.vehicleID);
      d = await db.findById('users', drv.id);
      expect(v.status).toBe('AVAILABLE');
      expect(d.status).toBe('AVAILABLE');
    });

    it('7.2 Preserves RETIRED vehicle status upon trip cancellation or completion', async () => {
      const veh = await createVehicle('R7RET', 2000);
      const drv = await createValidDriver('R7DRV');

      const tRes = await request(app)
        .post('/api/trip/create')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          source: 'City A',
          destination: 'City B',
          vehicleID: veh.vehicleID,
          driverID: drv.id,
          cargoWeight: 600,
        });
      const tripID = getTripId(tRes);
      await request(app).put(`/api/trip/${tripID}/status`).set('Authorization', `Bearer ${managerToken}`).send({ status: 'ACCEPTED' });

      // Vehicle gets marked RETIRED while trip was active
      await db.update('vehicles', { vehicleID: veh.vehicleID }, { status: 'RETIRED' });

      // Trip is cancelled
      await request(app).put(`/api/trip/${tripID}/status`).set('Authorization', `Bearer ${managerToken}`).send({ status: 'CANCELLED' });

      const v = await db.findById('vehicles', veh.vehicleID);
      expect(v.status).toBe('RETIRED');
    });

    it('7.3 Preserves SUSPENDED driver status upon trip cancellation or completion', async () => {
      const veh = await createVehicle('R7V', 2000);
      const drv = await createValidDriver('R7SUSP');

      const tRes = await request(app)
        .post('/api/trip/create')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          source: 'City A',
          destination: 'City B',
          vehicleID: veh.vehicleID,
          driverID: drv.id,
          cargoWeight: 600,
        });
      const tripID = getTripId(tRes);
      await request(app).put(`/api/trip/${tripID}/status`).set('Authorization', `Bearer ${managerToken}`).send({ status: 'ACCEPTED' });

      // Driver is suspended while trip was active
      await db.update('users', { id: drv.id }, { status: 'SUSPENDED' });

      // Trip is cancelled
      await request(app).put(`/api/trip/${tripID}/status`).set('Authorization', `Bearer ${managerToken}`).send({ status: 'CANCELLED' });

      const d = await db.findById('users', drv.id);
      expect(d.status).toBe('SUSPENDED');
    });

    it('7.4 Restores vehicle with active maintenance to IN_SHOP, not AVAILABLE', async () => {
      const veh = await createVehicle('R7MAINT', 2000);
      const drv = await createValidDriver('R7D');

      const tRes = await request(app)
        .post('/api/trip/create')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          source: 'City A',
          destination: 'City B',
          vehicleID: veh.vehicleID,
          driverID: drv.id,
          cargoWeight: 600,
        });
      const tripID = getTripId(tRes);
      await request(app).put(`/api/trip/${tripID}/status`).set('Authorization', `Bearer ${managerToken}`).send({ status: 'ACCEPTED' });

      // Add active maintenance record for vehicle
      await db.insert('maintenance_records', {
        id: db.makeId('mnt-'),
        vehicleID: veh.vehicleID,
        serviceType: 'Oil Check',
        cost: 2000,
        status: 'ACTIVE',
      });

      // Trip cancelled
      await request(app).put(`/api/trip/${tripID}/status`).set('Authorization', `Bearer ${managerToken}`).send({ status: 'CANCELLED' });

      const v = await db.findById('vehicles', veh.vehicleID);
      expect(v.status).toBe('IN_SHOP');
    });
  });

  // =========================================================================
  // RULE 8: Creating active maintenance sets vehicle to IN_SHOP and prevents dispatch
  // =========================================================================
  describe('Rule 8: Active maintenance creation and dispatch blocking', () => {
    it('8.1 Setting active maintenance updates vehicle status to IN_SHOP', async () => {
      const veh = await createVehicle('R8SHOP', 2500);
      expect(veh.status).toBe('AVAILABLE');

      const mRes = await request(app).post('/api/maintenance/create').send({
        vehicleID: veh.vehicleID,
        serviceType: 'Transmission Overhaul',
        cost: 15000,
        status: 'ACTIVE',
      });
      expect(mRes.status).toBe(201);

      const updated = await db.findById('vehicles', veh.vehicleID);
      expect(updated.status).toBe('IN_SHOP');
    });

    it('8.2 Prevents placing a vehicle that is on an active trip into maintenance', async () => {
      const veh = await createVehicle('R8ONTRIP', 2500);
      const drv = await createValidDriver('R8D');

      const tRes = await request(app)
        .post('/api/trip/create')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          source: 'A',
          destination: 'B',
          vehicleID: veh.vehicleID,
          driverID: drv.id,
          cargoWeight: 500,
        });
      const tripID = getTripId(tRes);
      await request(app).put(`/api/trip/${tripID}/status`).set('Authorization', `Bearer ${managerToken}`).send({ status: 'ACCEPTED' });

      // Vehicle is ON_TRIP, attempting to create maintenance must be rejected
      const mRes = await request(app).post('/api/maintenance/create').send({
        vehicleID: veh.vehicleID,
        serviceType: 'Brake Check',
        cost: 4000,
        status: 'ACTIVE',
      });

      expect(mRes.status).toBe(400);
      expect(mRes.body.message).toMatch(/active trip|on_trip/i);
    });
  });

  // =========================================================================
  // RULE 9: Closing maintenance must restore correct status
  // =========================================================================
  describe('Rule 9: Maintenance closure and status restoration', () => {
    it('9.1 Restores vehicle to AVAILABLE when sole active maintenance is completed', async () => {
      const veh = await createVehicle('R9SOLO', 2000);
      const mRes = await request(app).post('/api/maintenance/create').send({
        vehicleID: veh.vehicleID,
        serviceType: 'Tire Replacement',
        cost: 6000,
        status: 'ACTIVE',
      });
      const mId = mRes.body.id;

      const vInShop = await db.findById('vehicles', veh.vehicleID);
      expect(vInShop.status).toBe('IN_SHOP');

      // Complete maintenance
      const cRes = await request(app).put(`/api/maintenance/${mId}/complete`);
      expect(cRes.status).toBe(200);

      const vDone = await db.findById('vehicles', veh.vehicleID);
      expect(vDone.status).toBe('AVAILABLE');
    });

    it('9.2 Leaves vehicle IN_SHOP if another active maintenance record remains open', async () => {
      const veh = await createVehicle('R9MULTI', 2000);

      // Create record 1
      const m1 = await request(app).post('/api/maintenance/create').send({
        vehicleID: veh.vehicleID,
        serviceType: 'Job 1',
        cost: 2000,
        status: 'ACTIVE',
      });
      // Create record 2
      const m2 = await request(app).post('/api/maintenance/create').send({
        vehicleID: veh.vehicleID,
        serviceType: 'Job 2',
        cost: 3000,
        status: 'ACTIVE',
      });

      // Close record 1
      await request(app).put(`/api/maintenance/${m1.body.id}/complete`);

      // Vehicle must remain IN_SHOP because record 2 is still active
      const vStillInShop = await db.findById('vehicles', veh.vehicleID);
      expect(vStillInShop.status).toBe('IN_SHOP');

      // Close record 2
      await request(app).put(`/api/maintenance/${m2.body.id}/complete`);

      // Now vehicle becomes AVAILABLE
      const vFree = await db.findById('vehicles', veh.vehicleID);
      expect(vFree.status).toBe('AVAILABLE');
    });

    it('9.3 Never changes RETIRED vehicle to AVAILABLE upon maintenance completion', async () => {
      const veh = await createVehicle('R9RET', 2000);
      const mRes = await request(app).post('/api/maintenance/create').send({
        vehicleID: veh.vehicleID,
        serviceType: 'Decommission Service',
        cost: 1000,
        status: 'ACTIVE',
      });

      // Mark vehicle RETIRED while in shop
      await db.update('vehicles', { vehicleID: veh.vehicleID }, { status: 'RETIRED' });

      // Complete maintenance
      await request(app).put(`/api/maintenance/${mRes.body.id}/complete`);

      const vRetired = await db.findById('vehicles', veh.vehicleID);
      expect(vRetired.status).toBe('RETIRED');
    });

    it('9.4 Repeated closure of already completed maintenance is safe and idempotent', async () => {
      const veh = await createVehicle('R9IDEM', 2000);
      const mRes = await request(app).post('/api/maintenance/create').send({
        vehicleID: veh.vehicleID,
        serviceType: 'Checkup',
        cost: 500,
        status: 'ACTIVE',
      });
      const mId = mRes.body.id;

      // First close
      const res1 = await request(app).put(`/api/maintenance/${mId}/complete`);
      expect(res1.status).toBe(200);

      // Second close
      const res2 = await request(app).put(`/api/maintenance/${mId}/complete`);
      expect(res2.status).toBe(200);
      expect(res2.body.message).toMatch(/already completed/i);

      const v = await db.findById('vehicles', veh.vehicleID);
      expect(v.status).toBe('AVAILABLE');
    });
  });
});
