import request from 'supertest';
import {describe, expect, it} from 'vitest';
import {app} from '../src/app';

describe('Maintenance API Integration Flow', () => {
  let createdId = '';
  let vehicleID = 'veh-van-05';

  it('1. GET /api/maintenance returns maintenance records array', async () => {
    const res = await request(app).get('/api/maintenance');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('2. POST /api/maintenance/create creates a new maintenance record', async () => {
    const serviceType = `Brake Inspection ${Date.now()}`;
    const payload = {
      vehicleID,
      serviceType,
      cost: 3500,
      date: '2026-09-25',
      status: 'ACTIVE'
    };

    const res = await request(app).post('/api/maintenance/create').send(payload);

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.vehicleID).toBe(vehicleID);
    expect(res.body.serviceType).toBe(serviceType);
    expect(res.body.cost).toBe(3500);
    expect(res.body.status).toBe('Active');

    createdId = res.body.id;
  });

  it('3. GET /api/maintenance includes the newly created maintenance record', async () => {
    const res = await request(app).get('/api/maintenance');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    const match = res.body.find((r: any) => r.id === createdId);
    expect(match).toBeDefined();
    expect(match.vehicleID).toBe(vehicleID);
    expect(match.cost).toBe(3500);
  });
});
