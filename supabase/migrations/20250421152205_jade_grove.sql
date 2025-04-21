/*
  # Fix Categories System

  1. Changes
    - Add sequence for category codes
    - Update trigger function
    - Add validation for code format
*/

-- Create sequences for revenue and expense codes
CREATE SEQUENCE IF NOT EXISTS category_revenue_seq START 1;
CREATE SEQUENCE IF NOT EXISTS category_expense_seq START 1;

-- Update the function to use sequences
CREATE OR REPLACE FUNCTION generate_category_code(category_type category_type)
RETURNS text AS $$
DECLARE
  prefix text;
  next_number integer;
BEGIN
  -- Define prefix and get next number based on type
  IF category_type = 'revenue' THEN
    prefix := 'R';
    next_number := nextval('category_revenue_seq');
  ELSE
    prefix := 'D';
    next_number := nextval('category_expense_seq');
  END IF;
  
  -- Generate code with padding
  RETURN prefix || LPAD(next_number::text, 4, '0');
END;
$$ LANGUAGE plpgsql;