-- Shop signature stored on business (used on all certificates)
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS signature_url TEXT;

-- Customer signature stored per certificate
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS customer_signature_url TEXT;
