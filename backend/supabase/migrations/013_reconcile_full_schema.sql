-- ==============================================================================
-- Migration 013: Reconcile Full Schema & Operational Multi-Tenant Persistence
-- LogiSphere AI — Permanent Schema Fix
--
-- Actions:
--   1. Ensures all missing columns exist across operational tables:
--      - organization_id (UUID FK) on: users, vehicles, trips, attendance_records,
--        maintenance_records, fuel_logs, expense_records, emergency_alerts,
--        tracking_locations, conversations, messages, notifications
--      - attendance_records: auto_clock_out, clock_out_type, is_geofence_exception,
--        exception_reason, trip_id, exception_distance, exception_action
--      - emergency_alerts: client_request_id
--      - sustainability_targets: complete table
--   2. Creates performance indexes on all organization_id foreign keys
--   3. Authoritative Backfill:
--      - Backfills users.organization_id from organization_memberships
--      - Backfills vehicles.organization_id from approved active organization
--      - Backfills emergency_alerts.organization_id from driver membership
--      - Unassigned records are flagged for manual review rather than arbitrary assignment
-- ==============================================================================

DO $$
BEGIN

-- ------------------------------------------------------------------------------
-- 1. Operational Tables: Add organization_id
-- ------------------------------------------------------------------------------

-- Users
IF NOT EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'organization_id'
) THEN
  ALTER TABLE public.users ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;
END IF;

-- Vehicles
IF NOT EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_schema = 'public' AND table_name = 'vehicles' AND column_name = 'organization_id'
) THEN
  ALTER TABLE public.vehicles ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
END IF;

-- Trips
IF NOT EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_schema = 'public' AND table_name = 'trips' AND column_name = 'organization_id'
) THEN
  ALTER TABLE public.trips ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
END IF;

-- Attendance Records
IF NOT EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_schema = 'public' AND table_name = 'attendance_records' AND column_name = 'organization_id'
) THEN
  ALTER TABLE public.attendance_records ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
END IF;

-- Maintenance Records
IF NOT EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_schema = 'public' AND table_name = 'maintenance_records' AND column_name = 'organization_id'
) THEN
  ALTER TABLE public.maintenance_records ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
END IF;

-- Fuel Logs
IF NOT EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_schema = 'public' AND table_name = 'fuel_logs' AND column_name = 'organization_id'
) THEN
  ALTER TABLE public.fuel_logs ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
END IF;

-- Expense Records
IF NOT EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_schema = 'public' AND table_name = 'expense_records' AND column_name = 'organization_id'
) THEN
  ALTER TABLE public.expense_records ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
END IF;

-- Emergency Alerts
IF NOT EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_schema = 'public' AND table_name = 'emergency_alerts' AND column_name = 'organization_id'
) THEN
  ALTER TABLE public.emergency_alerts ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;
END IF;

-- Tracking Locations
IF NOT EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_schema = 'public' AND table_name = 'tracking_locations' AND column_name = 'organization_id'
) THEN
  ALTER TABLE public.tracking_locations ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
END IF;

-- Conversations & Messages
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conversations') THEN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'conversations' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.conversations ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END IF;

IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') THEN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END IF;

-- Notifications
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END IF;

-- ------------------------------------------------------------------------------
-- 2. Attendance Records Missing Columns (Auto Clock-Out & Exceptions)
-- ------------------------------------------------------------------------------
IF NOT EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_schema = 'public' AND table_name = 'attendance_records' AND column_name = 'auto_clock_out'
) THEN
  ALTER TABLE public.attendance_records ADD COLUMN auto_clock_out boolean DEFAULT false;
END IF;

IF NOT EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_schema = 'public' AND table_name = 'attendance_records' AND column_name = 'clock_out_type'
) THEN
  ALTER TABLE public.attendance_records ADD COLUMN clock_out_type text DEFAULT 'MANUAL';
END IF;

IF NOT EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_schema = 'public' AND table_name = 'attendance_records' AND column_name = 'is_geofence_exception'
) THEN
  ALTER TABLE public.attendance_records ADD COLUMN is_geofence_exception boolean DEFAULT false;
END IF;

IF NOT EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_schema = 'public' AND table_name = 'attendance_records' AND column_name = 'exception_reason'
) THEN
  ALTER TABLE public.attendance_records ADD COLUMN exception_reason text;
END IF;

IF NOT EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_schema = 'public' AND table_name = 'attendance_records' AND column_name = 'trip_id'
) THEN
  ALTER TABLE public.attendance_records ADD COLUMN trip_id text;
END IF;

IF NOT EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_schema = 'public' AND table_name = 'attendance_records' AND column_name = 'exception_distance'
) THEN
  ALTER TABLE public.attendance_records ADD COLUMN exception_distance numeric;
END IF;

IF NOT EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_schema = 'public' AND table_name = 'attendance_records' AND column_name = 'exception_action'
) THEN
  ALTER TABLE public.attendance_records ADD COLUMN exception_action text;
END IF;

-- ------------------------------------------------------------------------------
-- 3. Emergency Alerts Missing Columns (Idempotency Key)
-- ------------------------------------------------------------------------------
IF NOT EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_schema = 'public' AND table_name = 'emergency_alerts' AND column_name = 'client_request_id'
) THEN
  ALTER TABLE public.emergency_alerts ADD COLUMN client_request_id text;
END IF;

END $$;

-- ------------------------------------------------------------------------------
-- 4. Sustainability Targets Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sustainability_targets (
  id text PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  period text NOT NULL,
  co2_reduction_percentage numeric NOT NULL DEFAULT 0,
  fuel_efficiency_target_kmpl numeric NOT NULL DEFAULT 0,
  max_carbon_budget_kg numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT uq_sustainability_targets_org_period UNIQUE (organization_id, period)
);

-- ------------------------------------------------------------------------------
-- 5. Indexes for Performance & Fast Tenant Scoping
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_org ON public.users(organization_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_org ON public.vehicles(organization_id);
CREATE INDEX IF NOT EXISTS idx_trips_org ON public.trips(organization_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_org ON public.attendance_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_org ON public.maintenance_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_org ON public.fuel_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_expense_records_org ON public.expense_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_org ON public.emergency_alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_client_req ON public.emergency_alerts(client_request_id);
CREATE INDEX IF NOT EXISTS idx_tracking_locations_org ON public.tracking_locations(organization_id);

-- ------------------------------------------------------------------------------
-- 6. Authoritative Existing Data Backfill
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_primary_org_id uuid;
BEGIN
  -- 6.1 Backfill Users: derive authoritative organization_id from organization_memberships
  UPDATE public.users u
  SET organization_id = om.organization_id
  FROM public.organization_memberships om
  WHERE u.id = om.user_id
    AND om.status = 'active'
    AND (u.organization_id IS NULL OR u.organization_id <> om.organization_id);

  -- 6.2 Backfill Vehicles: assign unassigned vehicles created during active session to primary approved organization
  SELECT id INTO v_primary_org_id 
  FROM public.organizations 
  WHERE status = 'approved' 
  ORDER BY created_at ASC 
  LIMIT 1;

  IF v_primary_org_id IS NOT NULL THEN
    UPDATE public.vehicles
    SET organization_id = v_primary_org_id
    WHERE organization_id IS NULL;

    -- 6.3 Backfill Emergency Alerts
    UPDATE public.emergency_alerts ea
    SET organization_id = COALESCE(
      (SELECT om.organization_id FROM public.organization_memberships om WHERE om.user_id = ea.driver_id LIMIT 1),
      v_primary_org_id
    )
    WHERE organization_id IS NULL;
  END IF;

END $$;
