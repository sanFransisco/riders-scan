-- Add review_approved field to reviews table
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS review_approved BOOLEAN DEFAULT false;

-- Update schema version
UPDATE schema_version SET version = version + 1, updated_at = NOW();
