-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id),
  intake_id uuid REFERENCES vehicle_intakes(id),
  appointment_id uuid REFERENCES appointments(id),
  customer_id uuid NOT NULL REFERENCES customers(id),
  technician_id uuid REFERENCES profiles(id),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'in_progress', 'completed')),
  started_at timestamptz,
  finished_at timestamptz,
  duration_minutes integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Job photos table
CREATE TABLE IF NOT EXISTS job_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id),
  photo_type text NOT NULL CHECK (photo_type IN ('before', 'after')),
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_jobs_business_status ON jobs(business_id, status);
CREATE INDEX idx_jobs_technician ON jobs(technician_id);
CREATE INDEX idx_jobs_customer ON jobs(customer_id);
CREATE INDEX idx_job_photos_job ON job_photos(job_id);

-- RLS
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business members can view jobs"
  ON jobs FOR SELECT
  USING (business_id = get_my_business_id());

CREATE POLICY "Business members can insert jobs"
  ON jobs FOR INSERT
  WITH CHECK (business_id = get_my_business_id());

CREATE POLICY "Business members can update jobs"
  ON jobs FOR UPDATE
  USING (business_id = get_my_business_id());

CREATE POLICY "Business members can view job photos"
  ON job_photos FOR SELECT
  USING (business_id = get_my_business_id());

CREATE POLICY "Business members can insert job photos"
  ON job_photos FOR INSERT
  WITH CHECK (business_id = get_my_business_id());

CREATE POLICY "Business members can delete job photos"
  ON job_photos FOR DELETE
  USING (business_id = get_my_business_id());

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('job-photos', 'job-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Business members can upload job photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'job-photos');

CREATE POLICY "Anyone can view job photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'job-photos');

CREATE POLICY "Business members can delete job photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'job-photos');
