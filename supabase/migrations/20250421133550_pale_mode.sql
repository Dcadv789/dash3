/*
  # Sistema de Componentes do DRE

  1. Nova Tabela: contas_dre_componentes
    - Componentes para cálculo de contas compostas
    - Referências para categorias, indicadores e outras contas
    - Pesos e ordem para cálculos sequenciais

  2. Segurança
    - RLS habilitado
    - Políticas para usuários autenticados
*/

-- Criar enum para tipos de referência
CREATE TYPE referencia_tipo AS ENUM ('categoria', 'indicador', 'conta');

-- Criar tabela de componentes
CREATE TABLE contas_dre_componentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_dre_modelo_id uuid REFERENCES contas_dre_modelo(id) ON DELETE CASCADE,
  referencia_tipo referencia_tipo NOT NULL,
  referencia_id uuid NOT NULL,
  peso numeric(10,2) DEFAULT 1,
  ordem integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_contas_dre_componentes_updated_at
  BEFORE UPDATE ON contas_dre_componentes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS
ALTER TABLE contas_dre_componentes ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Usuários autenticados podem visualizar componentes"
  ON contas_dre_componentes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem gerenciar componentes"
  ON contas_dre_componentes
  FOR ALL
  TO authenticated
  USING (true);

-- Índices para performance
CREATE INDEX idx_contas_dre_componentes_conta ON contas_dre_componentes(conta_dre_modelo_id);
CREATE INDEX idx_contas_dre_componentes_ref ON contas_dre_componentes(referencia_tipo, referencia_id);
CREATE INDEX idx_contas_dre_componentes_ordem ON contas_dre_componentes(ordem);