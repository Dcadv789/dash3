/*
  # Atualizar sistema DRE Config para suportar múltiplas empresas

  1. Alterações
    - Remover constraint de company_id da tabela dre_config_accounts
    - Criar nova tabela de relação entre contas e empresas
    - Migrar dados existentes para nova estrutura
    - Adicionar índices e políticas de segurança

  2. Segurança
    - Manter RLS habilitado
    - Adicionar políticas para nova tabela
*/

-- Remover foreign key de company_id
ALTER TABLE dre_config_accounts
DROP CONSTRAINT dre_config_accounts_company_id_fkey;

-- Criar nova tabela de relação
CREATE TABLE dre_config_account_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES dre_config_accounts(id) ON DELETE CASCADE,
  company_id text REFERENCES companies(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(account_id, company_id)
);

-- Migrar dados existentes
INSERT INTO dre_config_account_companies (account_id, company_id, is_active)
SELECT id, company_id, is_active
FROM dre_config_accounts
WHERE company_id IS NOT NULL;

-- Remover coluna company_id que não será mais necessária
ALTER TABLE dre_config_accounts
DROP COLUMN company_id;

-- Adicionar trigger para updated_at
CREATE TRIGGER update_dre_config_account_companies_updated_at
  BEFORE UPDATE ON dre_config_account_companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS
ALTER TABLE dre_config_account_companies ENABLE ROW LEVEL SECURITY;

-- Adicionar políticas de segurança
CREATE POLICY "Usuários autenticados podem visualizar relações"
  ON dre_config_account_companies
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem gerenciar relações"
  ON dre_config_account_companies
  FOR ALL
  TO authenticated
  USING (true);

-- Criar índices
CREATE INDEX idx_dre_config_account_companies_account_id 
  ON dre_config_account_companies(account_id);
CREATE INDEX idx_dre_config_account_companies_company_id 
  ON dre_config_account_companies(company_id);