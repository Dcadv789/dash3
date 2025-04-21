/*
  # Sistema de Indicadores Financeiros

  1. Nova Tabela
    - `indicators`
      - id (uuid, chave primária)
      - code (código único do indicador)
      - name (nome do indicador)
      - type (tipo: manual ou calculado)
      - calculation_type (tipo de cálculo: categoria ou indicador)
      - operation (operação matemática: soma, subtração, multiplicação, divisão)
      - source_ids (array de IDs das categorias ou indicadores usados no cálculo)
      - company_id (referência à empresa)
      - is_active (status do indicador)
      - created_at (data de criação)
      - updated_at (data de atualização)

  2. Segurança
    - RLS habilitado
    - Políticas de acesso baseadas em autenticação
*/

-- Criar enums para os tipos
CREATE TYPE indicator_type AS ENUM ('manual', 'calculated');
CREATE TYPE calculation_type AS ENUM ('category', 'indicator');
CREATE TYPE math_operation AS ENUM ('sum', 'subtract', 'multiply', 'divide');

-- Criar tabela de indicadores
CREATE TABLE indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  type indicator_type NOT NULL,
  calculation_type calculation_type,
  operation math_operation,
  source_ids uuid[] DEFAULT '{}',
  company_id text REFERENCES companies(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Validações
  CONSTRAINT valid_calculation CHECK (
    (type = 'manual' AND calculation_type IS NULL AND operation IS NULL AND source_ids = '{}') OR
    (type = 'calculated' AND calculation_type IS NOT NULL AND operation IS NOT NULL AND array_length(source_ids, 1) > 0)
  )
);

-- Função para gerar código único do indicador
CREATE OR REPLACE FUNCTION generate_indicator_code()
RETURNS text AS $$
DECLARE
  next_number integer;
  next_code text;
BEGIN
  -- Encontra o próximo número disponível
  SELECT COALESCE(MAX(NULLIF(regexp_replace(code, '[^0-9]', '', 'g'), '')::integer), 0) + 1
  INTO next_number
  FROM indicators;
  
  -- Gera o código com prefixo I
  next_code := 'I' || LPAD(next_number::text, 4, '0');
  
  RETURN next_code;
END;
$$ LANGUAGE plpgsql;

-- Trigger para gerar código automaticamente
CREATE OR REPLACE FUNCTION set_indicator_code()
RETURNS trigger AS $$
BEGIN
  IF NEW.code IS NULL THEN
    NEW.code := generate_indicator_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_indicator_code
  BEFORE INSERT ON indicators
  FOR EACH ROW
  EXECUTE FUNCTION set_indicator_code();

-- Trigger para atualizar updated_at
CREATE TRIGGER update_indicators_updated_at
  BEFORE UPDATE ON indicators
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS
ALTER TABLE indicators ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Usuários autenticados podem visualizar indicadores"
  ON indicators
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem gerenciar indicadores"
  ON indicators
  FOR ALL
  TO authenticated
  USING (true);

-- Índices
CREATE INDEX idx_indicators_company_id ON indicators(company_id);
CREATE INDEX idx_indicators_type ON indicators(type);
CREATE INDEX idx_indicators_calculation_type ON indicators(calculation_type);