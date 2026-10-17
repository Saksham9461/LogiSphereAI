-- Migration 007: Add client_request_id for offline SOS queue idempotency and duplicate prevention
ALTER TABLE emergency_alerts 
ADD COLUMN IF NOT EXISTS client_request_id text;

-- Unique partial index enforcing that non-null client_request_id values are strictly unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_emergency_alerts_client_request_id 
ON emergency_alerts(client_request_id) 
WHERE client_request_id IS NOT NULL;
