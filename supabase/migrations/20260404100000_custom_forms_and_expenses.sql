-- ============================================================
-- Custom Forms & Expenses
-- Migration: 20260404100000
-- ============================================================

-- ============================================================
-- FORM TEMPLATES
-- Business-scoped form definitions with JSONB field schema
-- ============================================================
CREATE TABLE IF NOT EXISTS form_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  fields        JSONB NOT NULL DEFAULT '[]',
  status        TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'active', 'archived')),
  created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FORM SUBMISSIONS
-- Filled-out form instances with JSONB responses
-- ============================================================
CREATE TABLE IF NOT EXISTS form_submissions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_template_id  UUID NOT NULL REFERENCES form_templates(id) ON DELETE CASCADE,
  business_id       UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  responses         JSONB NOT NULL DEFAULT '{}',
  customer_id       UUID REFERENCES customers(id) ON DELETE SET NULL,
  intake_id         UUID REFERENCES vehicle_intakes(id) ON DELETE SET NULL,
  submitted_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EXPENSES
-- Business expense tracking with categories
-- ============================================================
CREATE TABLE IF NOT EXISTS expenses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  amount        NUMERIC(10,2) NOT NULL,
  description   TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'other'
                  CHECK (category IN ('supplies', 'products', 'equipment', 'rent', 'utilities', 'marketing', 'labor', 'other')),
  vendor        TEXT,
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url   TEXT,
  is_recurring  BOOLEAN NOT NULL DEFAULT false,
  created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_form_templates_business ON form_templates(business_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_template ON form_submissions(form_template_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_business ON form_submissions(business_id);
CREATE INDEX IF NOT EXISTS idx_expenses_business ON expenses(business_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(business_id, date);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE form_templates   ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses         ENABLE ROW LEVEL SECURITY;

-- ---- FORM TEMPLATES ----
CREATE POLICY "users can view form templates in their business"
  ON form_templates FOR SELECT
  USING (business_id = get_my_business_id());

CREATE POLICY "admin can manage form templates"
  ON form_templates FOR ALL
  USING (
    business_id = get_my_business_id()
    AND get_my_role() IN ('admin', 'super_admin')
  )
  WITH CHECK (
    business_id = get_my_business_id()
    AND get_my_role() IN ('admin', 'super_admin')
  );

-- ---- FORM SUBMISSIONS ----
CREATE POLICY "users can view form submissions in their business"
  ON form_submissions FOR SELECT
  USING (business_id = get_my_business_id());

CREATE POLICY "authenticated users can submit forms"
  ON form_submissions FOR INSERT
  WITH CHECK (business_id = get_my_business_id());

CREATE POLICY "admin can manage form submissions"
  ON form_submissions FOR ALL
  USING (
    business_id = get_my_business_id()
    AND get_my_role() IN ('admin', 'super_admin')
  )
  WITH CHECK (
    business_id = get_my_business_id()
    AND get_my_role() IN ('admin', 'super_admin')
  );

-- ---- EXPENSES ----
CREATE POLICY "users can view expenses in their business"
  ON expenses FOR SELECT
  USING (business_id = get_my_business_id());

CREATE POLICY "authenticated users can add expenses"
  ON expenses FOR INSERT
  WITH CHECK (business_id = get_my_business_id());

CREATE POLICY "admin can manage expenses"
  ON expenses FOR ALL
  USING (
    business_id = get_my_business_id()
    AND get_my_role() IN ('admin', 'super_admin')
  )
  WITH CHECK (
    business_id = get_my_business_id()
    AND get_my_role() IN ('admin', 'super_admin')
  );

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('form-uploads', 'form-uploads', true),
  ('expense-receipts', 'expense-receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for form-uploads
CREATE POLICY "authenticated users can upload form files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'form-uploads' AND auth.role() = 'authenticated');

CREATE POLICY "anyone can view form uploads"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'form-uploads');

-- Storage policies for expense-receipts
CREATE POLICY "authenticated users can upload expense receipts"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'expense-receipts' AND auth.role() = 'authenticated');

CREATE POLICY "authenticated users can view expense receipts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'expense-receipts' AND auth.role() = 'authenticated');
