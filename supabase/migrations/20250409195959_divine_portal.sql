/*
  # Sistema de Categorias Financeiras

  1. Novas Tabelas
    - `category_groups` (grupos de categorias)
      - id (uuid, chave primária)
      - name (nome do grupo)
      - type (tipo: receita ou despesa)
      - created_at (data de criação)
      - updated_at (data de atualização)

    - `categories` (categorias)
      - id (uuid, chave primária)
      - code (código único da categoria)
      - name (nome da categoria)
      - type (tipo: receita ou despesa)
      - group_id (referência ao grupo, opcional)
      - value (valor numérico)
      - created_at (data de criação)
      - updated_at (data de atualização)

    - `company_categories` (relação muitos-para-muitos entre empresas e categorias)
      - id (uuid, chave primária)
      - company_id (referência à empresa)
      - category_id (referência à categoria)
      - is_active (status da categoria para esta empresa)
      - created_at (data de criação)
      - updated_at (data de atualização)

  2. Segurança
    - RLS habilitado em todas as tabelas
    - Políticas de acesso baseadas em autenticação
*/

-- Criar enum para tipos de categoria
CREATE TYPE category_type AS ENUM ('revenue', 'expense');

-- Tabela de grupos de categorias
CREATE TABLE category_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type category_type NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de categorias
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  type category_type NOT NULL,
  group_id uuid REFERENCES category_groups(id) ON DELETE SET NULL,
  value numeric(15,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de relação entre empresas e categorias
CREATE TABLE company_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text REFERENCES companies(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, category_id)
);

-- Função para gerar código único da categoria
CREATE OR REPLACE FUNCTION generate_category_code(category_type category_type)
RETURNS text AS $$
DECLARE
  prefix text;
  next_number integer;
  next_code text;
BEGIN
  -- Define o prefixo baseado no tipo
  prefix := CASE 
    WHEN category_type = 'revenue' THEN 'R'
    ELSE 'D'
  END;
  
  -- Encontra o próximo número disponível
  SELECT COALESCE(MAX(NULLIF(regexp_replace(code, '[^0-9]', '', 'g'), '')::integer), 0) + 1
  INTO next_number
  FROM categories
  WHERE code LIKE prefix || '%';
  
  -- Gera o código
  next_code := prefix || LPAD(next_number::text, 4, '0');
  
  RETURN next_code;
END;
$$ LANGUAGE plpgsql;

-- Trigger para gerar código automaticamente
CREATE OR REPLACE FUNCTION set_category_code()
RETURNS trigger AS $$
BEGIN
  IF NEW.code IS NULL THEN
    NEW.code := generate_category_code(NEW.type);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_category_code
  BEFORE INSERT ON categories
  FOR EACH ROW
  EXECUTE FUNCTION set_category_code();

-- Função para atualizar timestamp de atualização
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at
CREATE TRIGGER update_category_groups_updated_at
  BEFORE UPDATE ON category_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_categories_updated_at
  BEFORE UPDATE ON company_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS
ALTER TABLE category_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_categories ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança para grupos de categorias
CREATE POLICY "Usuários autenticados podem visualizar grupos"
  ON category_groups
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem gerenciar grupos"
  ON category_groups
  FOR ALL
  TO authenticated
  USING (true);

-- Políticas de segurança para categorias
CREATE POLICY "Usuários autenticados podem visualizar categorias"
  ON categories
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem gerenciar categorias"
  ON categories
  FOR ALL
  TO authenticated
  USING (true);

-- Políticas de segurança para relação empresa-categoria
CREATE POLICY "Usuários autenticados podem visualizar categorias da empresa"
  ON company_categories
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem gerenciar categorias da empresa"
  ON company_categories
  FOR ALL
  TO authenticated
  USING (true);

-- Índices para melhorar performance
CREATE INDEX idx_categories_type ON categories(type);
CREATE INDEX idx_categories_group_id ON categories(group_id);
CREATE INDEX idx_company_categories_company_id ON company_categories(company_id);
CREATE INDEX idx_company_categories_category_id ON company_categories(category_id);