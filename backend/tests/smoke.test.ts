import request from 'supertest';
import {describe, expect, it} from 'vitest';
import {app} from '../src/app';

describe('LogiSphere backend', () => {
  it('logs in with frontend-compatible response shape', async () => {
    const managerEmail = `manager_${Date.now()}@logisphere.ai`;
    const signupRes = await request(app).post('/api/user/create').send({
      name: 'Smoke Fleet Manager',
      email: managerEmail,
      password: 'Password123',
      phoneNo: '9876543210',
      role: 'ROLE_MANAGER'
    });
    expect(signupRes.status).toBe(201);

    const res = await request(app).post('/api/auth/login').send({email: managerEmail, password: 'Password123', role: 'ROLE_MANAGER'});
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.serviceResult.token).toBeTruthy();
  });

  it('rejects login with invalid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({email: 'manager@logisphere.ai', password: 'WrongPassword'});
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Invalid credentials');
  });

  it('creates new user via signup endpoint', async () => {
    const testEmail = `newuser_${Date.now()}@logisphere.ai`;
    const res = await request(app).post('/api/user/create').send({
      name: 'Test Dispatcher',
      email: testEmail,
      password: 'SecurePassword123',
      phoneNo: '9876543210',
      role: 'ROLE_DISPATCHER',
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe(testEmail);

    // Test duplicate email signup (409)
    const dupRes = await request(app).post('/api/user/create').send({
      name: 'Test Dispatcher 2',
      email: testEmail,
      password: 'SecurePassword123',
      phoneNo: '9876543210',
      role: 'ROLE_DISPATCHER',
    });
    expect(dupRes.status).toBe(409);
    expect(dupRes.body.success).toBe(false);
    expect(dupRes.body.message).toBe('Email already exists');
  });

  it('serves vehicles and dashboard summary', async () => {
    expect((await request(app).get('/api/vehicle/')).body.length).toBeGreaterThan(0);
    expect((await request(app).get('/api/dashboard/summary')).body).toHaveProperty('fleetUtilization');
  });
});

