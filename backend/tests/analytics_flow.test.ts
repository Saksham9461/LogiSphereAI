import request from 'supertest';
import {describe, expect, it} from 'vitest';
import {app} from '../src/app';

describe('Analytics API Integration Flow', () => {
  it('1. GET /api/analytics returns calculated KPIs, monthly revenue, and costliest vehicles', async () => {
    const res = await request(app).get('/api/analytics');

    expect(res.status).toBe(200);
    expect(res.body.kpis).toBeDefined();
    expect(typeof res.body.kpis.fuelEfficiency).toBe('number');
    expect(typeof res.body.kpis.fleetUtilization).toBe('number');
    expect(typeof res.body.kpis.operationalCost).toBe('number');
    expect(typeof res.body.kpis.vehicleROI).toBe('number');

    expect(Array.isArray(res.body.monthlyRevenue)).toBe(true);
    expect(res.body.monthlyRevenue.length).toBeGreaterThan(0);

    expect(Array.isArray(res.body.costliestVehicles)).toBe(true);
  });
});
