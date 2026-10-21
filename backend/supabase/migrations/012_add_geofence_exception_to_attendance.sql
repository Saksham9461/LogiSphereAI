-- ==============================================================================
-- Migration 012: Active Trip Geofence Attendance Exception
-- Adds exception auditing and active trip linkage columns to attendance_records.
-- ==============================================================================

ALTER TABLE IF EXISTS attendance_records
ADD COLUMN IF NOT EXISTS is_geofence_exception boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS exception_reason text,
ADD COLUMN IF NOT EXISTS trip_id text REFERENCES trips(tripID) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS exception_distance numeric,
ADD COLUMN IF NOT EXISTS exception_action text;

-- Indexes for performance and fast auditing
CREATE INDEX IF NOT EXISTS idx_attendance_records_trip_id ON attendance_records (trip_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_is_exception ON attendance_records (is_geofence_exception) WHERE is_geofence_exception = true;

COMMENT ON COLUMN attendance_records.is_geofence_exception IS 'Indicates if this attendance was recorded outside the geofence via active trip exception';
COMMENT ON COLUMN attendance_records.exception_reason IS 'Driver-provided description of current location during geofence exception';
COMMENT ON COLUMN attendance_records.trip_id IS 'Associated active trip ID authorizing the geofence exception';
COMMENT ON COLUMN attendance_records.exception_distance IS 'Server-calculated distance in meters from organization geofence when exception was granted';
COMMENT ON COLUMN attendance_records.exception_action IS 'Attendance action performed under exception: CLOCK_IN or CLOCK_OUT';
