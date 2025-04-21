/*
  # Allow master users to access all companies

  1. Changes
    - Add new column to system_users to indicate if user has access to all companies
    - Update existing master users to have all companies access
    - Add new policies for master users
*/

-- Add column to indicate if user has access to all companies
ALTER TABLE system_users
ADD COLUMN has_all_companies_access boolean DEFAULT false;

-- Update existing master users to have access to all companies
UPDATE system_users
SET has_all_companies_access = true
WHERE role = 'master';

-- Create trigger to automatically set has_all_companies_access for master users
CREATE OR REPLACE FUNCTION set_master_companies_access()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'master' THEN
    NEW.has_all_companies_access := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_master_companies_access
  BEFORE INSERT OR UPDATE ON system_users
  FOR EACH ROW
  EXECUTE FUNCTION set_master_companies_access();