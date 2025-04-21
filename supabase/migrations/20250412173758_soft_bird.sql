/*
  # Corrigir constraints do DRE Config

  1. Alterações
    - Ajustar a constraint valid_total_account para permitir apenas selected_accounts
    - Remover a validação de indicator_id para contas do tipo total
*/

-- Remover constraints existentes
ALTER TABLE dre_config_accounts 
DROP CONSTRAINT IF EXISTS valid_category_account,
DROP CONSTRAINT IF EXISTS valid_indicator_account,
DROP CONSTRAINT IF EXISTS valid_total_account,
DROP CONSTRAINT IF EXISTS valid_flex_account;

-- Recriar constraints corretamente
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