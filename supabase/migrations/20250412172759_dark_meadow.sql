/*
  # Fix DRE Config Account Type Migration

  1. Changes
    - Fix type casting issue when updating dre_config_account_type
    - Add 'calculated' as an option in a safe way
    - Maintain existing data and constraints
*/

-- Drop existing constraints that reference the type
ALTER TABLE dre_config_accounts 
DROP CONSTRAINT IF EXISTS valid_category_account,
DROP CONSTRAINT IF EXISTS valid_indicator_account,
DROP CONSTRAINT IF EXISTS valid_total_account,
DROP CONSTRAINT IF EXISTS valid_flex_account;

-- Create new type
CREATE TYPE dre_config_account_type_new AS ENUM (
  'revenue',
  'expense',
  'total',
  'flex',
  'calculated'
);

-- Update the column type safely
ALTER TABLE dre_config_accounts
ALTER COLUMN type DROP DEFAULT;

ALTER TABLE dre_config_accounts
ALTER COLUMN type TYPE dre_config_account_type_new
USING type::text::dre_config_account_type_new;

-- Drop old type
DROP TYPE IF EXISTS dre_config_account_type;

-- Rename new type
ALTER TYPE dre_config_account_type_new RENAME TO dre_config_account_type;

-- Re-add constraints
ALTER TABLE dre_config_accounts ADD CONSTRAINT valid_category_account
  CHECK (
    (type IN ('revenue', 'expense') AND category_ids IS NOT NULL) OR
    (type NOT IN ('revenue', 'expense'))
  );

ALTER TABLE dre_config_accounts ADD CONSTRAINT valid_total_account
  CHECK (
    (type = 'total' AND selected_accounts IS NOT NULL) OR
    (type != 'total')
  );

ALTER TABLE dre_config_accounts ADD CONSTRAINT valid_flex_account
  CHECK (
    (type = 'flex' AND sign IS NOT NULL) OR
    (type != 'flex')
  );

ALTER TABLE dre_config_accounts ADD CONSTRAINT valid_indicator_account
  CHECK (
    (type = 'calculated' AND indicator_id IS NOT NULL) OR
    (type != 'calculated')
  );