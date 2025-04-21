/*
  # Sistema de Contas Secundárias do DRE

  1. Nova Tabela
    - dre_contas_secundarias
      - Informações básicas da conta
      - Vínculo com conta principal
      - Ordem de exibição
      - Empresas vinculadas

  2. Segurança
    - RLS habilitado
    - Políticas para usuários autenticados
*/

-- Criar tabela de contas secundárias
CREATE TABLE dre_contas_secundarias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  dre_conta_principal_id uuid REFERENCES contas_dre_modelo(id) ON DELETE CASCADE,
  ordem integer DEFAULT 0,
  empresa_ids uuid[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Adicionar coluna na tabela de componentes para indicar o nível
ALTER TABLE contas_dre_componentes
ADD COLUMN dre_conta_secundaria_id uuid REFERENCES dre_contas_secundarias(id) ON DELETE CASCADE;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_dre_contas_secundarias_updated_at
  BEFORE UPDATE ON dre_contas_secundarias
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS
ALTER TABLE dre_contas_secundarias ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Usuários autenticados podem visualizar contas secundárias"
  ON dre_contas_secundarias
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem gerenciar contas secundárias"
  ON dre_contas_secundarias
  FOR ALL
  TO authenticated
  USING (true);

-- Índices
CREATE INDEX idx_dre_contas_secundarias_principal ON dre_contas_secundarias(dre_conta_principal_id);
CREATE INDEX idx_dre_contas_secundarias_ordem ON dre_contas_secundarias(ordem);
CREATE INDEX idx_dre_componentes_conta_secundaria ON contas_dre_componentes(dre_conta_secundaria_id);