/*
  # DRE Config Tables

  1. New Tables
    - `dre_accounts`
      - id (uuid, primary key)
      - code (text, unique)
      - name (text)
      - type (enum: revenue, expense, total, blank)
      - display_order (integer)
      - company_id (reference to companies)
      - category_ids (uuid array, for category type)
      - indicator_id (uuid, for indicator type)
      - selected_accounts (uuid array, for total type)
      - parent_account_id (self-reference)
      - is_active (boolean)
      - sign (enum: positive, negative, for blank type)
      - created_at (timestamp)
      - updated_at (timestamp)

  2. Security
    - RLS enabled
    - Policies for authenticated users
*/

-- Create account type enum
CREATE TYPE dre_account_type AS ENUM ('revenue', 'expense', 'total', 'blank');
CREATE TYPE dre_account_sign AS ENUM ('positive', 'negative');

-- Create DRE accounts table
CREATE TABLE dre_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  type dre_account_type NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  company_id text REFERENCES companies(id) ON DELETE CASCADE,
  category_ids uuid[] DEFAULT NULL,
  indicator_id uuid DEFAULT NULL,
  selected_accounts uuid[] DEFAULT NULL,
  parent_account_id uuid REFERENCES dre_accounts(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  sign dre_account_sign DEFAULT 'positive',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Validations
  CONSTRAINT valid_category_account CHECK (
    (type IN ('revenue', 'expense') AND category_ids IS NOT NULL) OR
    (type NOT IN ('revenue', 'expense'))
  ),
  CONSTRAINT valid_indicator_account CHECK (
    (type = 'indicator' AND indicator_id IS NOT NULL) OR
    (type != 'indicator')
  ),
  CONSTRAINT valid_total_account CHECK (
    (type = 'total' AND selected_accounts IS NOT NULL) OR
    (type != 'total')
  ),
  CONSTRAINT valid_blank_account CHECK (
    (type = 'blank' AND sign IS NOT NULL) OR
    (type != 'blank')
  )
);

-- Function to generate account code
CREATE OR REPLACE FUNCTION generate_dre_account_code()
RETURNS text AS $$
DECLARE
  next_number integer;
  next_code text;
BEGIN
  SELECT COALESCE(MAX(NULLIF(regexp_replace(code, '[^0-9]', '', 'g'), '')::integer), 0) + 1
  INTO next_number
  FROM dre_accounts;
  
  next_code := 'A' || LPAD(next_number::text, 4, '0');
  
  RETURN next_code;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate code
CREATE OR REPLACE FUNCTION set_dre_account_code()
RETURNS trigger AS $$
BEGIN
  IF NEW.code IS NULL THEN
    NEW.code := generate_dre_account_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_dre_account_code
  BEFORE INSERT ON dre_accounts
  FOR EACH ROW
  EXECUTE FUNCTION set_dre_account_code();

-- Trigger to update updated_at
CREATE TRIGGER update_dre_accounts_updated_at
  BEFORE UPDATE ON dre_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE dre_accounts ENABLE ROW LEVEL SECURITY;

-- Security policies
CREATE POLICY "Authenticated users can view DRE accounts"
  ON dre_accounts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage DRE accounts"
  ON dre_accounts
  FOR ALL
  TO authenticated
  USING (true);

-- Indexes
CREATE INDEX idx_dre_accounts_company_id ON dre_accounts(company_id);
CREATE INDEX idx_dre_accounts_parent_id ON dre_accounts(parent_account_id);
CREATE INDEX idx_dre_accounts_type ON dre_accounts(type);
CREATE INDEX idx_dre_accounts_display_order ON dre_accounts(display_order);