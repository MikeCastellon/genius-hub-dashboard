-- ============================================================
-- WARRANTY CERTIFICATION SYSTEM
-- Expands the certificate system from ceramic-coating-only
-- to a multi-vertical warranty platform (6 business types).
-- Adds global vehicles table for VIN-indexed warranty history.
-- ============================================================

-- ============================================================
-- 1. ADD BUSINESS TYPES TO BUSINESSES TABLE
-- ============================================================
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS business_types TEXT[] DEFAULT '{}';

-- ============================================================
-- 2. GLOBAL VEHICLES TABLE (VIN-indexed, cross-tenant)
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vin        TEXT NOT NULL,
  year       INT,
  make       TEXT,
  model      TEXT,
  trim       TEXT,
  color      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT vehicles_vin_unique UNIQUE (vin)
);

CREATE INDEX IF NOT EXISTS idx_vehicles_vin ON vehicles(vin);

-- ============================================================
-- 3. CREATE BUSINESS TYPE ENUM
-- ============================================================
DO $$ BEGIN
  CREATE TYPE business_type_enum AS ENUM (
    'CERAMIC_COATING',
    'WINDOW_TINT',
    'PPF',
    'AUDIO_ELECTRONICS',
    'MECHANICAL',
    'WHEELS_TIRES'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 4. CREATE WARRANTY CLAIM STATUS ENUM
-- ============================================================
DO $$ BEGIN
  CREATE TYPE claim_status_enum AS ENUM (
    'pending',
    'approved',
    'denied',
    'resolved'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 5. ALTER CERTIFICATES TABLE
-- Make legacy fields nullable, add new warranty fields
-- ============================================================
ALTER TABLE certificates
  ALTER COLUMN coating_brand DROP NOT NULL,
  ALTER COLUMN coating_product DROP NOT NULL,
  ALTER COLUMN intake_id DROP NOT NULL;

ALTER TABLE certificates
  ADD COLUMN IF NOT EXISTS business_type        business_type_enum,
  ADD COLUMN IF NOT EXISTS vehicle_id           UUID REFERENCES vehicles(id),
  ADD COLUMN IF NOT EXISTS customer_id          UUID REFERENCES customers(id),
  ADD COLUMN IF NOT EXISTS service_date         DATE,
  ADD COLUMN IF NOT EXISTS warranty_duration_months INT,
  ADD COLUMN IF NOT EXISTS warranty_mileage_cap INT,
  ADD COLUMN IF NOT EXISTS odometer_at_service  INT,
  ADD COLUMN IF NOT EXISTS technician_name      TEXT,
  ADD COLUMN IF NOT EXISTS void_conditions      JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS void_reason          TEXT;

CREATE INDEX IF NOT EXISTS idx_certificates_vehicle ON certificates(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_certificates_business_type ON certificates(business_type);

-- ============================================================
-- 6. CERAMIC COATING DETAILS (1:1 with certificates)
-- ============================================================
CREATE TABLE IF NOT EXISTS ceramic_coating_details (
  certificate_id        UUID PRIMARY KEY REFERENCES certificates(id) ON DELETE CASCADE,
  coating_brand         TEXT NOT NULL,
  coating_product       TEXT NOT NULL,
  layers_applied        INT,
  surfaces_coated       TEXT[] DEFAULT '{}',
  prep_method           TEXT,
  cure_temp_f           INT,
  cure_humidity         INT,
  cure_method           TEXT,
  manufacturer_cert_id  TEXT,
  maintenance_required  BOOLEAN DEFAULT true,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. WINDOW TINT DETAILS
-- ============================================================
CREATE TABLE IF NOT EXISTS window_tint_details (
  certificate_id    UUID PRIMARY KEY REFERENCES certificates(id) ON DELETE CASCADE,
  film_brand        TEXT NOT NULL,
  film_product      TEXT NOT NULL,
  film_type         TEXT,
  vlt_windshield    INT,
  vlt_front         INT,
  vlt_rear          INT,
  vlt_back          INT,
  vlt_sunroof       INT,
  windows_covered   TEXT[] DEFAULT '{}',
  uv_rejection_pct  INT,
  ir_rejection_pct  INT,
  state_compliant   BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. PPF DETAILS
-- ============================================================
CREATE TABLE IF NOT EXISTS ppf_details (
  certificate_id        UUID PRIMARY KEY REFERENCES certificates(id) ON DELETE CASCADE,
  film_brand            TEXT NOT NULL,
  film_product          TEXT NOT NULL,
  coverage_areas        TEXT[] DEFAULT '{}',
  finish_type           TEXT,
  edge_technique        TEXT,
  self_healing_confirmed BOOLEAN,
  manufacturer_cert_id  TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. AUDIO / ELECTRONICS DETAILS
-- ============================================================
CREATE TABLE IF NOT EXISTS audio_electronics_details (
  certificate_id        UUID PRIMARY KEY REFERENCES certificates(id) ON DELETE CASCADE,
  install_type          TEXT[] DEFAULT '{}',
  equipment_list        JSONB DEFAULT '[]',
  labor_scope           TEXT,
  oem_integration       BOOLEAN,
  wiring_diagram_url    TEXT,
  parts_warranty_months INT,
  labor_warranty_months INT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 10. MECHANICAL DETAILS
-- ============================================================
CREATE TABLE IF NOT EXISTS mechanical_details (
  certificate_id        UUID PRIMARY KEY REFERENCES certificates(id) ON DELETE CASCADE,
  service_category      TEXT NOT NULL,
  parts_used            JSONB DEFAULT '[]',
  labor_description     TEXT,
  dtc_codes_cleared     TEXT[] DEFAULT '{}',
  torque_specs_confirmed BOOLEAN,
  fluids_used           JSONB DEFAULT '[]',
  maintenance_schedule  TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 11. WHEELS & TIRES DETAILS
-- ============================================================
CREATE TABLE IF NOT EXISTS wheels_tires_details (
  certificate_id        UUID PRIMARY KEY REFERENCES certificates(id) ON DELETE CASCADE,
  service_type          TEXT NOT NULL,
  tire_specs            JSONB,
  wheel_specs           JSONB,
  tread_depth_32nds     INT,
  lug_torque_ft_lbs     INT,
  tpms_reset            BOOLEAN,
  road_hazard_coverage  BOOLEAN,
  prorate_method        TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 12. WARRANTY CLAIMS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS warranty_claims (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id    UUID NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
  business_id       UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  claim_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  description       TEXT NOT NULL,
  status            claim_status_enum NOT NULL DEFAULT 'pending',
  resolution        TEXT,
  resolved_date     DATE,
  odometer_at_claim INT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_warranty_claims_cert ON warranty_claims(certificate_id);
CREATE INDEX IF NOT EXISTS idx_warranty_claims_business ON warranty_claims(business_id);

-- ============================================================
-- 13. CERT NUMBER GENERATION FUNCTION
-- Format: WC-{SHOP_SLUG}-{YYYYMM}-{SEQ}
-- ============================================================
CREATE OR REPLACE FUNCTION generate_cert_number(p_business_id UUID)
RETURNS TEXT AS $$
DECLARE
  shop_code TEXT;
  month_str TEXT;
  seq INTEGER;
BEGIN
  SELECT COALESCE(
    UPPER(SUBSTRING(slug, 1, 5)),
    UPPER(SUBSTRING(REPLACE(name, ' ', ''), 1, 5))
  ) INTO shop_code
  FROM businesses WHERE id = p_business_id;

  month_str := TO_CHAR(NOW(), 'YYYYMM');

  SELECT COUNT(*) + 1 INTO seq
  FROM certificates
  WHERE business_id = p_business_id
    AND certificate_number LIKE 'WC-' || shop_code || '-' || month_str || '-%';

  RETURN 'WC-' || shop_code || '-' || month_str || '-' || LPAD(seq::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 14. ROW LEVEL SECURITY
-- ============================================================

-- Vehicles: global table, any authenticated user can read/insert
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated users can view all vehicles"
  ON vehicles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated users can insert vehicles"
  ON vehicles FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated users can update vehicles"
  ON vehicles FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Anon can view vehicles (for public VIN lookup)
CREATE POLICY "anon can view vehicles"
  ON vehicles FOR SELECT
  TO anon
  USING (true);

-- Detail tables: business-scoped via certificate join
-- (Users can only access details for certs they own)

ALTER TABLE ceramic_coating_details  ENABLE ROW LEVEL SECURITY;
ALTER TABLE window_tint_details      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppf_details              ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_electronics_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE mechanical_details       ENABLE ROW LEVEL SECURITY;
ALTER TABLE wheels_tires_details     ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranty_claims          ENABLE ROW LEVEL SECURITY;

-- Macro: create business-scoped policies for detail tables
-- Each detail table is accessible if the linked certificate belongs to the user's business

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'ceramic_coating_details',
    'window_tint_details',
    'ppf_details',
    'audio_electronics_details',
    'mechanical_details',
    'wheels_tires_details'
  ] LOOP
    -- Authenticated users in same business can read
    EXECUTE format(
      'CREATE POLICY "business can view %1$s" ON %1$s FOR SELECT TO authenticated
       USING (certificate_id IN (
         SELECT id FROM certificates WHERE business_id = get_my_business_id()
         UNION SELECT id FROM certificates WHERE is_public = true
       ))',
      tbl
    );

    -- Authenticated users in same business can insert
    EXECUTE format(
      'CREATE POLICY "business can insert %1$s" ON %1$s FOR INSERT TO authenticated
       WITH CHECK (certificate_id IN (
         SELECT id FROM certificates WHERE business_id = get_my_business_id()
       ))',
      tbl
    );

    -- Authenticated users in same business can update
    EXECUTE format(
      'CREATE POLICY "business can update %1$s" ON %1$s FOR UPDATE TO authenticated
       USING (certificate_id IN (
         SELECT id FROM certificates WHERE business_id = get_my_business_id()
       ))
       WITH CHECK (certificate_id IN (
         SELECT id FROM certificates WHERE business_id = get_my_business_id()
       ))',
      tbl
    );

    -- Anon can view public cert details (for /verify page)
    EXECUTE format(
      'CREATE POLICY "anon can view public %1$s" ON %1$s FOR SELECT TO anon
       USING (certificate_id IN (
         SELECT id FROM certificates WHERE is_public = true
       ))',
      tbl
    );
  END LOOP;
END $$;

-- Warranty claims: business-scoped
CREATE POLICY "business can view own claims"
  ON warranty_claims FOR SELECT
  TO authenticated
  USING (business_id = get_my_business_id());

CREATE POLICY "business can insert claims"
  ON warranty_claims FOR INSERT
  TO authenticated
  WITH CHECK (business_id = get_my_business_id());

CREATE POLICY "business can update own claims"
  ON warranty_claims FOR UPDATE
  TO authenticated
  USING (business_id = get_my_business_id())
  WITH CHECK (business_id = get_my_business_id());

-- Anon can view claims for public certs (for /verify page)
CREATE POLICY "anon can view public cert claims"
  ON warranty_claims FOR SELECT
  TO anon
  USING (certificate_id IN (
    SELECT id FROM certificates WHERE is_public = true
  ));
