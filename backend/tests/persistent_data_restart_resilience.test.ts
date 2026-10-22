import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import path from 'path';
import { app } from '../src/app';
import { db } from '../src/config/database';
import { signToken } from '../src/middleware/auth';
import { env, hasSupabase } from '../src/config/env';

describe('Persistent Data Restart Resilience & Tenant Isolation Suite', { timeout: 35000 }, () => {
  const testOrgId = '805c901d-5038-462c-9f87-4857d7afed10'; // Century Industries
  const foreignOrgId = '00000000-0000-0000-0000-000000000099';
  let managerToken: string;
  let foreignManagerToken: string;

  beforeAll(async () => {
    managerToken = signToken({
      id: 'usr-century-mgr',
      userId: 'usr-century-mgr',
      email: 'manager@yopmail.com',
      role: 'ROLE_MANAGER',
      organization_id: testOrgId,
      organizationId: testOrgId,
    });

    foreignManagerToken = signToken({
      id: 'usr-foreign-mgr',
      userId: 'usr-foreign-mgr',
      email: 'foreign.manager@yopmail.com',
      role: 'ROLE_MANAGER',
      organization_id: foreignOrgId,
      organizationId: foreignOrgId,
    });
  });

  describe('1. Environment Configuration & Path Independence', () => {
    it('Backend loads configuration reliably with absolute path resolution', () => {
      expect(env.PORT).toBeDefined();
      expect(env.PORT).toBeGreaterThan(0);
      expect(env.PORT).not.toBe(5000); // 5001 avoids macOS AirPlay collision
    });

    it('hasSupabase is properly resolved in persistent development mode', () => {
      expect(hasSupabase).toBe(true);
      expect(env.SUPABASE_URL).toContain('supabase.co');
      expect(env.SUPABASE_SERVICE_ROLE_KEY.length).toBeGreaterThan(20);
    });
  });

  describe('2. Persistent Driver Retrieval via Organization Memberships', () => {
    it('Retrieves verified drivers for the authenticated organization without in-memory state', async () => {
      const res = await request(app)
        .get('/api/user?role=ROLE_DRIVER')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      // Verify all returned users belong to the caller's organization
      for (const driver of res.body) {
        expect(driver.organization_id || driver.organizationId).toBe(testOrgId);
      }

      // Confirm expected verified drivers are present
      const driverEmails = res.body.map((d: any) => d.email);
      expect(driverEmails).toContain('driver@yopmail.com');
    });

    it('Strict Tenant Isolation: Foreign organization receives 0 drivers from Century Industries', async () => {
      const res = await request(app)
        .get('/api/user?role=ROLE_DRIVER')
        .set('Authorization', `Bearer ${foreignManagerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      // Foreign organization must never see Century Industries drivers
      const driverEmails = res.body.map((d: any) => d.email);
      expect(driverEmails).not.toContain('driver@yopmail.com');
    });
  });

  describe('3. Persistent Vehicle Retrieval & Fresh Process Simulation', () => {
    it('Retrieves vehicles for the authenticated organization directly from database', async () => {
      const res = await request(app)
        .get('/api/vehicle')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(4);

      const regNumbers = res.body.map((v: any) => v.registrationNumber);
      expect(regNumbers).toContain('GJ01BA6030');
      expect(regNumbers).toContain('GJ01YK9940');
      expect(regNumbers).toContain('BR19TR5489');
      expect(regNumbers).toContain('HR26WE6678');

      for (const vehicle of res.body) {
        expect(vehicle.organization_id || vehicle.organizationId).toBe(testOrgId);
      }
    });

    it('Simulated Restart: db.list directly returns vehicles without fake defaultOrgId stamping', async () => {
      const vehicles = await db.list('vehicles', { organization_id: testOrgId });
      expect(Array.isArray(vehicles)).toBe(true);
      expect(vehicles.length).toBe(4);

      for (const v of vehicles) {
        expect(v.organization_id).toBe(testOrgId);
        expect(v.organization_id).not.toBe('00000000-0000-0000-0000-000000000001');
      }
    });
  });

  describe('4. Dashboard Summary Resilience', () => {
    it('Dashboard KPIs reflect persistent records rather than 0 metrics', async () => {
      const res = await request(app)
        .get('/api/dashboard/summary')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.activeVehicles).toBe(4);
      expect(res.body.availableVehicles).toBe(4);
      expect(res.body.driversOnDuty).toBe(4);
    });
  });

  describe('5. Database Abstraction Error Handling (No Silent Swallowing)', () => {
    it('db.insert rejects invalid foreign keys or constraints with explicit error when Supabase is active', async () => {
      if (!hasSupabase) return;

      // Inserting into vehicles with an invalid/non-existent primary key or non-existent FK
      let threwError = false;
      try {
        await db.insert('trips', {
          tripID: 'invalid-trip-' + Date.now(),
          source: 'A',
          destination: 'B',
          vehicleID: 'non-existent-veh-id-123456789',
          driverID: 'non-existent-driver-id-123456789',
          organization_id: '00000000-0000-0000-0000-000000000000', // Non-existent organization
        });
      } catch (err: any) {
        threwError = true;
        expect(err).toBeDefined();
        expect(err.message).toMatch(/(failed|constraint|foreign key|violat)/i);
      }

      expect(threwError).toBe(true);
    });
  });
});
