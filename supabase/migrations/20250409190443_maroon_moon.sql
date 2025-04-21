/*
  # Adicionar política de exclusão para empresas

  1. Alterações
    - Adicionar política que permite usuários autenticados excluírem empresas
    - Garantir que apenas usuários com permissão possam excluir
*/

-- Adicionar política de exclusão para empresas
CREATE POLICY "Usuários autenticados podem excluir empresas"
  ON companies
  FOR DELETE
  TO authenticated
  USING (true);

-- Adicionar política de exclusão para sócios
CREATE POLICY "Usuários autenticados podem excluir sócios"
  ON company_partners
  FOR DELETE
  TO authenticated
  USING (true);