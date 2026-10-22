-- ==============================================================================
-- LogiSphere AI — Clean Development Database Reset & Unified Schema
--
-- TARGET DATABASE: Supabase Project (iezegzwywcvmijojvfne.supabase.co)
-- WARNING: DESTRUCTIVE OPERATION. Drops and recreates all public tables cleanly.
-- DO NOT EXECUTE WITHOUT EXPLICIT USER APPROVAL.
-- ==============================================================================

-- 1. DROP EXISTING TABLES IN REVERSE DEPENDENCY ORDER
DROP TABLE IF EXISTS public.sustainability_targets CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversation_participants CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.tracking_locations CASCADE;
DROP TABLE IF EXISTS public.emergency_alerts CASCADE;
DROP TABLE IF EXISTS public.expense_records CASCADE;
DROP TABLE IF EXISTS public.fuel_logs CASCADE;
DROP TABLE IF EXISTS public.maintenance_records CASCADE;
DROP TABLE IF EXISTS public.attendance_records CASCADE;
DROP TABLE IF EXISTS public.trips CASCADE;
DROP TABLE IF EXISTS public.vehicles CASCADE;
DROP TABLE IF EXISTS public.platform_admins CASCADE;
DROP TABLE IF EXISTS public.organization_memberships CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- 2. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 3. ORGANIZATIONS TABLE
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  formatted_address text,
  google_places_id text,
  latitude numeric CHECK (latitude IS NULL OR (latitude >= -90.0 AND latitude <= 90.0)),
  longitude numeric CHECK (longitude IS NULL OR (longitude >= -180.0 AND longitude <= 180.0)),
  geofence_radius numeric DEFAULT 200,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  registration_timestamp timestamptz NOT NULL DEFAULT now(),
  reviewed_by text,
  reviewed_at timestamptz,
  review_reason text,
  contact_email text,
  contact_phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. USERS TABLE
CREATE TABLE public.users (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  phoneNo text,
  passwordHash text NOT NULL,
  role text NOT NULL CHECK (role IN ('ROLE_MANAGER','ROLE_DISPATCHER','ROLE_SAFETY_OFFICER','ROLE_FINANCE','ROLE_DRIVER','ROLE_ADMIN')),
  licenseNo text,
  licenseExpiryDate text,
  trips integer DEFAULT 0,
  safetyScore numeric DEFAULT 95,
  status text DEFAULT 'ACTIVE',
  mustChangePassword boolean DEFAULT false,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  createdAt timestamptz DEFAULT now(),
  updatedAt timestamptz DEFAULT now()
);

-- 5. ORGANIZATION MEMBERSHIPS TABLE
CREATE TABLE public.organization_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('ROLE_MANAGER', 'ROLE_DISPATCHER', 'ROLE_SAFETY_OFFICER', 'ROLE_FINANCE', 'ROLE_DRIVER', 'ROLE_ADMIN')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_organization_memberships_org_user UNIQUE (organization_id, user_id)
);

-- 6. PLATFORM ADMINS TABLE
CREATE TABLE public.platform_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  granted_by text REFERENCES public.users(id) ON DELETE SET NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 7. VEHICLES TABLE
CREATE TABLE public.vehicles (
  vehicleid text PRIMARY KEY,
  registrationNumber text NOT NULL UNIQUE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('VAN','TRUCK','MINI','CAR','BUS','BIKE','OTHER','Van','Truck','Mini')),
  maxloadcapacity numeric NOT NULL,
  odometer numeric DEFAULT 0,
  acquisitioncost numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'AVAILABLE',
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  createdat timestamptz DEFAULT now(),
  updatedat timestamptz DEFAULT now()
);

-- 8. TRIPS TABLE
CREATE TABLE public.trips (
  tripid text PRIMARY KEY,
  source text NOT NULL,
  destination text NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT',
  vehicleid text REFERENCES public.vehicles(vehicleid) ON DELETE SET NULL,
  driverid text REFERENCES public.users(id) ON DELETE SET NULL,
  cargoweight numeric DEFAULT 0,
  planneddistance numeric DEFAULT 0,
  startingodometer numeric DEFAULT 0,
  finalodometer numeric,
  fuelconsumed numeric,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  createdat timestamptz DEFAULT now(),
  updatedat timestamptz DEFAULT now()
);

-- 9. ATTENDANCE RECORDS TABLE
CREATE TABLE public.attendance_records (
  id text PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  userid text REFERENCES public.users(id) ON DELETE SET NULL,
  date text NOT NULL,
  clockintime text NOT NULL,
  clockouttime text,
  latitude numeric,
  longitude numeric,
  locationname text,
  distancefromoffice numeric,
  status text NOT NULL,
  is_geofence_exception boolean DEFAULT false,
  exception_reason text,
  trip_id text REFERENCES public.trips(tripid) ON DELETE SET NULL,
  exception_distance numeric,
  exception_action text,
  auto_clock_out boolean DEFAULT false,
  clock_out_type text DEFAULT 'MANUAL',
  createdat timestamptz DEFAULT now(),
  updatedat timestamptz DEFAULT now()
);

