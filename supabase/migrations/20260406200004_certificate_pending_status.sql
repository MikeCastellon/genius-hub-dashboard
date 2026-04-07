-- Add 'pending' to the certificate status check constraint
ALTER TABLE certificates DROP CONSTRAINT certificates_status_check;
ALTER TABLE certificates ADD CONSTRAINT certificates_status_check
  CHECK (status IN ('pending', 'active', 'expired', 'voided'));
