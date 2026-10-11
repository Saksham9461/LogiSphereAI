import request from 'supertest';
import { describe, expect, it, beforeAll } from 'vitest';
import { app } from '../src/app';
import { signToken } from '../src/middleware/auth';
import { db } from '../src/config/database';

describe('LogiSphere AI — SOS Emergency Alert System', () => {
  let driver1: any;
  let driver2: any;
  let manager: any;
  let managerOtherOrg: any;
  let dispatcher: any;
  let driver1Token: string;
  let driver2Token: string;
  let managerToken: string;
  let managerOtherOrgToken: string;
  let dispatcherToken: string;
  let createdAlertId: string;

  beforeAll(async () => {
    // Setup test users
    driver1 = await db.insert('users', {
      id: `drv-test-1-${Date.now()}`,
      name: 'Ramesh Driver',
      email: `ramesh_${Date.now()}@logisphere.ai`,
      role: 'ROLE_DRIVER',
      businessId: 'test_org',
    });

    driver2 = await db.insert('users', {
      id: `drv-test-2-${Date.now()}`,
      name: 'Suresh Driver',
      email: `suresh_${Date.now()}@logisphere.ai`,
      role: 'ROLE_DRIVER',
      businessId: 'test_org',
    });

    manager = await db.insert('users', {
      id: `mgr-test-${Date.now()}`,
      name: 'Vikram Manager',
      email: `vikram_${Date.now()}@logisphere.ai`,
      role: 'ROLE_MANAGER',
      businessId: 'test_org',
    });

    managerOtherOrg = await db.insert('users', {
      id: `mgr-other-${Date.now()}`,
      name: 'Anil Foreign Manager',
      email: `anil_${Date.now()}@logisphere.ai`,
      role: 'ROLE_MANAGER',
      businessId: 'other_foreign_org',
    });

    dispatcher = await db.insert('users', {
      id: `disp-test-${Date.now()}`,
      name: 'Divya Dispatcher',
      email: `divya_${Date.now()}@logisphere.ai`,
      role: 'ROLE_DISPATCHER',
      businessId: 'test_org',
    });

    driver1Token = signToken(driver1);
    driver2Token = signToken(driver2);
    managerToken = signToken(manager);
    managerOtherOrgToken = signToken(managerOtherOrg);
    dispatcherToken = signToken(dispatcher);
  });

  it('1. Driver can create an SOS alert with valid GPS coordinates', async () => {
    const res = await request(app)
      .post('/api/alerts/sos')
      .set('Authorization', `Bearer ${driver1Token}`)
      .send({
        latitude: 23.2156,
        longitude: 72.6369,
        accuracy: 12.5,
        message: 'Accident on National Highway 48, immediate assistance required',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.alert).toBeDefined();
    expect(res.body.alert.id).toMatch(/^alt-/);
    expect(res.body.alert.driverId).toBe(driver1.id);
    expect(res.body.alert.driverName).toBe(driver1.name);
    expect(res.body.alert.latitude).toBe(23.2156);
    expect(res.body.alert.longitude).toBe(72.6369);
    expect(res.body.alert.locationAccuracy).toBe(12.5);
    expect(res.body.alert.locationStatus).toBe('PRECISE');
    expect(res.body.alert.status).toBe('ACTIVE');
    expect(res.body.alert.createdAt).toBeDefined();

    createdAlertId = res.body.alert.id;
  });

  it('2. Driver identity is enforced from JWT regardless of spoofed client-supplied driverId', async () => {
    const res = await request(app)
      .post('/api/alerts/sos')
      .set('Authorization', `Bearer ${driver1Token}`)
      .send({
        driverId: 'spoofed-fake-driver-999',
        driverName: 'Fake Name',
        latitude: 23.2156,
        longitude: 72.6369,
      });

    expect(res.status).toBe(201);
    expect(res.body.alert.driverId).toBe(driver1.id);
    expect(res.body.alert.driverName).toBe(driver1.name);
  });

  it('3. SOS can be submitted without an active trip', async () => {
    const res = await request(app)
      .post('/api/alerts/sos')
      .set('Authorization', `Bearer ${driver2Token}`)
      .send({
        latitude: 23.0225,
        longitude: 72.5714,
        accuracy: 8.0,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.alert.tripId).toBeNull();
    expect(res.body.alert.driverId).toBe(driver2.id);
    expect(res.body.alert.status).toBe('ACTIVE');
  });

  it('4. Missing or denied GPS is handled gracefully without fabricating coordinates', async () => {
    const res = await request(app)
      .post('/api/alerts/sos')
      .set('Authorization', `Bearer ${driver1Token}`)
      .send({
        latitude: null,
        longitude: null,
        locationStatus: 'UNAVAILABLE',
        message: 'GPS disabled on device, vehicle broken down',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.alert.latitude).toBeNull();
    expect(res.body.alert.longitude).toBeNull();
    expect(res.body.alert.locationStatus).toBe('UNAVAILABLE');
    expect(res.body.alert.status).toBe('ACTIVE');
  });

  it('5. Manager can fetch all emergency alerts within organization', async () => {
    const res = await request(app)
      .get('/api/alerts')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.alerts)).toBe(true);
    expect(res.body.isManager).toBe(true);
    expect(res.body.alerts.length).toBeGreaterThanOrEqual(3);

    // Verify alerts are sorted newest first
    const dates = res.body.alerts.map((a: any) => new Date(a.createdAt).getTime());
    for (let i = 0; i < dates.length - 1; i++) {
      expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1]);
    }
  });

  it('6. Driver can fetch ONLY their own alerts (strict privacy isolation)', async () => {
    const res = await request(app)
      .get('/api/alerts')
      .set('Authorization', `Bearer ${driver1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.isManager).toBe(false);
    expect(Array.isArray(res.body.alerts)).toBe(true);

    // Every alert in driver1's list MUST belong to driver1
    for (const a of res.body.alerts) {
      expect(a.driverId).toBe(driver1.id);
      expect(a.driverId).not.toBe(driver2.id);
    }
  });

  it('7. Driver cannot access another driver’s individual alert details (403 Forbidden)', async () => {
    const res = await request(app)
      .get(`/api/alerts/${createdAlertId}`)
      .set('Authorization', `Bearer ${driver2Token}`); // driver2 tries to view driver1's alert

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('8. Manager can access individual alert details', async () => {
    const res = await request(app)
      .get(`/api/alerts/${createdAlertId}`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(createdAlertId);
    expect(res.body.data.driverId).toBe(driver1.id);
  });

  it('9. Manager can acknowledge an active alert', async () => {
    const res = await request(app)
      .patch(`/api/alerts/${createdAlertId}/acknowledge`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ACKNOWLEDGED');
    expect(res.body.data.acknowledgedBy).toBe(manager.id);
    expect(res.body.data.acknowledgedAt).toBeDefined();
  });

  it('10. Driver cannot acknowledge an alert (403 Forbidden for non-managers)', async () => {
    const res = await request(app)
      .patch(`/api/alerts/${createdAlertId}/acknowledge`)
      .set('Authorization', `Bearer ${driver1Token}`);

    expect(res.status).toBe(403);
  });

  it('11. Manager can resolve an acknowledged alert with a resolution note', async () => {
    const res = await request(app)
      .patch(`/api/alerts/${createdAlertId}/resolve`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        resolutionNote: 'Emergency road rescue vehicle arrived on scene. Tow truck dispatched.',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('RESOLVED');
    expect(res.body.data.resolvedBy).toBe(manager.id);
    expect(res.body.data.resolvedAt).toBeDefined();
    expect(res.body.data.resolutionNote).toBe(
      'Emergency road rescue vehicle arrived on scene. Tow truck dispatched.'
    );
  });

  it('12. Alert count endpoint returns accurate active count for managers and drivers', async () => {
    const mgrRes = await request(app)
      .get('/api/alerts/count')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(mgrRes.status).toBe(200);
    expect(mgrRes.body.success).toBe(true);
    expect(typeof mgrRes.body.activeCount).toBe('number');
    expect(typeof mgrRes.body.totalCount).toBe('number');

    const drvRes = await request(app)
      .get('/api/alerts/count')
      .set('Authorization', `Bearer ${driver1Token}`);

    expect(drvRes.status).toBe(200);
    expect(drvRes.body.isManager).toBe(false);
  });

  it('13. Backward-compatible POST /api/sos/trigger route functions properly', async () => {
    const res = await request(app)
      .post('/api/sos/trigger')
      .set('Authorization', `Bearer ${driver1Token}`)
      .send({
        latitude: 23.2156,
        longitude: 72.6369,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.alert).toBeDefined();
  });

  it('14. Non-driver users (Manager, Dispatcher) cannot create SOS alerts (403 Forbidden)', async () => {
    // Fleet Manager attempts to create SOS
    const mgrRes = await request(app)
      .post('/api/alerts/sos')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ latitude: 23.2156, longitude: 72.6369 });

    expect(mgrRes.status).toBe(403);
    expect(mgrRes.body.success).toBe(false);

    // Dispatcher attempts to create SOS
    const dispRes = await request(app)
      .post('/api/alerts/sos')
      .set('Authorization', `Bearer ${dispatcherToken}`)
      .send({ latitude: 23.2156, longitude: 72.6369 });

    expect(dispRes.status).toBe(403);
    expect(dispRes.body.success).toBe(false);
  });

  it('15. Manager cannot access alerts belonging to another organization (403 Forbidden on detail & excluded on list)', async () => {
    // Detail endpoint: Manager from other_foreign_org tries to access alert from test_org
    const detailRes = await request(app)
      .get(`/api/alerts/${createdAlertId}`)
      .set('Authorization', `Bearer ${managerOtherOrgToken}`);

    expect(detailRes.status).toBe(403);
    expect(detailRes.body.success).toBe(false);

    // List endpoint: Manager from other_foreign_org should not see test_org alerts
    const listRes = await request(app)
      .get('/api/alerts')
      .set('Authorization', `Bearer ${managerOtherOrgToken}`);

    expect(listRes.status).toBe(200);
    const hasAlienAlert = listRes.body.alerts.some((a: any) => a.id === createdAlertId);
    expect(hasAlienAlert).toBe(false);
  });

  it('16. Manager cannot acknowledge or resolve alerts belonging to another organization (403 Forbidden)', async () => {
    const ackRes = await request(app)
      .patch(`/api/alerts/${createdAlertId}/acknowledge`)
      .set('Authorization', `Bearer ${managerOtherOrgToken}`);

    expect(ackRes.status).toBe(403);
    expect(ackRes.body.success).toBe(false);

    const resolveRes = await request(app)
      .patch(`/api/alerts/${createdAlertId}/resolve`)
      .set('Authorization', `Bearer ${managerOtherOrgToken}`)
      .send({ resolutionNote: 'Unauthorized attempt' });

    expect(resolveRes.status).toBe(403);
    expect(resolveRes.body.success).toBe(false);
  });
});
