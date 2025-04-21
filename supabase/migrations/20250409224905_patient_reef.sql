/*
  # Atualizar tipo de conta no DRE Config

  1. Alterações
    - Alterar tipo 'blank' para 'flex'
    - Atualizar registros existentes
    - Manter todas as funcionalidades existentes
*/

-- Criar novo tipo com 'flex' ao invés de 'blank'
CREATE TYPE dre_config_account_type_new AS ENUM ('revenue', 'expense', 'total', 'flex');

-- Alterar a tabela para usar o novo tipo
ALTER TABLE dre_config_accounts 
  ALTER COLUMN type TYPE dre_config_account_type_new 
  USING (
    CASE 
      WHEN type::text = 'blank' THEN 'flex'::dre_config_account_type_new
      ELSE type::text::dre_config_account_type_new
    END
  );

-- Remover o tipo antigo
DROP TYPE dre_config_account_type;

-- Renomear o novo tipo para manter o nome original
ALTER TYPE dre_config_account_type_new RENAME TO dre_config_account_type;

-- Atualizar a constraint para usar 'flex'
ALTER TABLE dre_config_accounts 
  DROP CONSTRAINT valid_blank_account,
  ADD CONSTRAINT valid_flex_account CHECK (
    (type = 'flex' AND sign IS NOT NULL) OR
    (type != 'flex')
  );