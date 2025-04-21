/*
  # Atualização do sistema de empresas

  1. Alterações na tabela companies
    - Adicionado campo contract_start_date (data de início do contrato)
    - Adicionado campo company_code (código único da empresa)
  
  2. Nova Tabela
    - `company_partners` (sócios da empresa)
      - id (uuid, chave primária)
      - company_id (referência à tabela companies)
      - name (nome do sócio)
      - cpf (CPF do sócio)
      - role (cargo/função)
      - ownership_percentage (percentual de participação)
      - is_active (status do sócio)
      - created_at (data de criação)
      - updated_at (data de atualização)

  3. Segurança
    - Habilitar RLS na nova tabela
    - Adicionar políticas de acesso
*/

-- Adiciona novos campos à tabela companies
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS contract_start_date date,
ADD COLUMN IF NOT EXISTS company_code text UNIQUE;

-- Cria a tabela de sócios
CREATE TABLE company_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  cpf text NOT NULL,
  role text NOT NULL,
  ownership_percentage numeric(5,2) CHECK (ownership_percentage >= 0 AND ownership_percentage <= 100),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilita RLS na tabela de sócios
ALTER TABLE company_partners ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso para sócios
CREATE POLICY "Usuários autenticados podem visualizar sócios"
  ON company_partners
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem inserir sócios"
  ON company_partners
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar sócios"
  ON company_partners
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem deletar sócios"
  ON company_partners
  FOR DELETE
  TO authenticated
  USING (true);