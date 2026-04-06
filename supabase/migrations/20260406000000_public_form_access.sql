-- ============================================================
-- Public Form Access
-- Allow anonymous users to view active forms and submit responses
-- ============================================================

-- Allow anonymous users to view active form templates (for public form links)
CREATE POLICY "anon can view active form templates"
  ON form_templates FOR SELECT
  USING (status = 'active');

-- Allow anonymous users to submit form responses (for public form links)
CREATE POLICY "anon can submit form responses"
  ON form_submissions FOR INSERT
  WITH CHECK (true);
