/*
  # Atualizar tipos de conta no DRE Config

  1. Alterações
    - Remover tipo 'calculated'
    - Atualizar registros existentes para usar 'total'
    - Atualizar constraints
*/

-- Criar novo tipo sem a opção 'calculated'
CREATE TYPE dre_config_account_type_new AS ENUM ('revenue', 'expense', 'total', 'flex');

-- Converter registros existentes
UPDATE dre_config_accounts
SET type = 'total'
WHERE type = 'calculated';

-- Alterar a tabela para usar o novo tipo
ALTER TABLE dre_config_accounts 
  ALTER COLUMN type TYPE dre_config_account_type_new 
  USING (
    CASE 
      WHEN type::text = 'calculated' THEN 'total'::dre_config_account_type_new
      ELSE type::text::dre_config_account_type_new
    END
  );

-- Remover o tipo antigo
DROP TYPE dre_config_account_type;

-- Renomear o novo tipo
ALTER TYPE dre_config_account_type_new RENAME TO dre_config_account_type;

-- Atualizar as constraints
ALTER TABLE dre_config_accounts 
DROP CONSTRAINT IF EXISTS valid_category_account,
DROP CONSTRAINT IF EXISTS valid_indicator_account,
DROP CONSTRAINT IF EXISTS valid_total_account,
DROP CONSTRAINT IF EXISTS valid_flex_account;

ALTER TABLE dre_config_accounts ADD CONSTRAINT valid_category_account
  CHECK (
    (type IN ('revenue', 'expense') AND category_ids IS NOT NULL) OR
    (type NOT IN ('revenue', 'expense'))
  );

ALTER TABLE dre_config_accounts ADD CONSTRAINT valid_total_account
  CHECK (
    (type = 'total' AND (selected_accounts IS NOT NULL OR indicator_id IS NOT NULL)) OR
    (type != 'total')
  );

ALTER TABLE dre_config_accounts ADD CONSTRAINT valid_flex_account
  CHECK (
    (type = 'flex' AND sign IS NOT NULL) OR
    (type != 'flex')
  );