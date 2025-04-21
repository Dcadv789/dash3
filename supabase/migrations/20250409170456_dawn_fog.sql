/*
  # Sistema de Usuários e Permissões

  1. Nova Tabela: system_users
    - Informações básicas do usuário
    - Vinculação com empresa
    - Controle de nível de acesso
    - Dados de contato e perfil

  2. Nova Tabela: user_permissions
    - Permissões personalizadas por página
    - Controle granular de acesso e edição
    - Vinculação com usuário

  3. Segurança
    - RLS habilitado em todas as tabelas
    - Políticas de acesso baseadas em autenticação
    - Índices para otimização
*/

-- Criar enum para roles
CREATE TYPE user_role AS ENUM ('master', 'consultor', 'cliente', 'colab');

-- Tabela principal de usuários
CREATE TABLE system_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  company_id text REFERENCES companies(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'colab',
  is_active boolean DEFAULT true,
  phone text,
  avatar_url text,
  preferences jsonb DEFAULT '{}'::jsonb,
  notification_settings jsonb DEFAULT '{}'::jsonb,
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de permissões
CREATE TABLE user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES system_users(id) ON DELETE CASCADE,
  page text NOT NULL,
  can_access boolean DEFAULT false,
  can_edit boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, page)
);

-- Função para atualizar o timestamp de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
CREATE TRIGGER update_system_users_updated_at
  BEFORE UPDATE ON system_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_permissions_updated_at
  BEFORE UPDATE ON user_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Índices
CREATE INDEX idx_system_users_company_id ON system_users(company_id);
CREATE INDEX idx_system_users_role ON system_users(role);
CREATE INDEX idx_system_users_email ON system_users(email);
CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX idx_user_permissions_page ON user_permissions(page);

-- Habilitar RLS
ALTER TABLE system_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança para system_users
CREATE POLICY "Usuários autenticados podem visualizar usuários"
  ON system_users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários master e consultor podem inserir usuários"
  ON system_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM system_users
      WHERE auth_user_id = auth.uid()
      AND role IN ('master', 'consultor')
    )
  );

CREATE POLICY "Usuários master e consultor podem atualizar usuários"
  ON system_users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_users
      WHERE auth_user_id = auth.uid()
      AND role IN ('master', 'consultor')
    )
  );

-- Políticas de segurança para user_permissions
CREATE POLICY "Usuários autenticados podem visualizar permissões"
  ON user_permissions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários master e consultor podem gerenciar permissões"
  ON user_permissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_users
      WHERE auth_user_id = auth.uid()
      AND role IN ('master', 'consultor')
    )
  );

-- Função para criar permissões padrão baseadas no role
CREATE OR REPLACE FUNCTION create_default_permissions()
RETURNS TRIGGER AS $$
DECLARE
  page_name text;
  pages text[] := ARRAY['Início', 'Dashboard', 'Vendas', 'Análise', 'Caixa', 'DRE', 'Usuários', 'Configurações'];
BEGIN
  FOREACH page_name IN ARRAY pages
  LOOP
    INSERT INTO user_permissions (user_id, page, can_access, can_edit)
    VALUES (
      NEW.id,
      page_name,
      CASE
        WHEN NEW.role = 'master' THEN true
        WHEN NEW.role = 'consultor' AND page_name != 'Configurações' THEN true
        WHEN NEW.role = 'cliente' AND page_name NOT IN ('Usuários', 'Configurações') THEN true
        WHEN NEW.role = 'colab' AND page_name NOT IN ('Usuários', 'Configurações', 'DRE') THEN true
        ELSE false
      END,
      CASE
        WHEN NEW.role = 'master' THEN true
        WHEN NEW.role = 'consultor' AND page_name != 'Configurações' THEN true
        ELSE false
      END
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para criar permissões padrão ao criar usuário
CREATE TRIGGER create_default_user_permissions
  AFTER INSERT ON system_users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_permissions();