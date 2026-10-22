import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../../backend/src/app';

describe('TC-RBAC-01: Role-Based Access Control Rejection', () => {
  it('blocks a Driver from dispatching a trip (requires TRIPS_DISPATCH permission)', async () => {
    const timestamp = Date.now();
    const driverEmail = `tc_rbac_driver_${timestamp}@logisphere.ai`;

    // 1. Register a Driver
    const signupRes = await request(app).post('/api/user/create').send({
      name: 'RBAC Test Driver',
      email: driverEmail,
      password: 'Password123',
      phoneNo: '9876543210',
      role: 'ROLE_DRIVER',
      licenseNo: `DL-RBAC-${timestamp}`,
      licenseExpiryDate: '2030-01-01',
    });
    expect(signupRes.status).toBe(201);
    const driverToken = signupRes.body.token;
    expect(driverToken).toBeTruthy();

    // 2. Driver attempts to call manager/dispatcher restricted endpoint (PUT /api/trip/dispatch/TRP-TEST)
    const res = await request(app)
      .put('/api/trip/dispatch/TRP-TEST-999')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ status: 'ACCEPTED' });

    // 3. Must be rejected with 403 Forbidden
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Forbidden|insufficient role permissions/i);
  });
});
