/*
  # Adicionar colunas faltantes e tabela de sócios

  1. Alterações na tabela companies
    - Adicionar coluna email (texto)
    - Adicionar coluna phone (texto)

  2. Nova Tabela company_partners
    - id (texto, formato PP seguido de 4 números)
    - company_id (referência à tabela companies)
    - name (nome do sócio)
    - email (email do sócio)
    - cpf (CPF do sócio)
    - phone (telefone do sócio)
    - is_active (status do sócio)
    - created_at (data de criação)
    - updated_at (data de atualização)
*/

-- Adicionar colunas faltantes na tabela companies
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS phone text;

-- Criar tabela de sócios
CREATE TABLE company_partners (
  id text PRIMARY KEY CHECK (id ~ '^PP[0-9]{4}$'),
  company_id text REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  cpf text NOT NULL,
  phone text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Função para gerar o próximo ID de sócio
CREATE OR REPLACE FUNCTION generate_partner_id()
RETURNS text AS $$
DECLARE
  next_id text;
  counter integer := 1;
BEGIN
  LOOP
    next_id := 'PP' || LPAD(counter::text, 4, '0');
    IF NOT EXISTS (SELECT 1 FROM company_partners WHERE id = next_id) THEN
      RETURN next_id;
    END IF;
    counter := counter + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger para gerar ID automaticamente
CREATE OR REPLACE FUNCTION set_partner_id()
RETURNS trigger AS $$
BEGIN
  IF NEW.id IS NULL THEN
    NEW.id := generate_partner_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_partner_id
  BEFORE INSERT ON company_partners
  FOR EACH ROW
  EXECUTE FUNCTION set_partner_id();

-- Habilitar RLS na tabela de sócios
ALTER TABLE company_partners ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança para sócios
CREATE POLICY "Usuários autenticados podem visualizar sócios"
  ON company_partners
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem inserir sócios"
  ON company_partners
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar sócios"
  ON company_partners
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem deletar sócios"
  ON company_partners
  FOR DELETE
  TO authenticated
  USING (true);

-- Índices para melhorar performance
CREATE INDEX idx_company_partners_company_id ON company_partners(company_id);
CREATE INDEX idx_company_partners_cpf ON company_partners(cpf);
CREATE INDEX idx_company_partners_email ON company_partners(email);