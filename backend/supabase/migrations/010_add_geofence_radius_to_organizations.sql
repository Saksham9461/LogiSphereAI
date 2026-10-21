-- ==============================================================================
-- Migration 010: Organization-Specific Geofence Radius
-- Adds geofence_radius column to organizations with safe default (200m)
-- and validation check constraint (50m <= radius <= 5000m).
-- ==============================================================================

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS geofence_radius integer NOT NULL DEFAULT 200
CHECK (geofence_radius >= 50 AND geofence_radius <= 5000);

COMMENT ON COLUMN organizations.geofence_radius IS 'Authorized attendance geofence radius in meters (50m to 5000m, default 200m)';
