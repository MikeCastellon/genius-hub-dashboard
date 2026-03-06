-- ============================================================
-- Detailers Hub - Database Schema
-- Multi-tenant: each business gets its own data silo
-- Roles: super_admin | admin | user
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- BUSINESSES (white-label support)
-- Each detailing business is a tenant
-- ============================================================
CREATE TABLE IF NOT EXISTS businesses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE,           -- for white-label URL routing
  logo_url      TEXT,                  -- white-label logo
  primary_color TEXT DEFAULT '#3b82f6', -- white-label brand color
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROFILES
-- Extended user info linked to Supabase auth
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  email        TEXT,
  role         TEXT NOT NULL DEFAULT 'user'
                CHECK (role IN ('super_admin', 'admin', 'user')),
  business_id  UUID REFERENCES businesses(id) ON DELETE SET NULL,
  approved     BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email, role, approved)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'user',
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- SERVICES (replaces Products)
-- Each business defines their own service menu
-- ============================================================
CREATE TABLE IF NOT EXISTS services (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  price            DECIMAL(10,2) NOT NULL DEFAULT 0,
  category         TEXT NOT NULL DEFAULT 'General',
  duration_minutes INT,
  active           BOOLEAN NOT NULL DEFAULT true,
  business_id      UUID REFERENCES businesses(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CUSTOMERS
-- Shared across the platform (looked up by phone)
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  phone      TEXT NOT NULL,
  email      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(phone)
);

-- ============================================================
-- VEHICLE INTAKES (replaces Sales)
-- Each intake = one vehicle service session
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicle_intakes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID NOT NULL REFERENCES customers(id),
  vin             TEXT,
  year            INT,
  make            TEXT,
  model           TEXT,
  color           TEXT,
  license_plate   TEXT,
  payment_method  TEXT NOT NULL
                  CHECK (payment_method IN ('cash','zelle','venmo','ath_movil','credit_card')),
  subtotal        DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes           TEXT,
  technician_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  business_id     UUID REFERENCES businesses(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INTAKE SERVICES (line items)
-- ============================================================
CREATE TABLE IF NOT EXISTS intake_services (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id  UUID NOT NULL REFERENCES vehicle_intakes(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id),
  quantity   INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total      DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE businesses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE services         ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_intakes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_services  ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: get current user's business_id
CREATE OR REPLACE FUNCTION get_my_business_id()
RETURNS UUID AS $$
  SELECT business_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ---- BUSINESSES ----
CREATE POLICY "super_admin can manage businesses"
  ON businesses FOR ALL
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "users can view their business"
  ON businesses FOR SELECT
  USING (id = get_my_business_id() OR get_my_role() = 'super_admin');

-- ---- PROFILES ----
CREATE POLICY "super_admin can manage all profiles"
  ON profiles FOR ALL
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "admin can view profiles in their business"
  ON profiles FOR SELECT
  USING (
    get_my_role() = 'admin' AND business_id = get_my_business_id()
    OR id = auth.uid()
  );

CREATE POLICY "admin can update profiles in their business"
  ON profiles FOR UPDATE
  USING (
    get_my_role() = 'admin' AND business_id = get_my_business_id()
  )
  WITH CHECK (
    get_my_role() = 'admin' AND business_id = get_my_business_id()
  );

CREATE POLICY "users can read own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Allow trigger to insert profile on signup
CREATE POLICY "service role can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (true);

-- ---- SERVICES ----
CREATE POLICY "anyone in business can view services"
  ON services FOR SELECT
  USING (
    business_id = get_my_business_id()
    OR get_my_role() = 'super_admin'
  );

CREATE POLICY "admin can manage services"
  ON services FOR ALL
  USING (
    (get_my_role() = 'admin' AND business_id = get_my_business_id())
    OR get_my_role() = 'super_admin'
  )
  WITH CHECK (
    (get_my_role() = 'admin' AND business_id = get_my_business_id())
    OR get_my_role() = 'super_admin'
  );

-- ---- CUSTOMERS ----
CREATE POLICY "authenticated users can view customers"
  ON customers FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated users can upsert customers"
  ON customers FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated users can update customers"
  ON customers FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- ---- VEHICLE INTAKES ----
CREATE POLICY "users can view intakes in their business"
  ON vehicle_intakes FOR SELECT
  USING (
    business_id = get_my_business_id()
    OR get_my_role() = 'super_admin'
  );

CREATE POLICY "users can insert intakes for their business"
  ON vehicle_intakes FOR INSERT
  WITH CHECK (
    business_id = get_my_business_id()
    OR get_my_role() = 'super_admin'
  );

CREATE POLICY "admin can update intakes in their business"
  ON vehicle_intakes FOR UPDATE
  USING (
    (get_my_role() IN ('admin', 'super_admin') AND business_id = get_my_business_id())
    OR get_my_role() = 'super_admin'
  );

-- ---- INTAKE SERVICES ----
CREATE POLICY "users can view intake services"
  ON intake_services FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM vehicle_intakes vi
      WHERE vi.id = intake_id
        AND (vi.business_id = get_my_business_id() OR get_my_role() = 'super_admin')
    )
  );

CREATE POLICY "users can insert intake services"
  ON intake_services FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vehicle_intakes vi
      WHERE vi.id = intake_id
        AND (vi.business_id = get_my_business_id() OR get_my_role() = 'super_admin')
    )
  );

-- ============================================================
-- SEED: Default services (can be run per-business)
-- ============================================================
-- INSERT INTO services (name, price, category, duration_minutes, active, business_id)
-- VALUES
--   ('Full Detail', 250.00, 'Full Detail', 300, true, '<business_id>'),
--   ('Wash & Wax', 80.00, 'Exterior', 90, true, '<business_id>'),
--   ('Interior Detail', 120.00, 'Interior', 120, true, '<business_id>'),
--   ('Exterior Detail', 130.00, 'Exterior', 150, true, '<business_id>'),
--   ('Engine Bay Clean', 75.00, 'Engine', 60, true, '<business_id>'),
--   ('Paint Correction', 400.00, 'Paint', 480, true, '<business_id>'),
--   ('Ceramic Coating', 600.00, 'Paint', 600, true, '<business_id>'),
--   ('Odor Elimination', 60.00, 'Interior', 60, true, '<business_id>');

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_business ON profiles(business_id);
CREATE INDEX IF NOT EXISTS idx_services_business ON services(business_id);
CREATE INDEX IF NOT EXISTS idx_intakes_business  ON vehicle_intakes(business_id);
CREATE INDEX IF NOT EXISTS idx_intakes_created   ON vehicle_intakes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_intakes_customer  ON vehicle_intakes(customer_id);
CREATE INDEX IF NOT EXISTS idx_intake_svc_intake ON intake_services(intake_id);
