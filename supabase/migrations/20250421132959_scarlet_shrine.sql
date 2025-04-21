/*
  # DRE Model Accounts System

  1. Drop existing DRE tables
    - Remove all previous DRE-related tables
    - Clean up types and dependencies

  2. New Table: contas_dre_modelo
    - Base model for DRE accounts
    - Reusable across multiple companies
    - Formula and indicator support
    - Display order control

  3. Security
    - RLS enabled
    - Policies for authenticated users
*/

-- Drop existing DRE-related tables
DROP TABLE IF EXISTS dre_display_settings;
DROP TABLE IF EXISTS dre_lines;
DROP TABLE IF EXISTS dre_sections;
DROP TABLE IF EXISTS dre_templates;
DROP TABLE IF EXISTS dre_config_account_companies;
DROP TABLE IF EXISTS dre_config_accounts;

-- Drop existing types
DROP TYPE IF EXISTS dre_line_type;
DROP TYPE IF EXISTS dre_config_account_type;
DROP TYPE IF EXISTS dre_config_account_sign;
DROP TYPE IF EXISTS dre_account_type;
DROP TYPE IF EXISTS dre_account_sign;

-- Create type for account types
CREATE TYPE conta_dre_tipo AS ENUM (
  'simples',
  'composta',
  'formula',
  'indicador',
  'soma_indicadores'
);

-- Create table for DRE model accounts
CREATE TABLE contas_dre_modelo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo conta_dre_tipo NOT NULL,
  expressao text,
  ordem_padrao integer NOT NULL DEFAULT 0,
  visivel boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Validations
  CONSTRAINT valid_formula CHECK (
    (tipo = 'formula' AND expressao IS NOT NULL) OR
    (tipo != 'formula')
  )
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at
CREATE TRIGGER update_contas_dre_modelo_updated_at
  BEFORE UPDATE ON contas_dre_modelo
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE contas_dre_modelo ENABLE ROW LEVEL SECURITY;

-- Security policies
CREATE POLICY "Usuários autenticados podem visualizar contas modelo"
  ON contas_dre_modelo
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem gerenciar contas modelo"
  ON contas_dre_modelo
  FOR ALL
  TO authenticated
  USING (true);

-- Indexes
CREATE INDEX idx_contas_dre_modelo_tipo ON contas_dre_modelo(tipo);
CREATE INDEX idx_contas_dre_modelo_ordem ON contas_dre_modelo(ordem_padrao);