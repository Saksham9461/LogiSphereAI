import request from 'supertest';
import {describe, expect, it} from 'vitest';
import {app} from '../src/app';

describe('Dashboard API Integration Flow', () => {
  it('1. GET /api/dashboard/summary returns summary stats and status breakdown', async () => {
    const res = await request(app).get('/api/dashboard/summary');

    expect(res.status).toBe(200);
    expect(typeof res.body.activeVehicles).toBe('number');
    expect(typeof res.body.availableVehicles).toBe('number');
    expect(typeof res.body.vehiclesInMaintenance).toBe('number');
    expect(typeof res.body.activeTrips).toBe('number');
    expect(typeof res.body.fleetUtilization).toBe('number');
    expect(Array.isArray(res.body.statusBreakdown)).toBe(true);
    expect(res.body.statusBreakdown.length).toBeGreaterThan(0);
  });

  it('2. GET /api/trip returns trip list for dashboard recent trips', async () => {
    const res = await request(app).get('/api/trip');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
