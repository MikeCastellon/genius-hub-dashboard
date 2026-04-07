-- Generic cache table for VehicleDatabases API responses
CREATE TABLE IF NOT EXISTS vehicledb_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL,
  lookup_type TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'vehicledatabases',
  api_response JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vehicledb_cache_lookup ON vehicledb_cache(cache_key, lookup_type);

ALTER TABLE vehicledb_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read cache" ON vehicledb_cache FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert cache" ON vehicledb_cache FOR INSERT TO authenticated WITH CHECK (true);
