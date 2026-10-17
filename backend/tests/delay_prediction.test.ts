import request from 'supertest';
import { describe, expect, it, beforeAll } from 'vitest';
import { app } from '../src/app';
import { signToken } from '../src/middleware/auth';
import { db } from '../src/config/database';
import { calculateTripDelayInsights } from '../src/modules/trips/delayPredictionService';

describe('LogiSphere AI — Smart Delay Prediction & Explanation', () => {
  let managerUser: any;
  let driverUser: any;
  let managerToken: string;
  let activeTripOnSchedule: any;
  let activeTripDelayed: any;
  let completedTrip: any;

  beforeAll(async () => {
    const timestamp = Date.now();

    managerUser = await db.insert('users', {
      id: `usr-mgr-dp-${timestamp}`,
      name: 'Aditi Dispatch Manager',
      email: `aditi_dp_${timestamp}@logisphere.ai`,
      passwordHash: 'dummy-password',
      role: 'ROLE_MANAGER',
    });
    managerToken = signToken(managerUser);

    driverUser = await db.insert('users', {
      id: `usr-drv-dp-${timestamp}`,
      name: 'Mohan Driver',
      email: `mohan_dp_${timestamp}@logisphere.ai`,
      passwordHash: 'dummy-password',
      role: 'ROLE_DRIVER',
      licenseNo: `DL-${timestamp}`,
      licenseExpiryDate: '2028-12-31',
    });

    const vehicle = await db.insert('vehicles', {
      vehicleID: `veh-dp-${timestamp}`,
      registrationNumber: `GJ01DP${timestamp % 10000}`,
      name: 'Swift Courier Van',
      type: 'VAN',
      maxLoadCapacity: 3000,
      odometer: 42000,
      status: 'ON_TRIP',
    });

    // 1. Active trip on schedule (Gandhinagar to Ahmedabad ~30 km, planned ETA 2 hours in the future)
    const futurePlannedETA = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    activeTripOnSchedule = await db.insert('trips', {
      tripID: `TRP-ONTIME-${timestamp}`,
      source: 'Gandhinagar Sector 21',
      sourceLatitude: 23.2156,
      sourceLongitude: 72.6369,
      destination: 'Ahmedabad Ashram Road',
      destinationLatitude: 23.0225,
      destinationLongitude: 72.5714,
      status: 'IN_TRANSIT',
      vehicleID: vehicle.vehicleID,
      driverID: driverUser.id,
      plannedDistance: 32,
      plannedETA: futurePlannedETA,
      cargoWeight: 600,
      createdAt: new Date().toISOString(),
    });

    // Fresh GPS location midway between Gandhinagar and Ahmedabad moving at 45 km/h
    await db.insert('tracking_locations', {
      id: `loc-ontime-${timestamp}`,
      tripID: activeTripOnSchedule.tripID,
      vehicleID: vehicle.vehicleID,
      driverID: driverUser.id,
      latitude: 23.119,
      longitude: 72.604,
      speed: 48,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 2. Active trip running delayed (Planned ETA was 10 minutes ago, vehicle is stationary)
    const pastPlannedETA = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    activeTripDelayed = await db.insert('trips', {
      tripID: `TRP-DELAY-${timestamp}`,
      source: 'Ahmedabad Highway',
      sourceLatitude: 23.0225,
      sourceLongitude: 72.5714,
      destination: 'Surat Ring Road',
      destinationLatitude: 21.1702,
      destinationLongitude: 72.8311,
      status: 'IN_TRANSIT',
      vehicleID: vehicle.vehicleID,
      driverID: driverUser.id,
      plannedDistance: 260,
      plannedETA: pastPlannedETA,
      cargoWeight: 1200,
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    });

    // Vehicle stationary (speed = 0) far from Surat
    await db.insert('tracking_locations', {
      id: `loc-delay-${timestamp}`,
      tripID: activeTripDelayed.tripID,
      vehicleID: vehicle.vehicleID,
      driverID: driverUser.id,
      latitude: 22.3072, // near Vadodara
      longitude: 73.1812,
      speed: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 3. Completed trip
    completedTrip = await db.insert('trips', {
      tripID: `TRP-COMPLETED-${timestamp}`,
      source: 'Warehouse Gandhinagar',
      destination: 'Retail Hub Ahmedabad',
      status: 'DELIVERED',
      vehicleID: vehicle.vehicleID,
      driverID: driverUser.id,
      plannedDistance: 28,
      cargoWeight: 450,
      createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    });
  });

  it('1. Correctly calculates on-schedule trip ETA and predicts low/no delay', async () => {
    const result = await calculateTripDelayInsights(activeTripOnSchedule.tripID);

    expect(result).toBeDefined();
    expect(result.tripID).toBe(activeTripOnSchedule.tripID);
    expect(result.isActive).toBe(true);
    expect(result.isTerminal).toBe(false);
    expect(result.predictedDelayMinutes).toBeLessThanOrEqual(2);
    expect(result.delayRisk).toBe('ON_TIME');
    expect(result.telemetry.currentSpeedKmH).toBe(48);
    expect(result.telemetry.freshness).toBe('LIVE');
    expect(result.reasonCodes).toContain('ON_SCHEDULE');
  });

  it('2. Correctly detects delayed trip with prolonged stop and calculates revised ETA', async () => {
    const result = await calculateTripDelayInsights(activeTripDelayed.tripID);

    expect(result).toBeDefined();
    expect(result.tripID).toBe(activeTripDelayed.tripID);
    expect(result.predictedDelayMinutes).toBeGreaterThan(15);
    expect(['MODERATE_RISK', 'HIGH_RISK']).toContain(result.delayRisk);
    expect(result.reasonCodes).toContain('PROLONGED_STOP');
    expect(result.reasonCodes).toContain('SLOWER_THAN_EXPECTED_PROGRESS');
  });

  it('3. Accurately handles completed and terminal trips without false alerts', async () => {
    const result = await calculateTripDelayInsights(completedTrip.tripID);

    expect(result).toBeDefined();
    expect(result.isTerminal).toBe(true);
    expect(result.isActive).toBe(false);
    expect(result.predictedDelayMinutes).toBe(0);
    expect(result.delayRisk).toBe('ON_TIME');
    expect(result.reasonCodes).toContain('TRIP_COMPLETED');
  });

  it('4. Returns 404 for non-existent trip ID', async () => {
    const res = await request(app)
      .get('/api/trip/TRP-NON-EXISTENT-9999/delay-insights')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(404);
  });

  it('5. Successfully exposes GET /api/trip/:tripId/delay-insights and /api/trips alias', async () => {
    const resSingular = await request(app)
      .get(`/api/trip/${activeTripOnSchedule.tripID}/delay-insights`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(resSingular.status).toBe(200);
    expect(resSingular.body.success).toBe(true);
    expect(resSingular.body.data.tripID).toBe(activeTripOnSchedule.tripID);
    expect(resSingular.body.data.aiExplanation).toBeDefined();

    const resPlural = await request(app)
      .get(`/api/trips/${activeTripOnSchedule.tripID}/delay-insights`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(resPlural.status).toBe(200);
    expect(resPlural.body.success).toBe(true);
  });

  it('6. Generates valid operational explanation and manager recommendations', async () => {
    const result = await calculateTripDelayInsights(activeTripDelayed.tripID);

    expect(result.aiExplanation).toBeDefined();
    expect(['gemini', 'deterministic_fallback']).toContain(result.aiExplanation.source);
    expect(result.aiExplanation.explanation.length).toBeGreaterThan(10);
    expect(Array.isArray(result.aiExplanation.actionableRecommendations)).toBe(true);
    expect(result.aiExplanation.actionableRecommendations.length).toBeGreaterThanOrEqual(1);
  });
});
