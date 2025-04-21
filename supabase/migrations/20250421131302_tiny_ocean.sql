/*
  # Reestruturar sistema de DRE

  1. Nova Tabela: dre_templates
    - Modelos base de DRE que podem ser copiados
    - Configurações padrão por tipo de empresa

  2. Nova Tabela: dre_sections
    - Seções principais do DRE (ex: Receitas, Custos, Despesas)
    - Ordem de exibição configurável
    - Agrupamento visual

  3. Nova Tabela: dre_lines
    - Linhas individuais do DRE
    - Fórmulas de cálculo
    - Ordem de exibição
    - Hierarquia flexível
*/

-- Criar tabela de templates
CREATE TABLE dre_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela de seções
CREATE TABLE dre_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text REFERENCES companies(id) ON DELETE CASCADE,
  template_id uuid REFERENCES dre_templates(id),
  name text NOT NULL,
  code text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, code)
);

-- Tipos de linha do DRE
CREATE TYPE dre_line_type AS ENUM (
  'header',      -- Cabeçalho/título de seção
  'category',    -- Soma de categorias
  'calculation', -- Cálculo baseado em outras linhas
  'indicator',   -- Valor de indicador
  'subtotal',    -- Subtotal de um grupo
  'total'        -- Total geral
);

-- Criar tabela de linhas
CREATE TABLE dre_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid REFERENCES dre_sections(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES dre_lines(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  type dre_line_type NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  
  -- Campos específicos por tipo
  category_ids uuid[] DEFAULT NULL,      -- Para type = category
  indicator_id uuid DEFAULT NULL,        -- Para type = indicator
  formula text DEFAULT NULL,             -- Para type = calculation
  
  -- Configurações de exibição
  indent_level integer DEFAULT 0,
  show_percentage boolean DEFAULT false,
  highlight_color text DEFAULT NULL,
  is_bold boolean DEFAULT false,
  
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Validações
  CONSTRAINT valid_category_line CHECK (
    (type = 'category' AND category_ids IS NOT NULL) OR
    (type != 'category')
  ),
  CONSTRAINT valid_indicator_line CHECK (
    (type = 'indicator' AND indicator_id IS NOT NULL) OR
    (type != 'indicator')
  ),
  CONSTRAINT valid_calculation_line CHECK (
    (type = 'calculation' AND formula IS NOT NULL) OR
    (type != 'calculation')
  )
);

-- Criar tabela de configurações visuais
CREATE TABLE dre_display_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text REFERENCES companies(id) ON DELETE CASCADE,
  show_codes boolean DEFAULT true,
  show_zero_lines boolean DEFAULT true,
  percentage_precision integer DEFAULT 2,
  value_precision integer DEFAULT 2,
  negative_color text DEFAULT '#FF4444',
  positive_color text DEFAULT '#44FF44',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id)
);

-- Habilitar RLS
ALTER TABLE dre_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE dre_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE dre_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE dre_display_settings ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Usuários autenticados podem visualizar templates"
  ON dre_templates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem visualizar seções"
  ON dre_sections FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem visualizar linhas"
  ON dre_lines FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem visualizar configurações"
  ON dre_display_settings FOR SELECT TO authenticated USING (true);

-- Índices
CREATE INDEX idx_dre_sections_company_id ON dre_sections(company_id);
CREATE INDEX idx_dre_sections_template_id ON dre_sections(template_id);
CREATE INDEX idx_dre_lines_section_id ON dre_lines(section_id);
CREATE INDEX idx_dre_lines_parent_id ON dre_lines(parent_id);
CREATE INDEX idx_dre_lines_type ON dre_lines(type);
CREATE INDEX idx_dre_display_settings_company_id ON dre_display_settings(company_id);