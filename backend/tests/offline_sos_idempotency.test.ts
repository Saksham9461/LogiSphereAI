import request from 'supertest';
import { describe, expect, it, beforeAll } from 'vitest';
import { app } from '../src/app';
import { signToken } from '../src/middleware/auth';
import { db } from '../src/config/database';

describe('LogiSphere AI — Backend SOS Idempotency & Offline Sync Support', { timeout: 20000 }, () => {
  let driver1: any;
  let driver2: any;
  let manager: any;
  let driver1Token: string;
  let driver2Token: string;
  let managerToken: string;

  beforeAll(async () => {
    driver1 = await db.insert('users', {
      id: `drv-idem-1-${Date.now()}`,
      name: 'Ramesh Idem Driver',
      email: `ramesh_idem_${Date.now()}@logisphere.ai`,
      role: 'ROLE_DRIVER',
      businessId: 'idem_test_org',
    });

    driver2 = await db.insert('users', {
      id: `drv-idem-2-${Date.now()}`,
      name: 'Suresh Idem Driver',
      email: `suresh_idem_${Date.now()}@logisphere.ai`,
      role: 'ROLE_DRIVER',
      businessId: 'idem_test_org',
    });

    manager = await db.insert('users', {
      id: `mgr-idem-${Date.now()}`,
      name: 'Vikram Idem Manager',
      email: `vikram_idem_${Date.now()}@logisphere.ai`,
      role: 'ROLE_MANAGER',
      businessId: 'idem_test_org',
    });

    driver1Token = signToken(driver1);
    driver2Token = signToken(driver2);
    managerToken = signToken(manager);
  });

  it('1. First SOS submission with unique clientRequestId successfully creates an alert (201 Created)', async () => {
    const clientRequestId = `sos-client-req-001-${Date.now()}`;
    const initialNotifications = await db.list('notifications');
    const notifCountBefore = (initialNotifications || []).length;

    const res = await request(app)
      .post('/api/alerts/sos')
      .set('Authorization', `Bearer ${driver1Token}`)
      .send({
        clientRequestId,
        latitude: 23.2156,
        longitude: 72.6369,
        accuracy: 10.0,
        message: 'Engine breakdown on highway',
        createdAt: '2026-10-17T12:00:00.000Z',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.alert).toBeDefined();
    expect(res.body.alert.clientRequestId).toBe(clientRequestId);
    expect(res.body.alert.driverId).toBe(driver1.id);
    expect(new Date(res.body.alert.createdAt).getTime()).toBe(new Date('2026-10-17T12:00:00.000Z').getTime());

    const notifsAfter = await db.list('notifications');
    const matchingNotif = (notifsAfter || []).find((n: any) =>
      n.title?.includes('EMERGENCY SOS') && (n.body?.includes(driver1.name) || n.body?.includes('Driver'))
    );
    expect(matchingNotif).toBeDefined();
    expect((notifsAfter || []).length).toBeGreaterThanOrEqual(notifCountBefore + 1);
  });

  it('2. Retry with the SAME clientRequestId returns the existing alert (200 OK) without creating duplicates', async () => {
    const clientRequestId = `sos-client-req-retry-${Date.now()}`;

    // First attempt (simulating client sent and server persisted)
    const firstRes = await request(app)
      .post('/api/alerts/sos')
      .set('Authorization', `Bearer ${driver1Token}`)
      .send({
        clientRequestId,
        latitude: 23.2156,
        longitude: 72.6369,
        message: 'Original transmission',
      });

    expect(firstRes.status).toBe(201);
    const originalAlertId = firstRes.body.alert.id;

    const notifsBeforeRetry = await db.list('notifications');
    const notifCount = (notifsBeforeRetry || []).length;

    const alertsBeforeRetry = await db.list('emergency_alerts');
    const alertCount = (alertsBeforeRetry || []).length;

    // Second attempt (simulating client timed out or offline queue sync worker retried)
    const retryRes = await request(app)
      .post('/api/alerts/sos')
      .set('Authorization', `Bearer ${driver1Token}`)
      .send({
        clientRequestId,
        latitude: 23.2156,
        longitude: 72.6369,
        message: 'Retry transmission with same clientRequestId',
      });

    expect(retryRes.status).toBe(200);
    expect(retryRes.body.success).toBe(true);
    expect(retryRes.body.isDuplicate).toBe(true);
    expect(retryRes.body.alert.id).toBe(originalAlertId);
    expect(retryRes.body.alert.clientRequestId).toBe(clientRequestId);

    // Verify database did NOT gain an extra alert record
    const alertsAfterRetry = await db.list('emergency_alerts');
    expect((alertsAfterRetry || []).length).toBe(alertCount);

    // Verify manager did NOT receive a duplicate notification
    const notifsAfterRetry = await db.list('notifications');
    expect((notifsAfterRetry || []).length).toBe(notifCount);
  });

  it('3. Concurrent submissions with identical clientRequestId resolve to the exact same alert record', async () => {
    const clientRequestId = `sos-client-req-race-${Date.now()}`;

    const [resA, resB] = await Promise.all([
      request(app)
        .post('/api/alerts/sos')
        .set('Authorization', `Bearer ${driver1Token}`)
        .send({
          clientRequestId,
          latitude: 19.076,
          longitude: 72.8777,
          message: 'Concurrent thread A',
        }),
      request(app)
        .post('/api/alerts/sos')
        .set('Authorization', `Bearer ${driver1Token}`)
        .send({
          clientRequestId,
          latitude: 19.076,
          longitude: 72.8777,
          message: 'Concurrent thread B',
        }),
    ]);

    expect([200, 201]).toContain(resA.status);
    expect([200, 201]).toContain(resB.status);
    expect(resA.body.alert.id).toBe(resB.body.alert.id);
    expect(resA.body.alert.clientRequestId).toBe(clientRequestId);
  });

  it('4. Another driver cannot hijack or resubmit under an existing clientRequestId (403 Forbidden)', async () => {
    const clientRequestId = `sos-client-req-privacy-${Date.now()}`;

    // Driver 1 creates alert with this ID
    const createRes = await request(app)
      .post('/api/alerts/sos')
      .set('Authorization', `Bearer ${driver1Token}`)
      .send({
        clientRequestId,
        latitude: 28.6139,
        longitude: 77.209,
      });

    expect(createRes.status).toBe(201);

    // Driver 2 attempts to use Driver 1's clientRequestId
    const hijackRes = await request(app)
      .post('/api/alerts/sos')
      .set('Authorization', `Bearer ${driver2Token}`)
      .send({
        clientRequestId,
        latitude: 28.6139,
        longitude: 77.209,
      });

    expect(hijackRes.status).toBe(403);
    expect(hijackRes.body.success).toBe(false);
  });

  it('5. Manager sees the alert synced from offline once it arrives on backend', async () => {
    const clientRequestId = `sos-offline-sync-${Date.now()}`;

    const syncRes = await request(app)
      .post('/api/alerts/sos')
      .set('Authorization', `Bearer ${driver1Token}`)
      .send({
        clientRequestId,
        latitude: 12.9716,
        longitude: 77.5946,
        message: 'SOS triggered offline in rural zone, synced now',
      });

    expect(syncRes.status).toBe(201);
    const syncedAlertId = syncRes.body.alert.id;

    // Manager retrieves alerts
    const mgrRes = await request(app)
      .get('/api/alerts')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(mgrRes.status).toBe(200);
    const foundAlert = mgrRes.body.alerts.find((a: any) => a.id === syncedAlertId);
    expect(foundAlert).toBeDefined();
    expect(foundAlert.clientRequestId).toBe(clientRequestId);
    expect(foundAlert.status).toBe('ACTIVE');
  });
});
