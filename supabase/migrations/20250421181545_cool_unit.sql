/*
  # Sistema de Componentes do DRE por Empresa

  1. Nova Tabela
    - dre_empresa_componentes
      - Relacionamento entre empresas e componentes do DRE
      - Suporte a componentes diretos e de contas secundárias
      - Controle granular de seleção

  2. Segurança
    - RLS habilitado
    - Políticas para usuários autenticados
*/

-- Criar tabela de componentes por empresa
CREATE TABLE dre_empresa_componentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id text REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  dre_conta_principal_id uuid REFERENCES contas_dre_modelo(id) ON DELETE CASCADE,
  dre_conta_secundaria_id uuid REFERENCES dre_contas_secundarias(id) ON DELETE CASCADE,
  componente_id uuid NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Garantir que o componente esteja vinculado a uma conta principal ou secundária
  CONSTRAINT conta_principal_ou_secundaria CHECK (
    (dre_conta_principal_id IS NOT NULL AND dre_conta_secundaria_id IS NULL) OR
    (dre_conta_principal_id IS NULL AND dre_conta_secundaria_id IS NOT NULL)
  ),

  -- Garantir unicidade da combinação
  UNIQUE(empresa_id, dre_conta_principal_id, dre_conta_secundaria_id, componente_id)
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_dre_empresa_componentes_updated_at
  BEFORE UPDATE ON dre_empresa_componentes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS
ALTER TABLE dre_empresa_componentes ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Usuários autenticados podem visualizar componentes por empresa"
  ON dre_empresa_componentes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem gerenciar componentes por empresa"
  ON dre_empresa_componentes
  FOR ALL
  TO authenticated
  USING (true);

-- Índices
CREATE INDEX idx_dre_empresa_componentes_empresa ON dre_empresa_componentes(empresa_id);
CREATE INDEX idx_dre_empresa_componentes_conta_principal ON dre_empresa_componentes(dre_conta_principal_id);
CREATE INDEX idx_dre_empresa_componentes_conta_secundaria ON dre_empresa_componentes(dre_conta_secundaria_id);
CREATE INDEX idx_dre_empresa_componentes_componente ON dre_empresa_componentes(componente_id);