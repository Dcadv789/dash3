/*
  # Adicionar código único para empresas

  1. Alterações
    - Adicionar coluna `company_code` para armazenar o código único da empresa
    - Garantir que o código seja único através de uma constraint
    - Adicionar índice para melhorar performance de buscas por código

  2. Segurança
    - Manter as políticas de RLS existentes
*/

-- Adiciona a coluna company_code se ela não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' AND column_name = 'company_code'
  ) THEN
    ALTER TABLE companies ADD COLUMN company_code text;
  END IF;
END $$;

-- Adiciona constraint de unicidade se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'companies' AND column_name = 'company_code'
  ) THEN
    ALTER TABLE companies ADD CONSTRAINT companies_code_unique UNIQUE (company_code);
  END IF;
END $$;

-- Cria índice para melhorar performance de buscas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'companies' AND indexname = 'companies_code_idx'
  ) THEN
    CREATE INDEX companies_code_idx ON companies (company_code);
  END IF;
END $$;

-- Atualiza registros existentes que não têm código
UPDATE companies 
SET company_code = 'CP' || LPAD(FLOOR(RANDOM() * 9999)::text, 4, '0')
WHERE company_code IS NULL;