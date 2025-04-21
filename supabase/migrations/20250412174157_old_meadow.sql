/*
  # Corrigir constraint de contas totais no DRE Config

  1. Alterações
    - Ajustar a constraint valid_total_account para permitir indicator_id OU selected_accounts
    - Manter outras constraints inalteradas
*/

-- Remover constraints existentes
ALTER TABLE dre_config_accounts 
DROP CONSTRAINT IF EXISTS valid_total_account;

-- Recriar constraint permitindo indicator_id OU selected_accounts
ALTER TABLE dre_config_accounts ADD CONSTRAINT valid_total_account
  CHECK (
    (type = 'total' AND (indicator_id IS NOT NULL OR selected_accounts IS NOT NULL)) OR
    (type != 'total')
  );