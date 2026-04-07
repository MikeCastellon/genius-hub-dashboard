-- Create storage bucket for repair media (photos/videos for AI guides)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'repairs-media',
  'repairs-media',
  true,
  20971520, -- 20MB max (for short videos)
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4']
);

-- RLS: authenticated users can upload repair media
CREATE POLICY "Authenticated users can upload repair media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'repairs-media');

-- RLS: anyone can view repair media (for AI guide display)
CREATE POLICY "Anyone can view repair media"
ON storage.objects FOR SELECT
USING (bucket_id = 'repairs-media');
