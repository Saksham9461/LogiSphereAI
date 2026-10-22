import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../../backend/src/app';

describe('TC-NOT-02: Notification Delivery and User Filtering', () => {
  it('ensures notifications are filtered strictly to recipient user ID', async () => {
    const timestamp = Date.now();

    // 1. Create Driver A and Driver B
    const drvARes = await request(app).post('/api/user/create').send({
      name: 'Driver Alpha',
      email: `drv_a_${timestamp}@logisphere.ai`,
      password: 'Password123',
      phoneNo: '9911223344',
      role: 'ROLE_DRIVER',
      licenseNo: `DL-A-${timestamp}`,
      licenseExpiryDate: '2030-01-01',
    });
    expect(drvARes.status).toBe(201);
    const drvAToken = drvARes.body.token;
    const drvAId = drvARes.body.user.id;

    const drvBRes = await request(app).post('/api/user/create').send({
      name: 'Driver Beta',
      email: `drv_b_${timestamp}@logisphere.ai`,
      password: 'Password123',
      phoneNo: '9911223355',
      role: 'ROLE_DRIVER',
      licenseNo: `DL-B-${timestamp}`,
      licenseExpiryDate: '2030-01-01',
    });
    expect(drvBRes.status).toBe(201);
    const drvBToken = drvBRes.body.token;
    const drvBId = drvBRes.body.user.id;

    // 2. Fetch notifications for Driver A
    const resA = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${drvAToken}`);

    expect(resA.status).toBe(200);
    expect(Array.isArray(resA.body)).toBe(true);

    // Any notification in resA must either be unassigned or belong to Driver A
    for (const notif of resA.body) {
      if (notif.userId) {
        expect(notif.userId).toBe(drvAId);
        expect(notif.userId).not.toBe(drvBId);
      }
    }
  });
});
