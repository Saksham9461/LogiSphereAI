import request from 'supertest';
import { describe, expect, it, beforeAll } from 'vitest';
import { app } from '../src/app';
import { signToken } from '../src/middleware/auth';
import { db } from '../src/config/database';
import { calculateMaintenanceForecast } from '../src/modules/analytics/maintenanceForecastService';

describe('LogiSphere AI — Maintenance Cost Forecasting', () => {
  let managerUser: any;
  let driverUser: any;
  let dispatcherUser: any;
  let managerToken: string;
  let driverToken: string;
  let dispatcherToken: string;
  let testVehicle1: any;
  let testVehicle2: any;

  beforeAll(async () => {
    const timestamp = Date.now();
    managerUser = await db.insert('users', {
      id: `usr-mgr-mf-${timestamp}`,
      name: 'Priya Maintenance Manager',
      email: `priya_mf_${timestamp}@logisphere.ai`,
      role: 'ROLE_MANAGER',
    });
    managerToken = signToken(managerUser);

    driverUser = await db.insert('users', {
      id: `usr-drv-mf-${timestamp}`,
      name: 'Raju Driver',
      email: `raju_mf_${timestamp}@logisphere.ai`,
      role: 'ROLE_DRIVER',
    });
    driverToken = signToken(driverUser);

    dispatcherUser = await db.insert('users', {
      id: `usr-dsp-mf-${timestamp}`,
      name: 'Sunil Dispatcher',
      email: `sunil_mf_${timestamp}@logisphere.ai`,
      role: 'ROLE_DISPATCHER',
    });
    dispatcherToken = signToken(dispatcherUser);

    // Create test vehicles
    testVehicle1 = await db.insert('vehicles', {
      vehicleID: `veh-mf1-${timestamp}`,
      registrationNumber: `GJ01MF${timestamp % 10000}`,
      name: 'Heavy Duty Hauler A',
      type: 'TRUCK',
      maxLoadCapacity: 12000,
      odometer: 145000,
      acquisitionCost: 1500000,
      status: 'AVAILABLE',
    });

    testVehicle2 = await db.insert('vehicles', {
      vehicleID: `veh-mf2-${timestamp}`,
      registrationNumber: `GJ01MF2${timestamp % 10000}`,
      name: 'Urban Van B',
      type: 'VAN',
      maxLoadCapacity: 3500,
      odometer: 25000,
      acquisitionCost: 800000,
      status: 'AVAILABLE',
    });

    // Create realistic historical maintenance records across completed months
    await db.insert('maintenance_records', {
      id: `mnt-1-${timestamp}`,
      vehicleID: testVehicle1.vehicleID,
      serviceType: 'Brake Overhaul',
      cost: 25000,
      date: '2026-07-15',
      status: 'COMPLETED',
    });

    await db.insert('maintenance_records', {
      id: `mnt-2-${timestamp}`,
      vehicleID: testVehicle1.vehicleID,
      serviceType: 'Engine Tuning',
      cost: 32000,
      date: '2026-08-10',
      status: 'COMPLETED',
    });

    await db.insert('maintenance_records', {
      id: `mnt-3-${timestamp}`,
      vehicleID: testVehicle1.vehicleID,
      serviceType: 'Transmission Service',
      cost: 45000,
      date: '2026-09-05',
      status: 'COMPLETED',
    });

    // Recent 90-day maintenance for testVehicle1 to trigger risk factor
    await db.insert('maintenance_records', {
      id: `mnt-4-${timestamp}`,
      vehicleID: testVehicle1.vehicleID,
      serviceType: 'Suspension Replacement',
      cost: 50000,
      date: '2026-10-02',
      status: 'COMPLETED',
    });

    // Moderate record for testVehicle2
    await db.insert('maintenance_records', {
      id: `mnt-5-${timestamp}`,
      vehicleID: testVehicle2.vehicleID,
      serviceType: 'Oil & Filter Change',
      cost: 6500,
      date: '2026-09-20',
      status: 'COMPLETED',
    });
  });

  it('1. Correctly calculates deterministic baseline forecast and historical monthly aggregation', async () => {
    const result = await calculateMaintenanceForecast();

    expect(result).toBeDefined();
    expect(result.currency).toBe('INR');
    expect(result.forecastBudget).toBeGreaterThan(0);
    expect(result.forecastRange.min).toBeLessThanOrEqual(result.forecastBudget);
    expect(result.forecastRange.max).toBeGreaterThanOrEqual(result.forecastBudget);
    expect(Array.isArray(result.historicalMonthly)).toBe(true);
    expect(result.historicalMonthly.length).toBeGreaterThanOrEqual(3);

    // Verify chronological order of historical monthly records
    for (let i = 1; i < result.historicalMonthly.length; i++) {
      expect(result.historicalMonthly[i].month >= result.historicalMonthly[i - 1].month).toBe(true);
    }
  });

  it('2. Correctly flags high-risk vehicles based on visit frequency and cost concentration', async () => {
    const result = await calculateMaintenanceForecast();

    const v1Risk = result.vehicleProjections.find((v) => v.vehicleID === testVehicle1.vehicleID);
    expect(v1Risk).toBeDefined();
    expect(v1Risk?.riskLevel).toBe('HIGH');
    expect(v1Risk?.evidenceReasons.length).toBeGreaterThan(0);
    expect(v1Risk?.totalHistoricalCost).toBeGreaterThanOrEqual(152000);
  });

  it('3. Prevents duplicate expense double-counting between maintenance and expense records', async () => {
    const timestamp = Date.now();
    const beforeResult = await calculateMaintenanceForecast();
    const beforeOctCost = beforeResult.historicalMonthly.find((m) => m.month === '2026-10')?.actualCost || 0;

    // Insert an expense record that duplicates an existing maintenance record amount in the same month
    await db.insert('expense_records', {
      expenseId: `exp-dup-${timestamp}`,
      tripID: `TRP-DUP-${timestamp}`,
      vehicleID: testVehicle1.vehicleID,
      maint: 50000, // matches mnt-4 in 2026-10
      createdAt: '2026-10-05T10:00:00Z',
    });

    const afterResult = await calculateMaintenanceForecast();
    const afterOctMonth = afterResult.historicalMonthly.find((m) => m.month === '2026-10');

    expect(afterOctMonth).toBeDefined();
    // If double counted, afterOctCost would increase by 50000. It must not increase.
    expect(afterOctMonth?.actualCost).toBe(beforeOctCost);
  });

  it('4. Provides valid AI explanation structure or graceful deterministic fallback', async () => {
    const result = await calculateMaintenanceForecast();

    expect(result.aiExplanation).toBeDefined();
    expect(['gemini', 'deterministic_fallback']).toContain(result.aiExplanation.source);
    expect(result.aiExplanation.executiveSummary.length).toBeGreaterThan(15);
    expect(Array.isArray(result.aiExplanation.costDrivers)).toBe(true);
    expect(Array.isArray(result.aiExplanation.budgetRecommendations)).toBe(true);
    expect(result.aiExplanation.budgetRecommendations.length).toBeGreaterThanOrEqual(1);
  });

  it('5. Enforces RBAC: Prohibits driver and allows manager / dispatcher for GET /api/analytics/maintenance-forecast', async () => {
    // Driver should be rejected (403 Forbidden)
    const driverRes = await request(app)
      .get('/api/analytics/maintenance-forecast')
      .set('Authorization', `Bearer ${driverToken}`);

    expect(driverRes.status).toBe(403);

    // Manager should succeed (200 OK)
    const managerRes = await request(app)
      .get('/api/analytics/maintenance-forecast')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(managerRes.status).toBe(200);
    expect(managerRes.body.success).toBe(true);
    expect(managerRes.body.data.forecastBudget).toBeGreaterThan(0);

    // Dispatcher should succeed (200 OK)
    const dispatcherRes = await request(app)
      .get('/api/analytics/maintenance-forecast')
      .set('Authorization', `Bearer ${dispatcherToken}`);

    expect(dispatcherRes.status).toBe(200);
    expect(dispatcherRes.body.success).toBe(true);
  });

  it('6. Supports vehicle drilldown endpoint GET /api/analytics/maintenance-forecast/:vehicleId', async () => {
    const res = await request(app)
      .get(`/api/analytics/maintenance-forecast/${testVehicle1.vehicleID}`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.vehicle.vehicleID).toBe(testVehicle1.vehicleID);
    expect(res.body.data.vehicle.riskLevel).toBe('HIGH');
    expect(Array.isArray(res.body.data.maintenanceHistory)).toBe(true);
    expect(res.body.data.maintenanceHistory.length).toBeGreaterThanOrEqual(1);
  });
});
