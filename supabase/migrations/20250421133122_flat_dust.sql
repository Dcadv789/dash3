/*
  # Empresas DRE Accounts System

  1. New Table: empresas_contas_dre
    - Links companies to DRE model accounts
    - Custom order and visibility per company
    - References to companies and model accounts

  2. Security
    - RLS enabled
    - Policies for authenticated users
*/

-- Create table for company DRE accounts
CREATE TABLE empresas_contas_dre (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id text REFERENCES companies(id) ON DELETE CASCADE,
  conta_dre_modelo_id uuid REFERENCES contas_dre_modelo(id) ON DELETE CASCADE,
  ordem integer NOT NULL DEFAULT 0,
  visivel boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure unique combination of empresa_id and conta_dre_modelo_id
  UNIQUE(empresa_id, conta_dre_modelo_id)
);

-- Trigger to update updated_at
CREATE TRIGGER update_empresas_contas_dre_updated_at
  BEFORE UPDATE ON empresas_contas_dre
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE empresas_contas_dre ENABLE ROW LEVEL SECURITY;

-- Security policies
CREATE POLICY "Usuários autenticados podem visualizar contas da empresa"
  ON empresas_contas_dre
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem gerenciar contas da empresa"
  ON empresas_contas_dre
  FOR ALL
  TO authenticated
  USING (true);

-- Indexes
CREATE INDEX idx_empresas_contas_dre_empresa ON empresas_contas_dre(empresa_id);
CREATE INDEX idx_empresas_contas_dre_conta ON empresas_contas_dre(conta_dre_modelo_id);
CREATE INDEX idx_empresas_contas_dre_ordem ON empresas_contas_dre(ordem);