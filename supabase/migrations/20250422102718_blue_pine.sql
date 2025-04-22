/*
  # Adicionar nome personalizado aos componentes do DRE

  1. Alterações
    - Adicionar coluna nome_exibicao na tabela contas_dre_componentes
    - Permitir que seja nulo (fallback para o nome original)
    - Atualizar índices
*/

-- Adicionar coluna de nome personalizado
ALTER TABLE contas_dre_componentes
ADD COLUMN nome_exibicao text;

-- Criar índice para melhorar performance
CREATE INDEX idx_contas_dre_componentes_nome ON contas_dre_componentes(nome_exibicao);