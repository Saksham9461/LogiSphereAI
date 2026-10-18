import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { db } from '../src/config/database';
import { signToken } from '../src/middleware/auth';
import { calculateFuelAnomalies } from '../src/modules/analytics/fuelAnomalyService';

describe('LogiSphere AI — Fuel Anomaly & Efficiency Intelligence', { timeout: 20000 }, () => {
  let managerToken: string;
  let driverToken: string;

  // Test vehicles
  const normalVeh = {
    vehicleID: `veh-norm-${Date.now()}`,
    registrationNumber: `GJ01NR${Math.floor(1000 + Math.random() * 8999)}`,
    name: 'Normal-Van-01',
    type: 'VAN',
    status: 'AVAILABLE',
    odometer: 50000,
    maxLoadCapacity: 1200,
  };

  const anomalyVeh = {
    vehicleID: `veh-anom-${Date.now()}`,
    registrationNumber: `GJ01AN${Math.floor(1000 + Math.random() * 8999)}`,
    name: 'Anomaly-Truck-02',
    type: 'TRUCK',
    status: 'AVAILABLE',
    odometer: 120000,
    maxLoadCapacity: 4000,
  };

  const sparseVeh = {
    vehicleID: `veh-sparse-${Date.now()}`,
    registrationNumber: `GJ01SP${Math.floor(1000 + Math.random() * 8999)}`,
    name: 'Sparse-Mini-03',
    type: 'MINI',
    status: 'AVAILABLE',
    odometer: 15000,
    maxLoadCapacity: 700,
  };

  beforeAll(async () => {
    // 1. Setup Manager & Driver tokens
    const managerUser = {
      id: `usr-mgr-fuel-${Date.now()}`,
      name: 'Fuel Audit Director',
      email: `mgr-fuel-${Date.now()}@logisphere.ai`,
      role: 'ROLE_MANAGER',
    };
    await db.insert('users', managerUser);
    managerToken = signToken(managerUser);

    const driverUser = {
      id: `usr-drv-fuel-${Date.now()}`,
      name: 'Driver Dave',
      email: `drv-fuel-${Date.now()}@logisphere.ai`,
      role: 'ROLE_DRIVER',
    };
    await db.insert('users', driverUser);
    driverToken = signToken(driverUser);

    // 2. Insert test vehicles
    await db.insert('vehicles', normalVeh);
    await db.insert('vehicles', anomalyVeh);
    await db.insert('vehicles', sparseVeh);

    // 3. Normal Vehicle Trips (Consistent ~10 km/L economy)
    for (let i = 1; i <= 4; i++) {
      await db.insert('trips', {
        tripID: `TRP-NRM-${i}-${Date.now()}`,
        vehicleID: normalVeh.vehicleID,
        driverID: driverUser.id,
        source: 'Depot A',
        destination: 'Depot B',
        status: 'DELIVERED',
        startingOdometer: 50000 + (i - 1) * 100,
        finalOdometer: 50000 + i * 100, // 100 km
        fuelConsumed: 10.0, // 100 km / 10 L = 10 km/L
        plannedDistance: 100,
      });
    }

    // Normal Vehicle standard fuel log (Within 65L capacity, normal cost)
    await db.insert('fuel_logs', {
      fuelLogId: `fuel-norm-${Date.now()}`,
      vehicleID: normalVeh.vehicleID,
      date: '2026-10-10',
      liters: 45.0,
      cost: 4500, // ₹100/L
    });

    // 4. Anomaly Vehicle Trips (Baseline ~4 km/L, followed by sharp drop to 1.8 km/L)
    for (let i = 1; i <= 3; i++) {
      await db.insert('trips', {
        tripID: `TRP-ANM-BASE-${i}-${Date.now()}`,
        vehicleID: anomalyVeh.vehicleID,
        driverID: driverUser.id,
        source: 'Hub X',
        destination: 'Hub Y',
        status: 'DELIVERED',
        startingOdometer: 120000 + (i - 1) * 200,
        finalOdometer: 120000 + i * 200, // 200 km
        fuelConsumed: 50.0, // 200 km / 50 L = 4.0 km/L baseline
        plannedDistance: 200,
      });
    }

    // Recent anomaly trip: 200 km but consumed 110 L (1.8 km/L -> 55% drop!)
    await db.insert('trips', {
      tripID: `TRP-ANM-SPIKE-${Date.now()}`,
      vehicleID: anomalyVeh.vehicleID,
      driverID: driverUser.id,
      source: 'Hub X',
      destination: 'Hub Y',
      status: 'DELIVERED',
      startingOdometer: 120600,
      finalOdometer: 120800,
      fuelConsumed: 110.0,
      plannedDistance: 200,
    });

    // Anomaly fuel log 1: Tank Capacity Overflow (Logged 380L for a 250L truck!)
    await db.insert('fuel_logs', {
      fuelLogId: `fuel-anom-tank-${Date.now()}`,
      vehicleID: anomalyVeh.vehicleID,
      date: '2026-10-15',
      liters: 380.0,
      cost: 38000,
    });

    // Anomaly fuel log 2: Unit Price Discrepancy (Logged ₹160/L)
    await db.insert('fuel_logs', {
      fuelLogId: `fuel-anom-price-${Date.now()}`,
      vehicleID: anomalyVeh.vehicleID,
      date: '2026-10-16',
      liters: 50.0,
      cost: 8000, // ₹160/L (exceeds ₹110/L reference)
    });

    // 5. Sparse Vehicle: Only 1 trip (should result in INSUFFICIENT_DATA)
    await db.insert('trips', {
      tripID: `TRP-SPARSE-${Date.now()}`,
      vehicleID: sparseVeh.vehicleID,
      driverID: driverUser.id,
      source: 'Local Depot',
      destination: 'Client Site',
      status: 'DELIVERED',
      startingOdometer: 15000,
      finalOdometer: 15030,
      fuelConsumed: 2.0,
      plannedDistance: 30,
    });
  });

  // 1. Statistical Baseline Calculation
  it('1. Correctly calculates deterministic baseline fuel economy from valid trip records', async () => {
    const report = await calculateFuelAnomalies();
    const normalProfile = report.vehicles.find((v) => v.vehicleID === normalVeh.vehicleID);

    expect(normalProfile).toBeDefined();
    expect(normalProfile?.status).toBe('ADEQUATE');
    expect(normalProfile?.sampleCount).toBeGreaterThanOrEqual(4);
    expect(normalProfile?.baselineKmPerL).toBeCloseTo(10.0, 1);
    expect(normalProfile?.highestSeverity).toBe('NORMAL');
    expect(normalProfile?.anomalies.length).toBe(0);
  });

  // 2. Insufficient Data Handling
  it('2. Enforces minimum sample threshold and honestly returns INSUFFICIENT_DATA without fabricating baselines', async () => {
    const report = await calculateFuelAnomalies();
    const sparseProfile = report.vehicles.find((v) => v.vehicleID === sparseVeh.vehicleID);

    expect(sparseProfile).toBeDefined();
    expect(sparseProfile?.status).toBe('INSUFFICIENT_DATA');
    expect(sparseProfile?.sampleCount).toBeLessThan(3);
    expect(sparseProfile?.baselineKmPerL).toBeNull();
  });

  // 3. Tank Capacity Overflow Detection
  it('3. Flags TANK_CAPACITY_OVERFLOW when logged fuel volume exceeds nominal tank capacity', async () => {
    const report = await calculateFuelAnomalies();
    const anomProfile = report.vehicles.find((v) => v.vehicleID === anomalyVeh.vehicleID);

    expect(anomProfile).toBeDefined();
    const tankAnomaly = anomProfile?.anomalies.find((a) => a.anomalyType === 'TANK_CAPACITY_OVERFLOW');
    expect(tankAnomaly).toBeDefined();
    expect(tankAnomaly?.severity).toBe('HIGH');
    expect(tankAnomaly?.evidenceReason).toContain('exceeds reference tank capacity');
  });

  // 4. Burn Rate Efficiency Drop Detection
  it('4. Flags CONSUMPTION_DEVIATION when trip fuel economy drops > 30% below baseline', async () => {
    const report = await calculateFuelAnomalies();
    const anomProfile = report.vehicles.find((v) => v.vehicleID === anomalyVeh.vehicleID);

    expect(anomProfile).toBeDefined();
    const effAnomaly = anomProfile?.anomalies.find((a) => a.anomalyType === 'CONSUMPTION_DEVIATION');
    expect(effAnomaly).toBeDefined();
    expect(effAnomaly?.deviationPercent).toBeGreaterThanOrEqual(40);
    expect(effAnomaly?.evidenceReason).toContain('below vehicle baseline');
  });

  // 5. Unit Price Spike Detection
  it('5. Flags PRICING_DEVIATION when fuel cost per liter deviates from reference range', async () => {
    const report = await calculateFuelAnomalies();
    const anomProfile = report.vehicles.find((v) => v.vehicleID === anomalyVeh.vehicleID);

    const priceAnomaly = anomProfile?.anomalies.find((a) => a.anomalyType === 'PRICING_DEVIATION');
    expect(priceAnomaly).toBeDefined();
    expect(priceAnomaly?.metricObserved).toContain('₹160');
    expect(priceAnomaly?.evidenceReason).toContain('higher than expected reference range');
  });

  // 6. RBAC: Prohibits driver and permits manager for GET /api/analytics/fuel-anomalies
  it('6. Enforces RBAC: Prohibits drivers (403) and allows managers (200) for fuel anomaly endpoints', async () => {
    // 1. Unauthenticated -> 200 (if optionalAuth permits read) or protected
    // 2. Driver role -> 403 Forbidden
    const driverRes = await request(app)
      .get('/api/analytics/fuel-anomalies')
      .set('Authorization', `Bearer ${driverToken}`);
    expect(driverRes.status).toBe(403);
    expect(driverRes.body.success).toBe(false);

    // 3. Manager role -> 200 OK
    const mgrRes = await request(app)
      .get('/api/analytics/fuel-anomalies')
      .set('Authorization', `Bearer ${managerToken}`);
    expect(mgrRes.status).toBe(200);
    expect(mgrRes.body.success).toBe(true);
    expect(mgrRes.body.data).toHaveProperty('fleetSummary');
    expect(mgrRes.body.data).toHaveProperty('vehicles');
    expect(mgrRes.body.data).toHaveProperty('anomalies');
    expect(mgrRes.body.data).toHaveProperty('aiAdvisory');
  });

  // 7. Vehicle Drilldown Endpoint
  it('7. Exposes GET /api/analytics/fuel-anomalies/:vehicleId for vehicle-level drilldown', async () => {
    const res = await request(app)
      .get(`/api/analytics/fuel-anomalies/${anomalyVeh.vehicleID}`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.vehicle.vehicleID).toBe(anomalyVeh.vehicleID);
    expect(res.body.data.anomalies.length).toBeGreaterThanOrEqual(2);

    // 404 for unknown vehicle
    const notFoundRes = await request(app)
      .get('/api/analytics/fuel-anomalies/non-existent-veh-999')
      .set('Authorization', `Bearer ${managerToken}`);
    expect(notFoundRes.status).toBe(404);
  });

  // 8. Resilient AI Advisory Structure
  it('8. Returns valid AI advisory structure with deterministic fallback guarantee', async () => {
    const report = await calculateFuelAnomalies();
    expect(report.aiAdvisory).toBeDefined();
    expect(['gemini', 'deterministic_fallback']).toContain(report.aiAdvisory.source);
    expect(typeof report.aiAdvisory.executiveSummary).toBe('string');
    expect(Array.isArray(report.aiAdvisory.actionableChecks)).toBe(true);
    expect(report.aiAdvisory.actionableChecks.length).toBeGreaterThanOrEqual(1);
    expect(typeof report.aiAdvisory.riskObservation).toBe('string');
  });
});
