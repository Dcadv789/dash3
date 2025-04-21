/*
  # Adicionar filtro por empresa na tabela contas_dre_modelo

  1. Alterações
    - Adicionar coluna empresa_id
    - Adicionar foreign key para companies
    - Atualizar índices
*/

-- Adicionar coluna empresa_id
ALTER TABLE contas_dre_modelo
ADD COLUMN empresa_id text REFERENCES companies(id) ON DELETE CASCADE;

-- Criar índice para melhorar performance
CREATE INDEX idx_contas_dre_modelo_empresa ON contas_dre_modelo(empresa_id);