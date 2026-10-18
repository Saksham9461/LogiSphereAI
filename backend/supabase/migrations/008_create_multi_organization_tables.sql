-- ==============================================================================
-- Migration 008: Multi-Organization SaaS Foundation
-- Creates:
--   1. organizations (Companies / Tenants)
--   2. organization_memberships (User-Organization Role Assignments)
--   3. platform_admins (Platform Administrators for Approvals)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. Organizations Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  formatted_address text,
  google_places_id text,
  latitude numeric CHECK (latitude IS NULL OR (latitude >= -90.0 AND latitude <= 90.0)),
  longitude numeric CHECK (longitude IS NULL OR (longitude >= -180.0 AND longitude <= 180.0)),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  registration_timestamp timestamptz NOT NULL DEFAULT now(),
  reviewed_by text REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_reason text,
  contact_email text,
  contact_phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Performance and Query Indexes
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_created_at ON organizations(created_at DESC);

-- ------------------------------------------------------------------------------
-- 2. Organization Memberships Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organization_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('ROLE_MANAGER', 'ROLE_DISPATCHER', 'ROLE_SAFETY_OFFICER', 'ROLE_FINANCE', 'ROLE_DRIVER')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_organization_memberships_org_user UNIQUE (organization_id, user_id)
);

-- Membership Performance Indexes
CREATE INDEX IF NOT EXISTS idx_org_memberships_org ON organization_memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_user ON organization_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_status ON organization_memberships(status);
CREATE INDEX IF NOT EXISTS idx_org_memberships_active_lookup ON organization_memberships(organization_id, user_id, status);

-- ------------------------------------------------------------------------------
-- 3. Platform Administrators Table
-- ------------------------------------------------------------------------------
-- Platform-admin privileges cannot be granted through regular organization-management
-- APIs or public registration. Managed strictly through controlled administrative process.
CREATE TABLE IF NOT EXISTS platform_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  granted_by text REFERENCES users(id) ON DELETE SET NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Platform Admin Lookup Index
CREATE INDEX IF NOT EXISTS idx_platform_admins_active_user ON platform_admins(user_id) WHERE is_active = true;
