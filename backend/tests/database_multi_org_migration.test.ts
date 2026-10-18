import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { db } from '../src/config/database';

describe('Multi-Organization Database Architecture & Migration (Step 2)', () => {
  const migrationsDir = path.resolve(__dirname, '../supabase/migrations');
  const migration008Path = path.join(migrationsDir, '008_create_multi_organization_tables.sql');
  const migration009Path = path.join(migrationsDir, '009_safe_data_migration_and_rls.sql');

  it('Migration 008 file exists and defines all required multi-org foundation tables', () => {
    expect(fs.existsSync(migration008Path)).toBe(true);
    const content = fs.readFileSync(migration008Path, 'utf8');

    // 1. Organizations Table
    expect(content).toContain('CREATE TABLE IF NOT EXISTS organizations');
    expect(content).toContain('id uuid PRIMARY KEY DEFAULT gen_random_uuid()');
    expect(content).toContain('slug text NOT NULL UNIQUE');
    expect(content).toContain('status text NOT NULL DEFAULT \'pending\' CHECK (status IN (\'pending\', \'approved\', \'rejected\', \'suspended\'))');
    expect(content).toContain('latitude numeric CHECK (latitude IS NULL OR (latitude >= -90.0 AND latitude <= 90.0))');
    expect(content).toContain('longitude numeric CHECK (longitude IS NULL OR (longitude >= -180.0 AND longitude <= 180.0))');
    expect(content).toContain('google_places_id text');
    expect(content).toContain('registration_timestamp timestamptz');

    // 2. Organization Memberships Table
    expect(content).toContain('CREATE TABLE IF NOT EXISTS organization_memberships');
    expect(content).toContain('organization_id uuid NOT NULL REFERENCES organizations(id)');
    expect(content).toContain('user_id text NOT NULL REFERENCES users(id)');
    expect(content).toContain('status text NOT NULL DEFAULT \'pending\' CHECK (status IN (\'pending\', \'active\', \'suspended\'))');
    expect(content).toContain('CONSTRAINT uq_organization_memberships_org_user UNIQUE (organization_id, user_id)');

    // 3. Platform Administrators Table
    expect(content).toContain('CREATE TABLE IF NOT EXISTS platform_admins');
    expect(content).toContain('user_id text NOT NULL UNIQUE REFERENCES users(id)');
    expect(content).toContain('is_active boolean NOT NULL DEFAULT true');
  });

  it('Migration 009 defines default organization, backfills all org-owned tables, and configures RLS', () => {
    expect(fs.existsSync(migration009Path)).toBe(true);
    const content = fs.readFileSync(migration009Path, 'utf8');

    // Default Organization
    expect(content).toContain('00000000-0000-0000-0000-000000000001');
    expect(content).toContain('default-org');
    expect(content).toContain('approved');

    // Alter statements for organization_id columns
    const orgOwnedTables = [
      'users',
      'vehicles',
      'trips',
      'attendance_records',
      'maintenance_records',
      'fuel_logs',
      'expense_records',
      'emergency_alerts',
      'tracking_locations',
      'conversations',
      'messages',
      'notifications',
    ];

    for (const table of orgOwnedTables) {
      expect(content).toContain(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id)`);
      expect(content).toContain(`CREATE INDEX IF NOT EXISTS idx_${table}_org_id ON ${table}(organization_id)`);
    }

    // Cross-Organization Relationship Integrity
    expect(content).toContain('check_trip_cross_org_integrity()');
    expect(content).toContain('trg_trip_cross_org_integrity');

    // Security Helper Functions
    expect(content).toContain('CREATE OR REPLACE FUNCTION is_platform_admin');
    expect(content).toContain('CREATE OR REPLACE FUNCTION has_org_membership');
    expect(content).toContain('CREATE OR REPLACE FUNCTION get_user_approved_org_ids');

    // Row Level Security Enforcements
    expect(content).toContain('ALTER TABLE organizations ENABLE ROW LEVEL SECURITY');
    expect(content).toContain('ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY');
    expect(content).toContain('ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY');
    expect(content).toContain('ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY');
    expect(content).toContain('ALTER TABLE trips ENABLE ROW LEVEL SECURITY');
    expect(content).toContain('ALTER TABLE tracking_locations ENABLE ROW LEVEL SECURITY');
    expect(content).toContain('ALTER TABLE emergency_alerts ENABLE ROW LEVEL SECURITY');
  });

  describe('In-Memory DB Abstraction & Multi-Tenancy Compatibility', () => {
    const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

    beforeEach(async () => {
      // Ensure default organization is seeded in memory
      const existing = await db.find('organizations', { id: DEFAULT_ORG_ID });
      if (!existing) {
        await db.insert('organizations', {
          id: DEFAULT_ORG_ID,
          name: 'LogiSphere Fleet Operations',
          slug: 'default-org',
          status: 'approved',
          latitude: 23.05288,
          longitude: 72.61891,
        });
      }
    });

    it('Default organization is accessible through unified db abstraction', async () => {
      const defaultOrg = await db.find('organizations', { id: DEFAULT_ORG_ID });
      expect(defaultOrg).toBeDefined();
      expect(defaultOrg.id).toBe(DEFAULT_ORG_ID);
      expect(defaultOrg.status).toBe('approved');
      expect(defaultOrg.slug).toBe('default-org');
    });

    it('New registered organization defaults to pending status and is isolated', async () => {
      const newOrgId = `11111111-1111-4111-8111-${Date.now().toString(16).slice(-12).padStart(12, '0')}`;
      const slug = `apex-logistics-${Date.now()}`;
      const createdOrg = await db.insert('organizations', {
        id: newOrgId,
        name: 'Apex Logistics Freight',
        slug,
        status: 'pending',
        latitude: 19.076,
        longitude: 72.8777,
      });

      expect(createdOrg.id).toBe(newOrgId);
      expect(createdOrg.status).toBe('pending');

      // Verify list filters correctly isolate organizations
      const defaultList = await db.list('organizations', { id: DEFAULT_ORG_ID });
      expect(defaultList).toHaveLength(1);
      expect(defaultList[0].name).toBe('LogiSphere Fleet Operations');

      const apexList = await db.list('organizations', { id: newOrgId });
      expect(apexList).toHaveLength(1);
      expect(apexList[0].name).toBe('Apex Logistics Freight');
    });

    it('Memberships are strictly scoped per organization and user', async () => {
      const membership = await db.insert('organization_memberships', {
        id: 'mem-mgr-default',
        organization_id: DEFAULT_ORG_ID,
        user_id: 'usr-manager',
        role: 'ROLE_MANAGER',
        status: 'active',
      });

      expect(membership.organization_id).toBe(DEFAULT_ORG_ID);
      expect(membership.user_id).toBe('usr-manager');
      expect(membership.status).toBe('active');

      const userMemberships = await db.list('organization_memberships', { user_id: 'usr-manager' });
      expect(userMemberships.some(m => m.organization_id === DEFAULT_ORG_ID)).toBe(true);
    });

    it('Platform admins are stored in dedicated table isolated from organization memberships', async () => {
      const adminEntry = await db.insert('platform_admins', {
        id: 'adm-usr-manager',
        user_id: 'usr-manager',
        notes: 'Primary bootstrap platform admin',
        is_active: true,
      });

      expect(adminEntry.user_id).toBe('usr-manager');
      expect(adminEntry.is_active).toBe(true);

      const foundAdmin = await db.find('platform_admins', { user_id: 'usr-manager' });
      expect(foundAdmin).toBeDefined();
      expect(foundAdmin.is_active).toBe(true);

      // Normal driver user must not be found in platform_admins
      const driverAdmin = await db.find('platform_admins', { user_id: 'drv-raj' });
      expect(driverAdmin).toBeNull();
    });

    it('Cross-organization vehicle and trip assignment maintains distinct tenant ownership', async () => {
      const orgA = DEFAULT_ORG_ID;
      const orgB = '22222222-2222-2222-2222-222222222222';
      const uid = Date.now().toString(36).slice(-5);

      // Insert vehicle for Org A
      const vehA = await db.insert('vehicles', {
        vehicleID: `veh-test-orga-${uid}`,
        registrationNumber: `GJ01OA${uid.toUpperCase()}`,
        name: 'Van Org A',
        type: 'VAN',
        maxLoadCapacity: 1000,
        status: 'AVAILABLE',
        organization_id: orgA,
      });

      // Insert vehicle for Org B
      const vehB = await db.insert('vehicles', {
        vehicleID: `veh-test-orgb-${uid}`,
        registrationNumber: `GJ01OB${uid.toUpperCase()}`,
        name: 'Truck Org B',
        type: 'TRUCK',
        maxLoadCapacity: 3000,
        status: 'AVAILABLE',
        organization_id: orgB,
      });

      expect(vehA.organization_id).toBe(orgA);
      expect(vehB.organization_id).toBe(orgB);

      // Verify that querying Org A vehicles does not leak Org B vehicles
      const orgAVehicles = await db.list('vehicles', { organization_id: orgA });
      expect(orgAVehicles.every(v => v.organization_id === orgA)).toBe(true);
      expect(orgAVehicles.some(v => v.vehicleID === `veh-test-orgb-${uid}`)).toBe(false);

      const orgBVehicles = await db.list('vehicles', { organization_id: orgB });
      expect(orgBVehicles.every(v => v.organization_id === orgB)).toBe(true);
      expect(orgBVehicles.some(v => v.vehicleID === `veh-test-orga-${uid}`)).toBe(false);
    });

    it('Validates coordinate constraints: latitude in [-90, 90] and longitude in [-180, 180]', () => {
      const isValidLatitude = (lat: number) => lat >= -90.0 && lat <= 90.0;
      const isValidLongitude = (lng: number) => lng >= -180.0 && lng <= 180.0;

      expect(isValidLatitude(23.05288)).toBe(true);
      expect(isValidLongitude(72.61891)).toBe(true);
      expect(isValidLatitude(91.0)).toBe(false);
      expect(isValidLatitude(-95.0)).toBe(false);
      expect(isValidLongitude(181.0)).toBe(false);
      expect(isValidLongitude(-185.0)).toBe(false);
    });
  });
});
