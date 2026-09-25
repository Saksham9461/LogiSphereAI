import request from 'supertest';
import {describe, expect, it} from 'vitest';
import {app} from '../src/app';

describe('Fuel & Expense API Integration Flow', () => {
  let createdFuelId = '';
  let createdExpenseId = '';
  let vehicleID = 'veh-van-05';
  let tripID = 'trp-1001';

  it('1. GET /api/fuel returns fuel logs array', async () => {
    const res = await request(app).get('/api/fuel');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('2. POST /api/fuel/create creates a new fuel log entry', async () => {
    const payload = {
      vehicleID,
      date: '2026-09-25',
      liters: 45,
      cost: 3800
    };

    const res = await request(app).post('/api/fuel/create').send(payload);

    expect(res.status).toBe(201);
    expect(res.body.fuelLogId || res.body.id).toBeDefined();
    expect(res.body.vehicleID).toBe(vehicleID);
    expect(res.body.liters).toBe(45);
    expect(res.body.cost).toBe(3800);

    createdFuelId = res.body.fuelLogId || res.body.id;
  });

  it('3. GET /api/fuel contains the created fuel log', async () => {
    const res = await request(app).get('/api/fuel');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    const match = res.body.find((f: any) => (f.fuelLogId === createdFuelId || f.id === createdFuelId));
    expect(match).toBeDefined();
    expect(match.vehicleID).toBe(vehicleID);
    expect(match.liters).toBe(45);
    expect(match.cost).toBe(3800);
  });

  it('4. GET /api/expenses returns expense records array', async () => {
    const res = await request(app).get('/api/expenses');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('5. POST /api/expenses/create creates a new expense record', async () => {
    const payload = {
      vehicleID,
      tripID,
      toll: 250,
      other: 100,
      maint: 0
    };

    const res = await request(app).post('/api/expenses/create').send(payload);

    expect(res.status).toBe(201);
    expect(res.body.expenseId || res.body.id).toBeDefined();
    expect(res.body.vehicleID).toBe(vehicleID);
    expect(res.body.toll).toBe(250);
    expect(res.body.other).toBe(100);

    createdExpenseId = res.body.expenseId || res.body.id;
  });

  it('6. GET /api/expenses contains the created expense record', async () => {
    const res = await request(app).get('/api/expenses');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    const match = res.body.find((e: any) => (e.expenseId === createdExpenseId || e.id === createdExpenseId));
    expect(match).toBeDefined();
    expect(match.vehicleID).toBe(vehicleID);
    expect(match.toll).toBe(250);
  });
});