-- 10. MAINTENANCE RECORDS TABLE
CREATE TABLE public.maintenance_records (
  id text PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicleid text REFERENCES public.vehicles(vehicleid) ON DELETE CASCADE,
  servicetype text NOT NULL,
  cost numeric NOT NULL DEFAULT 0,
  date date NOT NULL,
  status text NOT NULL,
  createdat timestamptz DEFAULT now(),
  updatedat timestamptz DEFAULT now()
);

-- 11. FUEL LOGS TABLE
CREATE TABLE public.fuel_logs (
  fuellogid text PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicleid text REFERENCES public.vehicles(vehicleid) ON DELETE CASCADE,
  date date NOT NULL,
  liters numeric NOT NULL DEFAULT 0,
  cost numeric NOT NULL DEFAULT 0,
  createdat timestamptz DEFAULT now(),
  updatedat timestamptz DEFAULT now()
);

-- 12. EXPENSE RECORDS TABLE
CREATE TABLE public.expense_records (
  expenseid text PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tripid text REFERENCES public.trips(tripid) ON DELETE CASCADE,
  vehicleid text REFERENCES public.vehicles(vehicleid) ON DELETE CASCADE,
  toll numeric DEFAULT 0,
  other numeric DEFAULT 0,
  maint numeric DEFAULT 0,
  createdat timestamptz DEFAULT now(),
  updatedat timestamptz DEFAULT now()
);

