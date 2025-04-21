/*
  # Adicionar foreign key na tabela dre_empresa_componentes

  1. Alterações
    - Adicionar foreign key no campo componente_id
    - Referenciar tabela contas_dre_componentes
    - Permitir JOINs aninhados via API REST
*/

-- Adicionar foreign key
ALTER TABLE dre_empresa_componentes
ADD CONSTRAINT dre_empresa_componentes_componente_id_fkey
FOREIGN KEY (componente_id)
REFERENCES contas_dre_componentes(id)
ON DELETE CASCADE;

-- Criar índice para melhorar performance dos JOINs
CREATE INDEX IF NOT EXISTS idx_dre_empresa_componentes_componente_id
ON dre_empresa_componentes(componente_id);