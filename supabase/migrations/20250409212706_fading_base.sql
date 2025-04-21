/*
  # Atualizar sistema de indicadores

  1. Nova Tabela
    - `company_indicators` (relação entre empresas e indicadores)
      - id (uuid, chave primária)
      - company_id (referência à empresa)
      - indicator_id (referência ao indicador)
      - is_active (status do indicador para esta empresa)
      - created_at (data de criação)
      - updated_at (data de atualização)

  2. Segurança
    - RLS habilitado
    - Políticas de acesso baseadas em autenticação
*/

-- Criar tabela de relação entre empresas e indicadores
CREATE TABLE company_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text REFERENCES companies(id) ON DELETE CASCADE,
  indicator_id uuid REFERENCES indicators(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, indicator_id)
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_company_indicators_updated_at
  BEFORE UPDATE ON company_indicators
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS
ALTER TABLE company_indicators ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Usuários autenticados podem visualizar indicadores da empresa"
  ON company_indicators
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem gerenciar indicadores da empresa"
  ON company_indicators
  FOR ALL
  TO authenticated
  USING (true);

-- Índices
CREATE INDEX idx_company_indicators_company_id ON company_indicators(company_id);
CREATE INDEX idx_company_indicators_indicator_id ON company_indicators(indicator_id);