-- 13. EMERGENCY ALERTS TABLE
CREATE TABLE public.emergency_alerts (
  id text PRIMARY KEY,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  driver_id text REFERENCES public.users(id) ON DELETE SET NULL,
  driver_name text NOT NULL,
  business_id text DEFAULT 'default_org',
  trip_id text REFERENCES public.trips(tripid) ON DELETE SET NULL,
  vehicle_id text REFERENCES public.vehicles(vehicleid) ON DELETE SET NULL,
  latitude numeric,
  longitude numeric,
  location_accuracy_meters numeric,
  location_captured_at timestamptz DEFAULT now(),
  location_status text DEFAULT 'PRECISE',
  message text NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE',
  acknowledged_by text REFERENCES public.users(id) ON DELETE SET NULL,
  acknowledged_at timestamptz,
  resolved_by text REFERENCES public.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  resolution_note text,
  client_request_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 14. TRACKING LOCATIONS TABLE
CREATE TABLE public.tracking_locations (
  id text PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tripid text REFERENCES public.trips(tripid) ON DELETE CASCADE,
  vehicleid text REFERENCES public.vehicles(vehicleid) ON DELETE CASCADE,
  driverid text REFERENCES public.users(id) ON DELETE CASCADE,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  speed numeric DEFAULT 0,
  accuracy numeric,
  heading numeric,
  devicetimestamp timestamptz NOT NULL,
  receivedat timestamptz DEFAULT now(),
  updatedat timestamptz DEFAULT now()
);

-- 15. CONVERSATIONS & MESSAGES TABLES
CREATE TABLE public.conversations (
  id text PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.conversation_participants (
  conversation_id text NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE public.messages (
  id text PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  conversation_id text NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id text REFERENCES public.users(id) ON DELETE SET NULL,
  message text NOT NULL,
  message_type text DEFAULT 'TEXT',
  created_at timestamptz DEFAULT now(),
  delivered_at timestamptz,
  read_at timestamptz
);

-- 16. NOTIFICATIONS TABLE
CREATE TABLE public.notifications (
  id text PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  userid text REFERENCES public.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  read boolean DEFAULT false,
  createdat timestamptz DEFAULT now()
);

-- 17. SUSTAINABILITY TARGETS TABLE
CREATE TABLE public.sustainability_targets (
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

-- 18. PERFORMANCE INDEXES
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_org ON public.users(organization_id);
CREATE INDEX idx_org_memberships_org_user ON public.organization_memberships(organization_id, user_id);
CREATE INDEX idx_vehicles_org ON public.vehicles(organization_id);
CREATE INDEX idx_trips_org ON public.trips(organization_id);
CREATE INDEX idx_trips_driver ON public.trips(driverid);
CREATE INDEX idx_attendance_org ON public.attendance_records(organization_id);
CREATE INDEX idx_attendance_user ON public.attendance_records(userid);
CREATE INDEX idx_maintenance_org ON public.maintenance_records(organization_id);
CREATE INDEX idx_fuel_org ON public.fuel_logs(organization_id);
CREATE INDEX idx_expense_org ON public.expense_records(organization_id);
CREATE INDEX idx_alerts_org ON public.emergency_alerts(organization_id);
CREATE INDEX idx_alerts_client_req ON public.emergency_alerts(client_request_id);
CREATE INDEX idx_tracking_org ON public.tracking_locations(organization_id);

-- 19. DEFAULT BOOTSTRAP ORGANIZATION & ADMIN
INSERT INTO public.organizations (
  id, name, slug, formatted_address, latitude, longitude, status, registration_timestamp
) VALUES
  ('805c901d-5038-462c-9f87-4857d7afed10'::uuid, 'Century Industries', 'century-industries', 'LogiSphere Headquarters, Ahmedabad, Gujarat, India', 23.0901508, 72.535029, 'approved', now()),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'LogiSphere System Organization', 'logisphere-system', 'LogiSphere Cloud Headquarters', 28.6139, 77.2090, 'approved', now())
ON CONFLICT (id) DO NOTHING;

-- Default fleet manager
INSERT INTO public.users (
  id, name, email, phoneNo, passwordHash, role, status, organization_id
) VALUES (
  'usr-century-mgr',
  'Century Fleet Manager',
  'manager@yopmail.com',
  '9461286197',
  '$2a$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
  'ROLE_MANAGER',
  'ACTIVE',
  '805c901d-5038-462c-9f87-4857d7afed10'::uuid
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.organization_memberships (
  id, organization_id, user_id, role, status
) VALUES (
  'a665cca4-1089-4623-b8a6-6a796fdbaa2c'::uuid,
  '805c901d-5038-462c-9f87-4857d7afed10'::uuid,
  'usr-century-mgr',
  'ROLE_MANAGER',
  'active'
) ON CONFLICT (organization_id, user_id) DO NOTHING;

-- Default drivers for Century Industries
INSERT INTO public.users (
  id, name, email, phoneNo, passwordHash, role, licenseNo, licenseExpiryDate, trips, safetyScore, status, organization_id
) VALUES
  ('drv-century-01', 'Rajesh Kumar', 'driver@yopmail.com', '9876543210', '$2a$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'ROLE_DRIVER', 'GJ0120200012345', '2028-12-31', 12, 98, 'AVAILABLE', '805c901d-5038-462c-9f87-4857d7afed10'::uuid),
  ('drv-century-02', 'Amit Sharma', 'amit.driver@yopmail.com', '9876543211', '$2a$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'ROLE_DRIVER', 'GJ0120200012346', '2028-12-31', 8, 96, 'AVAILABLE', '805c901d-5038-462c-9f87-4857d7afed10'::uuid),
  ('drv-century-03', 'Vikram Singh', 'vikram.driver@yopmail.com', '9876543212', '$2a$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'ROLE_DRIVER', 'GJ0120200012347', '2028-12-31', 15, 99, 'AVAILABLE', '805c901d-5038-462c-9f87-4857d7afed10'::uuid),
  ('drv-century-04', 'Suresh Patel', 'suresh.driver@yopmail.com', '9876543213', '$2a$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'ROLE_DRIVER', 'GJ0120200012348', '2028-12-31', 5, 94, 'AVAILABLE', '805c901d-5038-462c-9f87-4857d7afed10'::uuid)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.organization_memberships (
  id, organization_id, user_id, role, status
) VALUES
  ('b776ddb5-2190-5734-c9b7-7b807feecb3d'::uuid, '805c901d-5038-462c-9f87-4857d7afed10'::uuid, 'drv-century-01', 'ROLE_DRIVER', 'active'),
  ('c887eec6-3201-6845-dae8-8c918affdc4e'::uuid, '805c901d-5038-462c-9f87-4857d7afed10'::uuid, 'drv-century-02', 'ROLE_DRIVER', 'active'),
  ('d998ffd7-4312-7956-ebf9-9da29baeed5f'::uuid, '805c901d-5038-462c-9f87-4857d7afed10'::uuid, 'drv-century-03', 'ROLE_DRIVER', 'active'),
  ('ea0900e8-5423-8067-fca0-0eb30cbfef6a'::uuid, '805c901d-5038-462c-9f87-4857d7afed10'::uuid, 'drv-century-04', 'ROLE_DRIVER', 'active')
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- Default fleet vehicles for Century Industries
INSERT INTO public.vehicles (
  vehicleid, registrationNumber, name, type, maxloadcapacity, odometer, acquisitioncost, status, organization_id
) VALUES
  ('veh-century-van-01', 'GJ01BA6030', 'Century Express Van 1', 'VAN', 1500, 18500, 850000, 'AVAILABLE', '805c901d-5038-462c-9f87-4857d7afed10'::uuid),
  ('veh-century-trk-01', 'GJ01YK9940', 'Century Heavy Hauler 1', 'TRUCK', 8000, 42300, 2400000, 'AVAILABLE', '805c901d-5038-462c-9f87-4857d7afed10'::uuid),
  ('veh-century-mni-01', 'BR19TR5489', 'Century City Runner 1', 'MINI', 800, 9200, 450000, 'AVAILABLE', '805c901d-5038-462c-9f87-4857d7afed10'::uuid),
  ('veh-century-trk-02', 'HR26WE6678', 'Century Cargo Freight 2', 'TRUCK', 12000, 68900, 3200000, 'AVAILABLE', '805c901d-5038-462c-9f87-4857d7afed10'::uuid)
ON CONFLICT (registrationNumber) DO UPDATE SET organization_id = EXCLUDED.organization_id;

