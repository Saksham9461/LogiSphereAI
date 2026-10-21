-- ==============================================================================
-- Migration 011: Sustainability Targets & Carbon Intelligence Foundation
-- Creates:
--   1. sustainability_targets (Monthly & Periodic CO2 emission goals per organization)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS sustainability_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  period text NOT NULL, -- e.g. '2026-10', 'MONTHLY'
  target_co2_kg numeric NOT NULL CHECK (target_co2_kg > 0),
  alert_threshold_percent numeric NOT NULL DEFAULT 80 CHECK (alert_threshold_percent > 0 AND alert_threshold_percent <= 100),
  notes text,
  created_by text REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_sustainability_targets_org_period UNIQUE (organization_id, period)
);

CREATE INDEX IF NOT EXISTS idx_sustainability_targets_org ON sustainability_targets(organization_id);
CREATE INDEX IF NOT EXISTS idx_sustainability_targets_period ON sustainability_targets(period);

-- Row Level Security
ALTER TABLE sustainability_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sustainability_targets_isolation" ON sustainability_targets
  FOR ALL
  USING (
    organization_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM organization_memberships m
      WHERE m.organization_id = sustainability_targets.organization_id
        AND m.user_id = auth.uid()
    )
  );
