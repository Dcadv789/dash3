/*
  # Atualizar tipo de conta no DRE Config

  1. Alterações
    - Adicionar 'calculated' como opção no enum dre_config_account_type
    - Manter compatibilidade com registros existentes
    - Atualizar constraints relacionadas
*/

-- Criar novo tipo com a opção adicional
CREATE TYPE dre_config_account_type_new AS ENUM ('revenue', 'expense', 'total', 'flex', 'calculated');

-- Alterar a tabela para usar o novo tipo
ALTER TABLE dre_config_accounts 
  ALTER COLUMN type TYPE dre_config_account_type_new 
  USING (type::text::dre_config_account_type_new);

-- Remover o tipo antigo
DROP TYPE dre_config_account_type;

-- Renomear o novo tipo para manter o nome original
ALTER TYPE dre_config_account_type_new RENAME TO dre_config_account_type;

-- Atualizar a constraint para incluir o novo tipo
ALTER TABLE dre_config_accounts 
  DROP CONSTRAINT IF EXISTS valid_indicator_account,
  ADD CONSTRAINT valid_indicator_account CHECK (
    (type = 'calculated' AND indicator_id IS NOT NULL) OR
    (type != 'calculated')
  );