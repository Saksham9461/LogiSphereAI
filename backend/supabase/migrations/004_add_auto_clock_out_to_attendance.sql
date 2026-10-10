-- Migration 004: Add auto_clock_out and clock_out_type to attendance_records
ALTER TABLE IF EXISTS attendance_records 
ADD COLUMN IF NOT EXISTS auto_clock_out boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS clock_out_type text DEFAULT 'MANUAL';

-- Create indexes for performance and fast reconciliation queries
CREATE INDEX IF NOT EXISTS idx_attendance_records_user_date ON attendance_records (userId, date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_open ON attendance_records (clockOutTime) WHERE clockOutTime IS NULL;
