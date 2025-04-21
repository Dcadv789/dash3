-- Criar enum para tipo de conta
CREATE TYPE dre_config_account_type AS ENUM ('revenue', 'expense', 'total', 'flex');
CREATE TYPE dre_config_account_sign AS ENUM ('positive', 'negative');

-- Criar tabela principal
CREATE TABLE dre_config_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  type dre_config_account_type NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  company_id text REFERENCES companies(id) ON DELETE CASCADE,
  category_ids uuid[] DEFAULT NULL,
  indicator_id uuid DEFAULT NULL,
  selected_accounts uuid[] DEFAULT NULL,
  parent_account_id uuid REFERENCES dre_config_accounts(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  sign dre_config_account_sign DEFAULT 'positive',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Validações
  CONSTRAINT valid_category_account CHECK (
    (type IN ('revenue', 'expense') AND category_ids IS NOT NULL) OR
    (type NOT IN ('revenue', 'expense'))
  ),
  CONSTRAINT valid_total_account CHECK (
    (type = 'total' AND selected_accounts IS NOT NULL) OR
    (type != 'total')
  ),
  CONSTRAINT valid_flex_account CHECK (
    (type = 'flex' AND sign IS NOT NULL) OR
    (type != 'flex')
  )
);

-- Função para gerar código único
CREATE OR REPLACE FUNCTION generate_dre_config_code()
RETURNS text AS $$
DECLARE
  next_number integer;
  next_code text;
BEGIN
  SELECT COALESCE(MAX(NULLIF(regexp_replace(code, '[^0-9]', '', 'g'), '')::integer), 0) + 1
  INTO next_number
  FROM dre_config_accounts;
  
  next_code := 'A' || LPAD(next_number::text, 4, '0');
  
  RETURN next_code;
END;
$$ LANGUAGE plpgsql;

-- Trigger para código automático
CREATE OR REPLACE FUNCTION set_dre_config_code()
RETURNS trigger AS $$
BEGIN
  IF NEW.code IS NULL THEN
    NEW.code := generate_dre_config_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_dre_config_code
  BEFORE INSERT ON dre_config_accounts
  FOR EACH ROW
  EXECUTE FUNCTION set_dre_config_code();

-- Trigger para atualizar updated_at
CREATE TRIGGER update_dre_config_accounts_updated_at
  BEFORE UPDATE ON dre_config_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS
ALTER TABLE dre_config_accounts ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Usuários autenticados podem visualizar contas do DRE"
  ON dre_config_accounts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem gerenciar contas do DRE"
  ON dre_config_accounts
  FOR ALL
  TO authenticated
  USING (true);

-- Índices para performance
CREATE INDEX idx_dre_config_accounts_company_id ON dre_config_accounts(company_id);
CREATE INDEX idx_dre_config_accounts_parent_id ON dre_config_accounts(parent_account_id);
CREATE INDEX idx_dre_config_accounts_type ON dre_config_accounts(type);
CREATE INDEX idx_dre_config_accounts_display_order ON dre_config_accounts(display_order);