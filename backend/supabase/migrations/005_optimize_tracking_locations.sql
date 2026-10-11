-- Migration 005: Optimize tracking_locations for bounded live fleet tracking
-- Enforces strictly one row per active trip with atomic UPSERT

ALTER TABLE tracking_locations ADD COLUMN IF NOT EXISTS accuracy numeric;
ALTER TABLE tracking_locations ADD COLUMN IF NOT EXISTS heading numeric;
ALTER TABLE tracking_locations ADD COLUMN IF NOT EXISTS devicetimestamp timestamptz;
ALTER TABLE tracking_locations ADD COLUMN IF NOT EXISTS receivedat timestamptz DEFAULT now();
ALTER TABLE tracking_locations ADD COLUMN IF NOT EXISTS updatedat timestamptz DEFAULT now();

-- Ensure unique constraint on tripid / tripID
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tracking_locations' AND column_name = 'tripID'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'uq_tracking_locations_tripid'
    ) THEN
      ALTER TABLE tracking_locations ADD CONSTRAINT uq_tracking_locations_tripid UNIQUE ("tripID");
    END IF;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'uq_tracking_locations_tripid_lower'
    ) THEN
      ALTER TABLE tracking_locations ADD CONSTRAINT uq_tracking_locations_tripid_lower UNIQUE (tripid);
    END IF;
  END IF;
END $$;

-- Enable Supabase Realtime publication on tracking_locations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'tracking_locations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE tracking_locations;
  END IF;
END $$;

-- Enable RLS and setup permissive policies
ALTER TABLE tracking_locations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'tracking_locations' AND policyname = 'tracking_locations_select_policy'
  ) THEN
    CREATE POLICY "tracking_locations_select_policy" ON tracking_locations FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'tracking_locations' AND policyname = 'tracking_locations_insert_policy'
  ) THEN
    CREATE POLICY "tracking_locations_insert_policy" ON tracking_locations FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'tracking_locations' AND policyname = 'tracking_locations_update_policy'
  ) THEN
    CREATE POLICY "tracking_locations_update_policy" ON tracking_locations FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'tracking_locations' AND policyname = 'tracking_locations_delete_policy'
  ) THEN
    CREATE POLICY "tracking_locations_delete_policy" ON tracking_locations FOR DELETE USING (true);
  END IF;
END $$;
