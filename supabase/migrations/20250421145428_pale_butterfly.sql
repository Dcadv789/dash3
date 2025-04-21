/*
  # Adicionar coluna símbolo à tabela contas_dre_modelo

  1. Alterações
    - Adicionar coluna simbolo do tipo text
    - Adicionar constraint para validar símbolos permitidos
    - Atualizar registros existentes
*/

-- Adicionar coluna simbolo
ALTER TABLE contas_dre_modelo
ADD COLUMN simbolo text;

-- Adicionar constraint para validar símbolos
ALTER TABLE contas_dre_modelo
ADD CONSTRAINT valid_simbolo CHECK (simbolo IN ('+', '-', '='));

-- Atualizar registros existentes baseado no tipo
UPDATE contas_dre_modelo
SET simbolo = CASE
  WHEN tipo = 'simples' THEN '+'
  WHEN tipo = 'composta' THEN '-'
  WHEN tipo IN ('formula', 'indicador', 'soma_indicadores') THEN '='
  ELSE '='
END;