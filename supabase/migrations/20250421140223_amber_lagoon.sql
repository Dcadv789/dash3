/*
  # Sistema de Dados Brutos

  1. Nova Tabela
    - dados_brutos
      - Armazena valores por empresa, categoria e período
      - Validações de integridade referencial
      - Índices para performance

  2. Segurança
    - RLS habilitado
    - Políticas para usuários autenticados
*/

-- Criar tabela de dados brutos
CREATE TABLE dados_brutos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id text REFERENCES companies(id) ON DELETE CASCADE,
  ano integer NOT NULL CHECK (ano >= 2000 AND ano <= 2100),
  mes text NOT NULL CHECK (mes IN (
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  )),
  categoria_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  valor numeric(15,2) NOT NULL CHECK (valor >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Garantir que não haja duplicatas
  UNIQUE(empresa_id, ano, mes, categoria_id)
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_dados_brutos_updated_at
  BEFORE UPDATE ON dados_brutos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS
ALTER TABLE dados_brutos ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Usuários autenticados podem visualizar dados brutos"
  ON dados_brutos
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem gerenciar dados brutos"
  ON dados_brutos
  FOR ALL
  TO authenticated
  USING (true);

-- Índices
CREATE INDEX idx_dados_brutos_empresa ON dados_brutos(empresa_id);
CREATE INDEX idx_dados_brutos_categoria ON dados_brutos(categoria_id);
CREATE INDEX idx_dados_brutos_periodo ON dados_brutos(ano, mes);