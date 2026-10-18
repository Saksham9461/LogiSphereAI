import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { db } from '../src/config/database';
import { signToken } from '../src/middleware/auth';

describe('AI Fleet Intelligence Assistant Integration Tests', () => {
  let managerToken: string;
  let driverToken: string;
  let driverUser: any;
  let testVehicle: any;
  let testTrip: any;

  beforeAll(async () => {
    // 1. Manager user
    const managerUser = {
      id: `mgr-test-${Date.now()}`,
      name: 'Manager Ops',
      email: `mgr-${Date.now()}@logisphere.ai`,
      role: 'ROLE_MANAGER',
    };
    await db.insert('users', managerUser);
    managerToken = signToken(managerUser);

    // 2. Driver user
    driverUser = {
      id: `drv-ai-test-${Date.now()}`,
      name: 'Driver Alex',
      email: `driver-ai-${Date.now()}@logisphere.ai`,
      role: 'ROLE_DRIVER',
    };
    await db.insert('users', driverUser);
    driverToken = signToken(driverUser);

    // 3. Test Vehicle
    testVehicle = {
      vehicleID: `veh-ai-${Date.now()}`,
      name: 'Van-Ai-01',
      registrationNumber: `GJ01AI${Math.floor(1000 + Math.random() * 8999)}`,
      type: 'VAN',
      status: 'ON_TRIP',
      odometer: 1500,
    };
    await db.insert('vehicles', testVehicle);

    // 4. Test Trip assigned to Driver
    testTrip = {
      tripID: `TRP-AI-${Math.floor(1000 + Math.random() * 9000)}`,
      source: 'Gandhinagar Hub, Gujarat',
      destination: 'Ahmedabad Depot, Gujarat',
      vehicleID: testVehicle.vehicleID,
      driverID: driverUser.id,
      status: 'IN_TRANSIT',
      cargoWeight: 450,
      plannedDistance: 32,
    };
    await db.insert('trips', testTrip);

    // 5. Test Tracking location
    await db.insert('tracking_locations', {
      tripID: testTrip.tripID,
      vehicleID: testVehicle.vehicleID,
      latitude: 23.18,
      longitude: 72.61,
      speed: 48,
      status: 'MOVING',
      timestamp: new Date().toISOString(),
    });

    // 6. Test Attendance for Driver
    await db.insert('attendance_records', {
      id: `att-ai-${Date.now()}`,
      userId: driverUser.id,
      date: new Date().toISOString().slice(0, 10),
      clockInTime: '08:30 AM',
      locationName: 'Gandhinagar Depot',
      status: 'Verified',
    });
  });

  it('1. Unauthenticated request to /api/ai/query returns 401', async () => {
    const res = await request(app)
      .post('/api/ai/query')
      .send({ query: 'Show active vehicles' });
    expect(res.status).toBe(401);
  });

  it('2. Manager querying active vehicles receives concise, bounded response', async () => {
    const res = await request(app)
      .post('/api/ai/query')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ query: 'Show active vehicles' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/(vehicle is currently on route|vehicles are currently on route)/);
    expect(res.body.metrics).toBeDefined();
    expect(res.body.actions).toBeDefined();
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.context?.lastSubjectType).toBe('vehicle');
  });

  it('3. Manager querying completed trips receives concise count', async () => {
    const res = await request(app)
      .post('/api/ai/query')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ query: 'How many trips were completed today?' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/trips? completed today/);
    expect(res.body.type).toBe('metric');
  });

  it('4. Manager querying maintenance receives concise status', async () => {
    const res = await request(app)
      .post('/api/ai/query')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ query: 'Any upcoming maintenance?' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/(maintenance soon|need maintenance soon|No vehicles need maintenance soon)/);
  });

  it('5. Conversation context resolves pronoun "Where is it?" to previous vehicle', async () => {
    const res = await request(app)
      .post('/api/ai/query')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        query: 'Where is it?',
        context: {
          lastSubjectType: 'vehicle',
          lastSubjectId: testVehicle.vehicleID,
          lastSubjectName: testVehicle.name,
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.type).toBe('tracking');
    expect(res.body.message).toContain(testVehicle.name);
    expect(res.body.actions.some((a: any) => a.actionType === 'track_vehicle')).toBe(true);
  });

  it('6. Driver requesting manager-restricted fleet analytics is blocked politely', async () => {
    const res = await request(app)
      .post('/api/ai/query')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ query: 'Show active vehicles' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.intent).toBe('RESTRICTED_ACCESS');
    expect(res.body.message).toContain('restricted to Managers');
  });

  it('7. Driver can query their own assigned current trip', async () => {
    const res = await request(app)
      .post('/api/ai/query')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ query: 'My current trip' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.intent).toBe('DRIVER_CURRENT_TRIP');
    expect(res.body.message).toContain(testTrip.tripID);
    expect(res.body.type).toBe('trip_card');
  });

  it('8. Driver can query their own attendance', async () => {
    const res = await request(app)
      .post('/api/ai/query')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ query: 'My attendance' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.intent).toBe('DRIVER_ATTENDANCE');
    expect(res.body.message).toMatch(/clocked in/i);
  });
});
