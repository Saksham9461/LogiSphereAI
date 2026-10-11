-- Migration 006: Create emergency_alerts table for SOS emergency system
CREATE TABLE IF NOT EXISTS emergency_alerts (
  id text PRIMARY KEY,
  driver_id text REFERENCES users(id) ON DELETE SET NULL,
  driver_name text NOT NULL,
  business_id text DEFAULT 'default_org',
  trip_id text REFERENCES trips(tripID) ON DELETE SET NULL,
  vehicle_id text REFERENCES vehicles(vehicleID) ON DELETE SET NULL,
  latitude numeric,
  longitude numeric,
  location_accuracy_meters numeric,
  location_captured_at timestamptz,
  location_status text DEFAULT 'PRECISE',
  message text DEFAULT 'EMERGENCY SOS: Driver triggered emergency alert',
  status text NOT NULL DEFAULT 'ACTIVE',
  acknowledged_by text REFERENCES users(id) ON DELETE SET NULL,
  acknowledged_at timestamptz,
  resolved_by text REFERENCES users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance, fast manager retrieval, and audit queries
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_status ON emergency_alerts(status);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_driver ON emergency_alerts(driver_id);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_created ON emergency_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_business ON emergency_alerts(business_id);
