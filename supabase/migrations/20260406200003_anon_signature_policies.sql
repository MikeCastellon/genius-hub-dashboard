-- Allow anonymous users to update customer_signature_url on public certificates
CREATE POLICY "anon can sign public certificates"
  ON certificates
  FOR UPDATE
  TO anon
  USING (is_public = true AND customer_signature_url IS NULL)
  WITH CHECK (is_public = true);

-- Storage policies for certificate-photos bucket
CREATE POLICY "Auth users can upload certificate photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'certificate-photos');

CREATE POLICY "Anon can upload customer signatures"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'certificate-photos' AND (storage.foldername(name))[1] = 'signatures');

CREATE POLICY "Anyone can view certificate photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'certificate-photos');

CREATE POLICY "Auth users can manage certificate photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'certificate-photos');

CREATE POLICY "Auth users can update certificate photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'certificate-photos');
