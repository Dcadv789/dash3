/*
  # Criar tabela de empresas

  1. Nova Tabela
    - `companies`
      - `id` (texto, formato CP0000, chave primária)
      - `name` (texto, nome completo da empresa)
      - `trading_name` (texto, nome fantasia)
      - `cnpj` (texto, único)
      - `is_active` (booleano)
      - `created_at` (timestamp com timezone)
      - `updated_at` (timestamp com timezone)
      - `contract_start_date` (data)

  2. Segurança
    - Habilitar RLS na tabela
    - Adicionar políticas para usuários autenticados
*/

CREATE TABLE companies (
  id text PRIMARY KEY CHECK (id ~ '^CP[0-9]{4}$'),
  name text NOT NULL,
  trading_name text NOT NULL,
  cnpj text UNIQUE NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  contract_start_date date
);

-- Função para gerar o próximo ID de empresa
CREATE OR REPLACE FUNCTION generate_company_id()
RETURNS text AS $$
DECLARE
  next_id text;
  counter integer := 1;
BEGIN
  LOOP
    next_id := 'CP' || LPAD(counter::text, 4, '0');
    IF NOT EXISTS (SELECT 1 FROM companies WHERE id = next_id) THEN
      RETURN next_id;
    END IF;
    counter := counter + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger para gerar ID automaticamente
CREATE OR REPLACE FUNCTION set_company_id()
RETURNS trigger AS $$
BEGIN
  IF NEW.id IS NULL THEN
    NEW.id := generate_company_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_company_id
  BEFORE INSERT ON companies
  FOR EACH ROW
  EXECUTE FUNCTION set_company_id();

-- Habilitar RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Usuários autenticados podem visualizar empresas"
  ON companies
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem inserir empresas"
  ON companies
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar empresas"
  ON companies
  FOR UPDATE
  TO authenticated
  USING (true);