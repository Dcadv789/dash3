/*
  # Criar tabela de empresas

  1. Nova Tabela
    - `companies`
      - `id` (uuid, chave primária)
      - `name` (texto, nome completo da empresa)
      - `trading_name` (texto, nome fantasia)
      - `cnpj` (texto, único)
      - `is_active` (booleano)
      - `created_at` (timestamp com timezone)
      - `updated_at` (timestamp com timezone)

  2. Segurança
    - Habilitar RLS na tabela
    - Adicionar políticas para usuários autenticados
*/

CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  trading_name text NOT NULL,
  cnpj text UNIQUE NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

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