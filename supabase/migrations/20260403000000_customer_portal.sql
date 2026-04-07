-- ============================================================
-- Customer Portal & CRM Migration
-- ============================================================

-- 1. Add preferred_contact to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS preferred_contact TEXT DEFAULT 'phone';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_preferred_contact_check') THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_preferred_contact_check
      CHECK (preferred_contact IN ('phone', 'email', 'sms'));
  END IF;
END $$;

-- 2. Update role check to include 'customer'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin', 'admin', 'user', 'customer'));

-- 3. Extend customers table
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS total_spend NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_visit TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- 4. Phone unique per business (not globally)
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_phone_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_phone_business
  ON customers(phone, business_id) WHERE business_id IS NOT NULL;

-- 5. Customer notes table
CREATE TABLE IF NOT EXISTS customer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_customers_business ON customers(business_id);
CREATE INDEX IF NOT EXISTS idx_customers_profile ON customers(profile_id);
CREATE INDEX IF NOT EXISTS idx_customer_notes_customer ON customer_notes(customer_id);

-- 7. RLS on customer_notes
ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'staff_manage_notes' AND tablename = 'customer_notes') THEN
  CREATE POLICY "staff_manage_notes" ON customer_notes
    FOR ALL USING (EXISTS (SELECT 1 FROM customers c WHERE c.id = customer_notes.customer_id AND c.business_id = get_my_business_id()));
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'customer_read_own_notes' AND tablename = 'customer_notes') THEN
  CREATE POLICY "customer_read_own_notes" ON customer_notes
    FOR SELECT USING (customer_id IN (SELECT id FROM customers WHERE profile_id = auth.uid()));
END IF;
END $$;

-- 8. Update customers RLS: scope to business
DROP POLICY IF EXISTS "Authenticated users can view customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can insert customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can update customers" ON customers;

CREATE POLICY "staff_view_customers" ON customers FOR SELECT USING (business_id = get_my_business_id() OR get_my_role() = 'super_admin');
CREATE POLICY "staff_insert_customers" ON customers FOR INSERT WITH CHECK (business_id = get_my_business_id() OR get_my_role() = 'super_admin');
CREATE POLICY "staff_update_customers" ON customers FOR UPDATE USING (business_id = get_my_business_id() OR get_my_role() = 'super_admin');

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'customer_view_own' AND tablename = 'customers') THEN
  CREATE POLICY "customer_view_own" ON customers FOR SELECT USING (profile_id = auth.uid());
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'customer_update_own' AND tablename = 'customers') THEN
  CREATE POLICY "customer_update_own" ON customers FOR UPDATE USING (profile_id = auth.uid());
END IF;
END $$;

-- 9-11. Customer portal RLS policies
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'customer_view_own_appointments' AND tablename = 'appointments') THEN
  CREATE POLICY "customer_view_own_appointments" ON appointments FOR SELECT USING (
    customer_email IN (SELECT p.email FROM profiles p WHERE p.id = auth.uid() AND p.role = 'customer')
    OR customer_phone IN (SELECT c.phone FROM customers c WHERE c.profile_id = auth.uid())
  );
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'customer_view_own_intakes' AND tablename = 'vehicle_intakes') THEN
  CREATE POLICY "customer_view_own_intakes" ON vehicle_intakes FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE profile_id = auth.uid())
  );
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'customer_view_own_invoices' AND tablename = 'invoices') THEN
  CREATE POLICY "customer_view_own_invoices" ON invoices FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE profile_id = auth.uid())
  );
END IF;
END $$;

-- 12. Updated handle_new_user trigger (supports customer role)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  meta_role TEXT;
  meta_business_id UUID;
BEGIN
  meta_role := COALESCE(NEW.raw_user_meta_data->>'role', 'user');
  meta_business_id := (NEW.raw_user_meta_data->>'business_id')::UUID;
  IF meta_role NOT IN ('super_admin', 'admin', 'user', 'customer') THEN meta_role := 'user'; END IF;

  INSERT INTO profiles (id, display_name, email, role, business_id, approved)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.email, meta_role, meta_business_id,
    CASE WHEN meta_role = 'customer' THEN true ELSE false END
  );

  IF meta_role = 'customer' AND meta_business_id IS NOT NULL THEN
    UPDATE customers SET profile_id = NEW.id
    WHERE email = NEW.email AND business_id = meta_business_id AND profile_id IS NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Auto-update customer stats on intake
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE customers SET
    total_spend = COALESCE(total_spend, 0) + COALESCE(NEW.subtotal, 0),
    last_visit = GREATEST(COALESCE(last_visit, '1970-01-01'::timestamptz), NEW.created_at)
  WHERE id = NEW.customer_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_intake_created ON vehicle_intakes;
CREATE TRIGGER on_intake_created AFTER INSERT ON vehicle_intakes FOR EACH ROW EXECUTE FUNCTION update_customer_stats();

-- 14. Allow custom payment methods
ALTER TABLE vehicle_intakes DROP CONSTRAINT IF EXISTS vehicle_intakes_payment_method_check;
