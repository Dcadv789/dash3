/*
  # Criar usuário master inicial

  1. Inserção
    - Criar usuário master inicial
    - Vincular ao auth.users
    - Configurar permissões padrão

  2. Segurança
    - Garantir que o usuário tenha todas as permissões necessárias
*/

-- Inserir usuário master (apenas se não existir)
INSERT INTO system_users (
  name,
  email,
  role,
  company_id,
  is_active
)
SELECT
  'Daniel Charles',
  'daniel.charles@dcadvisors.com.br',
  'master',
  (SELECT id FROM companies LIMIT 1),
  true
WHERE NOT EXISTS (
  SELECT 1 FROM system_users 
  WHERE email = 'daniel.charles@dcadvisors.com.br'
);

-- As permissões serão criadas automaticamente pelo trigger create_default_permissions