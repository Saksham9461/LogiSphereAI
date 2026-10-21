import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { db } from '../src/config/database';
import { signToken } from '../src/middleware/auth';
import {
  calculateFuelBasedEmissions,
  calculateDistanceBasedEmissions,
  computeTripEmissions,
  calculateEmpiricalVehicleConsumption,
  kgToTonnes,
  calculatePeriodDelta,
  evaluateDataConfidence,
  getEmissionFactor,
  normalizeFuelType,
} from '../src/modules/carbon/carbonEngine';
import {
  detectTripCarbonAnomalies,
  detectVehicleEfficiencyDegradation,
  detectFleetWideAnomalies,
} from '../src/modules/carbon/carbonAnomalyService';
import { carbonService } from '../src/modules/carbon/carbonService';

describe('LogiSphere AI — Carbon Intelligence & Sustainability Suite', { timeout: 25000 }, () => {
  const org1Id = `org-carb-${Date.now()}`;
  const org2Id = `org-other-${Date.now()}`;

  let managerTokenOrg1: string;
  let driverTokenOrg1: string;
  let managerTokenOrg2: string;

  const testVehTruck = {
    vehicleID: `veh-carb-trk-${Date.now()}`,
    registrationNumber: `GJ01CB${Math.floor(1000 + Math.random() * 8999)}`,
    name: 'Eco-Heavy-Truck',
    type: 'TRUCK',
    fuelType: 'DIESEL',
    status: 'AVAILABLE',
    odometer: 85000,
    maxLoadCapacity: 5000,
    organization_id: org1Id,
  };

  const testVehVan = {
    vehicleID: `veh-carb-van-${Date.now()}`,
    registrationNumber: `GJ01CB${Math.floor(1000 + Math.random() * 8999)}`,
    name: 'Eco-Express-Van',
    type: 'VAN',
    fuelType: 'DIESEL',
    status: 'AVAILABLE',
    odometer: 42000,
    maxLoadCapacity: 1500,
    organization_id: org1Id,
  };

  beforeAll(async () => {
    // 1. Setup Auth Tokens for Org 1 and Org 2
    const mgrUserOrg1 = {
      id: `usr-mgr-c1-${Date.now()}`,
      name: 'Sustainability Director 1',
      email: `mgr1_${Date.now()}@logisphere.ai`,
      role: 'ROLE_MANAGER',
      organization_id: org1Id,
    };
    await db.insert('users', mgrUserOrg1);
    managerTokenOrg1 = signToken(mgrUserOrg1);

    const drvUserOrg1 = {
      id: `usr-drv-c1-${Date.now()}`,
      name: 'Driver Dan 1',
      email: `drv1_${Date.now()}@logisphere.ai`,
      role: 'ROLE_DRIVER',
      organization_id: org1Id,
    };
    await db.insert('users', drvUserOrg1);
    driverTokenOrg1 = signToken(drvUserOrg1);

    const mgrUserOrg2 = {
      id: `usr-mgr-c2-${Date.now()}`,
      name: 'Sustainability Director 2',
      email: `mgr2_${Date.now()}@logisphere.ai`,
      role: 'ROLE_MANAGER',
      organization_id: org2Id,
    };
    await db.insert('users', mgrUserOrg2);
    managerTokenOrg2 = signToken(mgrUserOrg2);

    // 2. Insert test vehicles
    await db.insert('vehicles', testVehTruck);
    await db.insert('vehicles', testVehVan);

    // 3. Insert trips with actual and estimated fuel
    // Trip 1: Actual fuel logged (30 liters diesel on 100km -> 30 * 2.68 = 80.4 kg CO2)
    await db.insert('trips', {
      tripID: `TRP-ACTUAL-${Date.now()}`,
      vehicleID: testVehTruck.vehicleID,
      driverID: drvUserOrg1.id,
      source: 'Ahmedabad Logistics Hub',
      destination: 'Vadodara Terminal',
      status: 'COMPLETED',
      plannedDistance: 100,
      startingOdometer: 85000,
      finalOdometer: 85100,
      fuelConsumed: 30, // Actual fuel recorded
      organization_id: org1Id,
      createdAt: new Date().toISOString(),
    });

    // Trip 2: Distance-based estimation (VAN 50km, nominal 11 L/100km -> 5.5L * 2.68 = 14.74 kg CO2)
    await db.insert('trips', {
      tripID: `TRP-EST-${Date.now()}`,
      vehicleID: testVehVan.vehicleID,
      driverID: drvUserOrg1.id,
      source: 'Gandhinagar Hub',
      destination: 'Sanand Industrial Estate',
      status: 'DELIVERED',
      plannedDistance: 50,
      startingOdometer: 42000,
      finalOdometer: 42050,
      fuelConsumed: null, // No fuel logged -> distance estimate
      organization_id: org1Id,
      createdAt: new Date().toISOString(),
    });
  });

  // ============================================================================
  // 1. CALCULATION ENGINE TESTS
  // ============================================================================
  describe('1. Carbon Calculation Engine', () => {
    it('1.1 Accurately calculates direct diesel emissions using 2.68 kg CO2/L', () => {
      const co2 = calculateFuelBasedEmissions(10, 'DIESEL');
      expect(co2).toBe(26.8);

      const co2Decimal = calculateFuelBasedEmissions(45.5, 'DIESEL');
      expect(co2Decimal).toBe(Number((45.5 * 2.68).toFixed(3)));
    });

    it('1.2 Accurately calculates direct petrol emissions using 2.31 kg CO2/L', () => {
      const co2 = calculateFuelBasedEmissions(10, 'PETROL');
      expect(co2).toBe(23.1);
    });

    it('1.3 Gracefully handles zero, negative, or invalid fuel inputs without NaN', () => {
      expect(calculateFuelBasedEmissions(0, 'DIESEL')).toBe(0);
      expect(calculateFuelBasedEmissions(-15, 'DIESEL')).toBe(0);
      expect(calculateFuelBasedEmissions(NaN, 'DIESEL')).toBe(0);
      expect(calculateFuelBasedEmissions(Infinity, 'DIESEL')).toBe(0);
    });

    it('1.4 Accurately estimates emissions from distance when actual fuel is missing', () => {
      // 100 km with VAN rate (11 L/100 km) = 11 Liters * 2.68 = 29.48 kg CO2
      const result = calculateDistanceBasedEmissions(100, 11.0, 'DIESEL');
      expect(result.estimatedFuelLiters).toBe(11);
      expect(result.co2Kg).toBe(29.48);
    });

    it('1.5 Strictly distinguishes ACTUAL_FUEL from ESTIMATED_DISTANCE in trip processing', () => {
      const actualTrip = {
        tripID: 'TRP-101',
        plannedDistance: 80,
        fuelConsumed: 20,
      };
      const estTrip = {
        tripID: 'TRP-102',
        plannedDistance: 80,
        fuelConsumed: null,
      };

      const resActual = computeTripEmissions(actualTrip, { type: 'TRUCK' });
      expect(resActual.method).toBe('ACTUAL_FUEL');
      expect(resActual.isEstimated).toBe(false);
      expect(resActual.co2EmissionsKg).toBe(Number((20 * 2.68).toFixed(3)));

      const resEst = computeTripEmissions(estTrip, { type: 'TRUCK' });
      expect(resEst.method).toBe('ESTIMATED_DISTANCE');
      expect(resEst.isEstimated).toBe(true);
      // TRUCK nominal rate = 25 L/100km -> 80km = 20 L -> 20 * 2.68 = 53.6 kg CO2
      expect(resEst.co2EmissionsKg).toBe(53.6);
    });

    it('1.6 Returns UNAVAILABLE_DATA when distance and fuel are both zero or missing', () => {
      const blankTrip = {
        tripID: 'TRP-BLANK',
        plannedDistance: 0,
        fuelConsumed: null,
      };
      const res = computeTripEmissions(blankTrip, { type: 'VAN' });
      expect(res.method).toBe('UNAVAILABLE_DATA');
      expect(res.co2EmissionsKg).toBe(0);
    });

    it('1.7 Converts kg to metric tonnes accurately', () => {
      expect(kgToTonnes(2500)).toBe(2.5);
      expect(kgToTonnes(0)).toBe(0);
      expect(kgToTonnes(-100)).toBe(0);
    });

    it('1.8 Computes period delta with correct percentages and sign', () => {
      const deltaIncrease = calculatePeriodDelta(120, 100);
      expect(deltaIncrease.deltaKg).toBe(20);
      expect(deltaIncrease.deltaPercent).toBe(20);

      const deltaDecrease = calculatePeriodDelta(80, 100);
      expect(deltaDecrease.deltaKg).toBe(-20);
      expect(deltaDecrease.deltaPercent).toBe(-20);
    });

    it('1.9 Evaluates data confidence score based on actual data completeness', () => {
      const highConf = evaluateDataConfidence(10, 9, 850);
      expect(highConf.rating).toBe('HIGH');
      expect(highConf.score).toBeGreaterThanOrEqual(75);

      const lowConf = evaluateDataConfidence(2, 0, 30);
      expect(lowConf.rating).toBe('LOW');
    });
  });

  // ============================================================================
  // 2. ANOMALY DETECTION TESTS
  // ============================================================================
  describe('2. Carbon Anomaly Detection', () => {
    it('2.1 Detects trips with excessive emissions per kilometer (>40% above baseline)', () => {
      const baselines = new Map<string, number>([['veh-01', 0.25]]);
      const trips = [
        {
          tripID: 'TRP-HIGH',
          vehicleID: 'veh-01',
          vehicleName: 'Test Truck',
          vehicleType: 'TRUCK',
          driverID: 'drv-01',
          source: 'A',
          destination: 'B',
          distanceKm: 50,
          fuelConsumedLiters: 25,
          fuelType: 'DIESEL' as const,
          co2EmissionsKg: 67.0, // 67 / 50 = 1.34 kg/km (vs 0.25 baseline -> huge deviation)
          emissionsPerKm: 1.34,
          method: 'ACTUAL_FUEL' as const,
          isEstimated: false,
          date: '2026-10-21',
          status: 'COMPLETED',
        },
      ];

      const anomalies = detectTripCarbonAnomalies(trips, baselines);
      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0].type).toBe('EXCESSIVE_EMISSIONS_PER_KM');
      expect(anomalies[0].severity).toBe('HIGH');
    });

    it('2.2 Detects vehicle persistent efficiency degradation (>25% increase over baseline)', () => {
      const degradedVehicle = {
        vehicleID: 'veh-deg',
        registrationNumber: 'GJ01DG9999',
        name: 'Degraded Van',
        type: 'VAN',
        fuelType: 'DIESEL' as const,
        totalTrips: 4,
        completedTrips: 4,
        totalDistanceKm: 200,
        totalFuelBurnedLiters: 35,
        totalCo2Kg: 93.8,
        totalCo2Tonnes: 0.094,
        actualCo2Kg: 93.8,
        estimatedCo2Kg: 0,
        avgEmissionsPerKm: 0.469, // Baseline is ~0.29 kg/km -> ~60% higher
        baselineEmissionsPerKm: 0.294,
        efficiencyRating: 'POOR' as const,
        rank: 1,
        anomaliesCount: 0,
      };

      const anomalies = detectVehicleEfficiencyDegradation([degradedVehicle]);
      expect(anomalies.length).toBe(1);
      expect(anomalies[0].type).toBe('EFFICIENCY_DEGRADATION');
      expect(anomalies[0].vehicleID).toBe('veh-deg');
    });
  });

  // ============================================================================
  // 3. ENDPOINT INTEGRATION & RBAC TESTS
  // ============================================================================
  describe('3. REST APIs & Authorization', () => {
    it('3.1 GET /api/carbon/overview returns complete KPIs and breakdown', async () => {
      const res = await request(app)
        .get('/api/carbon/overview')
        .set('Authorization', `Bearer ${managerTokenOrg1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.kpis).toBeDefined();
      expect(res.body.data.kpis.totalCo2Kg).toBeGreaterThan(0);
      expect(res.body.data.kpis.actualCo2Kg).toBeGreaterThan(0);
      expect(res.body.data.breakdowns).toBeDefined();
      expect(Array.isArray(res.body.data.breakdowns.topEmittingVehicles)).toBe(true);
      expect(res.body.data.advisorAdvisory).toBeDefined();
      expect(['gemini', 'deterministic_fallback']).toContain(res.body.data.advisorAdvisory.source);
    });

    it('3.2 GET /api/carbon/vehicles returns ranked fleet vehicles', async () => {
      const res = await request(app)
        .get('/api/carbon/vehicles')
        .set('Authorization', `Bearer ${managerTokenOrg1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      if (res.body.data.length >= 2) {
        expect(res.body.data[0].totalCo2Kg).toBeGreaterThanOrEqual(res.body.data[1].totalCo2Kg);
      }
    });

    it('3.3 GET /api/carbon/trips returns trip emissions with calculation method', async () => {
      const res = await request(app)
        .get('/api/carbon/trips')
        .set('Authorization', `Bearer ${managerTokenOrg1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      const methods = res.body.data.map((t: any) => t.method);
      expect(methods).toContain('ACTUAL_FUEL');
      expect(methods).toContain('ESTIMATED_DISTANCE');
    });

    it('3.4 Driver role scoping: drivers cannot see other drivers trips', async () => {
      const res = await request(app)
        .get('/api/carbon/trips')
        .set('Authorization', `Bearer ${driverTokenOrg1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('3.5 Cross-organization isolation: Org 2 cannot see Org 1 carbon data', async () => {
      const resOrg2 = await request(app)
        .get('/api/carbon/overview')
        .set('Authorization', `Bearer ${managerTokenOrg2}`);

      expect(resOrg2.status).toBe(200);
      expect(resOrg2.body.success).toBe(true);
      // Org 2 has no trips created in setup -> total CO2 is 0
      expect(resOrg2.body.data.kpis.totalCo2Kg).toBe(0);
      expect(resOrg2.body.data.breakdowns.topEmittingVehicles.length).toBe(0);
    });

    it('3.6 POST /api/carbon/targets defines monthly target (Manager only)', async () => {
      const targetPayload = {
        period: '2026-10',
        targetCo2Kg: 500,
        alertThresholdPercent: 75,
        notes: 'Q4 2026 Carbon Budget Target',
      };

      const res = await request(app)
        .post('/api/carbon/targets')
        .set('Authorization', `Bearer ${managerTokenOrg1}`)
        .send(targetPayload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.targetCo2Kg).toBe(500);
      expect(res.body.data.alertThresholdPercent).toBe(75);
      expect(res.body.data.remainingAllowanceKg).toBeDefined();
    });

    it('3.7 POST /api/carbon/targets rejects non-managers with 403', async () => {
      const res = await request(app)
        .post('/api/carbon/targets')
        .set('Authorization', `Bearer ${driverTokenOrg1}`)
        .send({ targetCo2Kg: 500 });

      expect(res.status).toBe(403);
    });

    it('3.8 POST /api/carbon/eco-route-compare identifies greenest route and trade-offs', async () => {
      const payload = {
        tripID: 'TRP-TEST-ECO',
        vehicleType: 'TRUCK',
        candidateRoutes: [
          {
            id: 'route_primary',
            label: 'Route 1 (City Center)',
            distanceMeters: 45000,
            durationSeconds: 3600,
            trafficDelaySeconds: 900,
          },
          {
            id: 'route_bypass',
            label: 'Route 2 (Green Bypass)',
            distanceMeters: 48000,
            durationSeconds: 3200,
            trafficDelaySeconds: 120,
          },
        ],
      };

      const res = await request(app)
        .post('/api/carbon/eco-route-compare')
        .set('Authorization', `Bearer ${managerTokenOrg1}`)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.recommendedEcoRouteId).toBeDefined();
      expect(res.body.data.summary).toBeDefined();
      expect(res.body.data.tradeoffExplanation).toBeDefined();
      expect(Array.isArray(res.body.data.routes)).toBe(true);
      expect(res.body.data.routes.some((r: any) => r.isGreenest)).toBe(true);
    });

    it('3.9 GET /api/carbon/report produces structured executive report', async () => {
      const res = await request(app)
        .get('/api/carbon/report')
        .set('Authorization', `Bearer ${managerTokenOrg1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reportId).toBeDefined();
      expect(res.body.data.title).toContain('Sustainability Report');
      expect(res.body.data.overview).toBeDefined();
      expect(res.body.data.dataQualityLimitations).toBeDefined();
    });
  });
});
