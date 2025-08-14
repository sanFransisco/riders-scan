-- Fix service field constraint to allow NULL values
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_service_check;
ALTER TABLE reviews ADD CONSTRAINT reviews_service_check 
  CHECK (service IS NULL OR service IN ('Yango', 'Gett', 'Uber', 'Other'));
