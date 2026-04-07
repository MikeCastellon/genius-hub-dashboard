-- Add consequence column to recall_lookups
ALTER TABLE recall_lookups ADD COLUMN IF NOT EXISTS consequence TEXT;
