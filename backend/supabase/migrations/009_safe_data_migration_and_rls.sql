-- ==============================================================================
-- Migration 009: Safe Existing-Data Migration & Row Level Security (RLS)
--
-- Actions:
--   1. Provisions Default Organization ('00000000-0000-0000-0000-000000000001')
--   2. Adds nullable organization_id UUID columns with FKs to all org-owned tables
--   3. Safely backfills historical single-tenant data into the Default Organization
--   4. Adds performance indexes on organization_id columns
--   5. Implements cross-tenant relationship integrity constraint functions
--   6. Configures non-recursive RLS security helper functions (SECURITY DEFINER)
--   7. Enables RLS and establishes strict tenant isolation policies across all tables
-- ==============================================================================

DO $$
BEGIN

-- ------------------------------------------------------------------------------
-- 1. Provision Default Organization
-- ------------------------------------------------------------------------------
INSERT INTO organizations (
  id,
  name,
  slug,
  formatted_address,
  latitude,
  longitude,
  status,
  registration_timestamp,
  reviewed_at,
  review_reason,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'LogiSphere Fleet Operations',
  'default-org',
  'LogiSphere Headquarters, Ahmedabad, Gujarat, India',
  23.05288,
  72.61891,
  'approved',
  now(),
  now(),
  'System bootstrap: Default organization for existing installation',
  now(),
  now()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  status = 'approved',
  updated_at = now();

END $$;

-- ------------------------------------------------------------------------------
-- 2. Add organization_id Columns to Organization-Owned Tables
-- ------------------------------------------------------------------------------

-- Users (Primary account profile)
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL;

-- Fleet Vehicles
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

-- Trips
ALTER TABLE trips ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

-- Attendance Records
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

-- Maintenance Records
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

-- Fuel Logs
ALTER TABLE fuel_logs ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

-- Expense Records
ALTER TABLE expense_records ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

-- Emergency SOS Alerts
ALTER TABLE emergency_alerts ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL;

-- Live GPS Tracking Locations
ALTER TABLE tracking_locations ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

-- Chat Conversations & Messages
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

-- Operational Notifications
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

-- ------------------------------------------------------------------------------
-- 3. Safe Existing-Data Backfill
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  default_org_id uuid := '00000000-0000-0000-0000-000000000001'::uuid;
BEGIN

  -- 3.1 Backfill Users
  UPDATE users 
  SET organization_id = default_org_id 
  WHERE organization_id IS NULL;

  -- 3.2 Create Active Memberships for Existing Users
  INSERT INTO organization_memberships (
    organization_id,
    user_id,
    role,
    status,
    created_at,
    updated_at
  )
  SELECT
    default_org_id,
    u.id,
    u.role,
    'active',
    COALESCE(u.createdAt, now()),
    now()
  FROM users u
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  -- 3.3 Provision Initial Platform Administrator
  -- Initial platform administrator is seeded strictly from the existing primary manager
  INSERT INTO platform_admins (user_id, notes, is_active, granted_at)
  SELECT 
    id, 
    'Bootstrapped as platform administrator during multi-org migration', 
    true, 
    now()
  FROM users
  WHERE role = 'ROLE_MANAGER' OR email = 'manager@logisphere.ai'
  ORDER BY createdAt ASC
  LIMIT 1
  ON CONFLICT (user_id) DO NOTHING;

  -- 3.4 Backfill Vehicles
  UPDATE vehicles 
  SET organization_id = default_org_id 
  WHERE organization_id IS NULL;

  -- 3.5 Backfill Trips
  UPDATE trips 
  SET organization_id = default_org_id 
  WHERE organization_id IS NULL;

  -- 3.6 Backfill Attendance Records (Inherits from user's org, fallback to default_org_id)
  UPDATE attendance_records ar
  SET organization_id = COALESCE(u.organization_id, default_org_id)
  FROM users u
  WHERE ar.userId = u.id AND ar.organization_id IS NULL;

  UPDATE attendance_records
  SET organization_id = default_org_id
  WHERE organization_id IS NULL;

  -- 3.7 Backfill Maintenance Records (Inherits from vehicle's org, fallback to default_org_id)
  UPDATE maintenance_records mr
  SET organization_id = COALESCE(v.organization_id, default_org_id)
  FROM vehicles v
  WHERE mr.vehicleID = v.vehicleID AND mr.organization_id IS NULL;

  UPDATE maintenance_records
  SET organization_id = default_org_id
  WHERE organization_id IS NULL;

  -- 3.8 Backfill Fuel Logs (Inherits from vehicle's org, fallback to default_org_id)
  UPDATE fuel_logs fl
  SET organization_id = COALESCE(v.organization_id, default_org_id)
  FROM vehicles v
  WHERE fl.vehicleID = v.vehicleID AND fl.organization_id IS NULL;

  UPDATE fuel_logs
  SET organization_id = default_org_id
  WHERE organization_id IS NULL;

  -- 3.9 Backfill Expense Records (Inherits from trip's org or vehicle's org)
  UPDATE expense_records er
  SET organization_id = COALESCE(t.organization_id, v.organization_id, default_org_id)
  FROM trips t
  LEFT JOIN vehicles v ON t.vehicleID = v.vehicleID
  WHERE er.tripID = t.tripID AND er.organization_id IS NULL;

  UPDATE expense_records
  SET organization_id = default_org_id
  WHERE organization_id IS NULL;

  -- 3.10 Backfill Emergency SOS Alerts
  UPDATE emergency_alerts
  SET organization_id = default_org_id
  WHERE organization_id IS NULL;

  -- 3.11 Backfill Live GPS Tracking Locations
  UPDATE tracking_locations tl
  SET organization_id = COALESCE(t.organization_id, v.organization_id, default_org_id)
  FROM trips t
  LEFT JOIN vehicles v ON t.vehicleID = v.vehicleID
  WHERE (tl.tripID = t.tripID OR tl.vehicleID = v.vehicleID) AND tl.organization_id IS NULL;

  UPDATE tracking_locations
  SET organization_id = default_org_id
  WHERE organization_id IS NULL;

  -- 3.12 Backfill Conversations, Messages & Notifications
  UPDATE conversations SET organization_id = default_org_id WHERE organization_id IS NULL;
  UPDATE messages SET organization_id = default_org_id WHERE organization_id IS NULL;
  UPDATE notifications SET organization_id = default_org_id WHERE organization_id IS NULL;

END $$;

-- ------------------------------------------------------------------------------
-- 4. Create Performance Indexes on organization_id
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_org_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_org_id ON vehicles(organization_id);
CREATE INDEX IF NOT EXISTS idx_trips_org_id ON trips(organization_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_org_id ON attendance_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_org_id ON maintenance_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_org_id ON fuel_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_expense_records_org_id ON expense_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_org_id ON emergency_alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_tracking_locations_org_id ON tracking_locations(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversations_org_id ON conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_messages_org_id ON messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_org_id ON notifications(organization_id);

-- Composite indexes for frequent scoped queries
CREATE INDEX IF NOT EXISTS idx_vehicles_org_status ON vehicles(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_trips_org_status ON trips(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_org_status ON emergency_alerts(organization_id, status);

-- ------------------------------------------------------------------------------
-- 5. Cross-Organization Relationship Integrity Checks
-- ------------------------------------------------------------------------------
-- Ensures a trip cannot be dispatched with a vehicle belonging to another organization
CREATE OR REPLACE FUNCTION check_trip_cross_org_integrity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_org uuid;
BEGIN
  IF NEW.vehicleID IS NOT NULL THEN
    SELECT organization_id INTO v_org FROM vehicles WHERE vehicleID = NEW.vehicleID;
    IF v_org IS NOT NULL AND NEW.organization_id IS NOT NULL AND v_org <> NEW.organization_id THEN
      RAISE EXCEPTION 'Cross-organization violation: Vehicle % belongs to organization %, not trip organization %',
        NEW.vehicleID, v_org, NEW.organization_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trip_cross_org_integrity ON trips;
CREATE TRIGGER trg_trip_cross_org_integrity
  BEFORE INSERT OR UPDATE ON trips
  FOR EACH ROW
  EXECUTE FUNCTION check_trip_cross_org_integrity();

-- ------------------------------------------------------------------------------
-- 6. Non-Recursive Security Helper Functions (SECURITY DEFINER)
-- ------------------------------------------------------------------------------
-- Resolves the current authenticated user ID from Supabase auth JWT claims
CREATE OR REPLACE FUNCTION get_auth_user_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    auth.uid()::text
  );
$$;

-- Checks if a user is an active Platform Administrator
CREATE OR REPLACE FUNCTION is_platform_admin(check_user_id text DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM platform_admins 
    WHERE user_id = COALESCE(check_user_id, get_auth_user_id())
      AND is_active = true
  );
$$;

-- Checks if a user has an active membership in an approved organization
CREATE OR REPLACE FUNCTION has_org_membership(
  check_org_id uuid,
  check_user_id text DEFAULT NULL,
  allowed_roles text[] DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM organization_memberships om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.organization_id = check_org_id
      AND om.user_id = COALESCE(check_user_id, get_auth_user_id())
      AND om.status = 'active'
      AND o.status = 'approved'
      AND (allowed_roles IS NULL OR om.role = ANY(allowed_roles))
  );
$$;

-- Returns set of approved organization IDs that the user belongs to
CREATE OR REPLACE FUNCTION get_user_approved_org_ids(check_user_id text DEFAULT NULL)
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT om.organization_id
  FROM organization_memberships om
  JOIN organizations o ON o.id = om.organization_id
  WHERE om.user_id = COALESCE(check_user_id, get_auth_user_id())
    AND om.status = 'active'
    AND o.status = 'approved';
$$;

-- ------------------------------------------------------------------------------
-- 7. Enable Row Level Security (RLS) & Policies
-- ------------------------------------------------------------------------------

-- 7.1 Organizations Table
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_select_policy" ON organizations;
CREATE POLICY "org_select_policy" ON organizations
  FOR SELECT
  USING (
    is_platform_admin() 
    OR id IN (SELECT get_user_approved_org_ids())
  );

DROP POLICY IF EXISTS "org_insert_policy" ON organizations;
CREATE POLICY "org_insert_policy" ON organizations
  FOR INSERT
  WITH CHECK (
    -- Any registered user may submit an organization registration, but it must be 'pending'
    status = 'pending' OR is_platform_admin()
  );

DROP POLICY IF EXISTS "org_update_policy" ON organizations;
CREATE POLICY "org_update_policy" ON organizations
  FOR UPDATE
  USING (
    is_platform_admin()
    OR (
      -- Organization managers may update general info (address, phone), but NOT status
      has_org_membership(id, get_auth_user_id(), ARRAY['ROLE_MANAGER'])
    )
  )
  WITH CHECK (
    is_platform_admin()
    OR (
      -- Organization managers cannot approve themselves or change approval status
      has_org_membership(id, get_auth_user_id(), ARRAY['ROLE_MANAGER'])
      AND status = (SELECT o2.status FROM organizations o2 WHERE o2.id = organizations.id)
    )
  );

-- 7.2 Organization Memberships Table
ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_memberships_select_policy" ON organization_memberships;
CREATE POLICY "org_memberships_select_policy" ON organization_memberships
  FOR SELECT
  USING (
    is_platform_admin()
    OR user_id = get_auth_user_id()
    OR organization_id IN (SELECT get_user_approved_org_ids())
  );

DROP POLICY IF EXISTS "org_memberships_manage_policy" ON organization_memberships;
CREATE POLICY "org_memberships_manage_policy" ON organization_memberships
  FOR ALL
  USING (
    is_platform_admin()
    OR has_org_membership(organization_id, get_auth_user_id(), ARRAY['ROLE_MANAGER'])
  );

-- 7.3 Platform Admins Table
ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_admins_select_policy" ON platform_admins;
CREATE POLICY "platform_admins_select_policy" ON platform_admins
  FOR SELECT
  USING (is_platform_admin());

DROP POLICY IF EXISTS "platform_admins_manage_policy" ON platform_admins;
CREATE POLICY "platform_admins_manage_policy" ON platform_admins
  FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- 7.4 Fleet Vehicles
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vehicles_tenant_select_policy" ON vehicles;
CREATE POLICY "vehicles_tenant_select_policy" ON vehicles
  FOR SELECT
  USING (
    is_platform_admin()
    OR (organization_id IS NOT NULL AND organization_id IN (SELECT get_user_approved_org_ids()))
  );

DROP POLICY IF EXISTS "vehicles_tenant_modify_policy" ON vehicles;
CREATE POLICY "vehicles_tenant_modify_policy" ON vehicles
  FOR ALL
  USING (
    is_platform_admin()
    OR (
      organization_id IS NOT NULL 
      AND has_org_membership(organization_id, get_auth_user_id(), ARRAY['ROLE_MANAGER', 'ROLE_DISPATCHER'])
    )
  );

-- 7.5 Trips (Replaces previous permissive policies from 003)
DROP POLICY IF EXISTS "trips_select_policy" ON trips;
DROP POLICY IF EXISTS "trips_insert_policy" ON trips;
DROP POLICY IF EXISTS "trips_update_policy" ON trips;
DROP POLICY IF EXISTS "trips_delete_policy" ON trips;

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trips_tenant_select_policy" ON trips
  FOR SELECT
  USING (
    is_platform_admin()
    OR (
      organization_id IS NOT NULL 
      AND organization_id IN (SELECT get_user_approved_org_ids())
      AND (
        -- Drivers can only view trips assigned to them
        driverID = get_auth_user_id()
        -- Managers and dispatchers can view all trips in their organization
        OR has_org_membership(organization_id, get_auth_user_id(), ARRAY['ROLE_MANAGER', 'ROLE_DISPATCHER', 'ROLE_FINANCE', 'ROLE_SAFETY_OFFICER'])
      )
    )
  );

CREATE POLICY "trips_tenant_modify_policy" ON trips
  FOR ALL
  USING (
    is_platform_admin()
    OR (
      organization_id IS NOT NULL 
      AND has_org_membership(organization_id, get_auth_user_id(), ARRAY['ROLE_MANAGER', 'ROLE_DISPATCHER'])
    )
  );

-- 7.6 Live Tracking Locations (Replaces previous permissive policies from 005)
DROP POLICY IF EXISTS "tracking_locations_select_policy" ON tracking_locations;
DROP POLICY IF EXISTS "tracking_locations_insert_policy" ON tracking_locations;
DROP POLICY IF EXISTS "tracking_locations_update_policy" ON tracking_locations;
DROP POLICY IF EXISTS "tracking_locations_delete_policy" ON tracking_locations;

ALTER TABLE tracking_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tracking_tenant_select_policy" ON tracking_locations
  FOR SELECT
  USING (
    is_platform_admin()
    OR (organization_id IS NOT NULL AND organization_id IN (SELECT get_user_approved_org_ids()))
  );

CREATE POLICY "tracking_tenant_modify_policy" ON tracking_locations
  FOR ALL
  USING (
    is_platform_admin()
    OR (
      organization_id IS NOT NULL 
      AND (
        driverID = get_auth_user_id()
        OR has_org_membership(organization_id, get_auth_user_id(), ARRAY['ROLE_MANAGER', 'ROLE_DISPATCHER'])
      )
    )
  );

-- 7.7 Attendance, Maintenance, Fuel & Expenses
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "attendance_tenant_policy" ON attendance_records;
CREATE POLICY "attendance_tenant_policy" ON attendance_records
  FOR ALL
  USING (
    is_platform_admin()
    OR (
      organization_id IS NOT NULL 
      AND organization_id IN (SELECT get_user_approved_org_ids())
      AND (
        userId = get_auth_user_id() 
        OR has_org_membership(organization_id, get_auth_user_id(), ARRAY['ROLE_MANAGER'])
      )
    )
  );

ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "maintenance_tenant_policy" ON maintenance_records;
CREATE POLICY "maintenance_tenant_policy" ON maintenance_records
  FOR ALL
  USING (
    is_platform_admin()
    OR (
      organization_id IS NOT NULL 
      AND has_org_membership(organization_id, get_auth_user_id(), ARRAY['ROLE_MANAGER', 'ROLE_SAFETY_OFFICER', 'ROLE_FINANCE'])
    )
  );

ALTER TABLE fuel_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fuel_tenant_policy" ON fuel_logs;
CREATE POLICY "fuel_tenant_policy" ON fuel_logs
  FOR ALL
  USING (
    is_platform_admin()
    OR (
      organization_id IS NOT NULL 
      AND has_org_membership(organization_id, get_auth_user_id(), ARRAY['ROLE_MANAGER', 'ROLE_DISPATCHER', 'ROLE_FINANCE'])
    )
  );

ALTER TABLE expense_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "expense_tenant_policy" ON expense_records;
CREATE POLICY "expense_tenant_policy" ON expense_records
  FOR ALL
  USING (
    is_platform_admin()
    OR (
      organization_id IS NOT NULL 
      AND has_org_membership(organization_id, get_auth_user_id(), ARRAY['ROLE_MANAGER', 'ROLE_FINANCE'])
    )
  );

-- 7.8 Emergency Alerts & Chat
ALTER TABLE emergency_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "emergency_alerts_tenant_policy" ON emergency_alerts;
CREATE POLICY "emergency_alerts_tenant_policy" ON emergency_alerts
  FOR ALL
  USING (
    is_platform_admin()
    OR (
      organization_id IS NOT NULL 
      AND organization_id IN (SELECT get_user_approved_org_ids())
    )
  );

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "conversations_tenant_policy" ON conversations;
CREATE POLICY "conversations_tenant_policy" ON conversations
  FOR ALL
  USING (
    is_platform_admin()
    OR (
      organization_id IS NOT NULL 
      AND organization_id IN (SELECT get_user_approved_org_ids())
    )
  );

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "messages_tenant_policy" ON messages;
CREATE POLICY "messages_tenant_policy" ON messages
  FOR ALL
  USING (
    is_platform_admin()
    OR (
      organization_id IS NOT NULL 
      AND organization_id IN (SELECT get_user_approved_org_ids())
    )
  );

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_tenant_policy" ON notifications;
CREATE POLICY "notifications_tenant_policy" ON notifications
  FOR ALL
  USING (
    is_platform_admin()
    OR (
      organization_id IS NOT NULL 
      AND userId = get_auth_user_id()
    )
  );
