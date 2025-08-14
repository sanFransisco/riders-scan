-- Fix driver name constraint to allow NULL values
ALTER TABLE drivers ALTER COLUMN full_name DROP NOT NULL;

-- Update schema version
UPDATE schema_version SET version = version + 1, updated_at = NOW();
