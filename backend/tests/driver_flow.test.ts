import request from 'supertest';
import {describe, expect, it} from 'vitest';
import {app} from '../src/app';

describe('Driver Temporary Password & First Login Password Change Flow', () => {
  let driverEmail = `driver_test_${Date.now()}@logisphere.ai`;
  let tempPassword = '';
  let newPassword = 'NewDriverPassword123!';
  let authToken = '';

  it('1. POST /api/user/create generates temporary password and returns credentials', async () => {
    const res = await request(app).post('/api/user/create').send({
      name: 'Test Driver Alpha',
      email: driverEmail,
      phoneNo: '9876543210',
      licenseNo: 'DL-9988776655',
      licenseExpiryDate: '12/2030',
      role: 'ROLE_DRIVER',
      status: 'AVAILABLE'
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.credentials).toBeDefined();
    expect(res.body.credentials.email).toBe(driverEmail);
    expect(res.body.credentials.temporaryPassword).toBeDefined();
    expect(res.body.credentials.temporaryPassword).toMatch(/^LS-/);

    tempPassword = res.body.credentials.temporaryPassword;
  });

  it('2. GET /api/user does NOT return passwordHash or temporaryPassword', async () => {
    const res = await request(app).get('/api/user?role=ROLE_DRIVER');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    const createdDriver = res.body.find((d: any) => d.email === driverEmail);
    expect(createdDriver).toBeDefined();
    expect(createdDriver.passwordHash).toBeUndefined();
    expect(createdDriver.temporaryPassword).toBeUndefined();
    expect(createdDriver.tempPassword).toBeUndefined();
    expect(createdDriver.password).toBeUndefined();
  });

  it('3. POST /api/auth/login with temporary password returns mustChangePassword: true', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: driverEmail,
      password: tempPassword,
      role: 'ROLE_DRIVER'
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.serviceResult).toBeDefined();
    expect(res.body.serviceResult.mustChangePassword).toBe(true);
    expect(res.body.serviceResult.token).toBeDefined();

    authToken = res.body.serviceResult.token;
  });

  it('4. POST /api/auth/change-password validates current and new password requirements', async () => {
    // Fail wrong current password
    const wrongRes = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        email: driverEmail,
        currentPassword: 'WrongPassword123!',
        newPassword
      });
    expect(wrongRes.status).toBe(400);
    expect(wrongRes.body.message).toBe('Current password is incorrect');

    // Fail short password
    const shortRes = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        email: driverEmail,
        currentPassword: tempPassword,
        newPassword: 'short'
      });
    expect(shortRes.status).toBe(400);

    // Fail same password
    const sameRes = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        email: driverEmail,
        currentPassword: tempPassword,
        newPassword: tempPassword
      });
    expect(sameRes.status).toBe(400);

    // Success change password
    const successRes = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        email: driverEmail,
        currentPassword: tempPassword,
        newPassword
      });

    expect(successRes.status).toBe(200);
    expect(successRes.body.success).toBe(true);
    expect(successRes.body.user.mustChangePassword).toBe(false);
  });

  it('5. POST /api/auth/login with NEW password succeeds with mustChangePassword: false', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: driverEmail,
      password: newPassword,
      role: 'ROLE_DRIVER'
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.serviceResult.mustChangePassword).toBe(false);
  });

  it('6. POST /api/auth/login with OLD temporary password fails (401)', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: driverEmail,
      password: tempPassword,
      role: 'ROLE_DRIVER'
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Invalid credentials');
  });
});
