/*
  # Adicionar campo de cargo personalizado e ajustes no perfil

  1. Alterações
    - Adicionar coluna user_role para cargo personalizado
    - Remover coluna role da visualização do perfil
    - Garantir que dados existentes não sejam perdidos

  2. Segurança
    - Manter as políticas de RLS existentes
*/

-- Adicionar nova coluna para cargo personalizado
ALTER TABLE system_users
ADD COLUMN user_role text;

-- Criar bucket para avatares
INSERT INTO storage.buckets (id, name, public)
VALUES ('profiles', 'profiles', true);

-- Criar política para permitir upload de arquivos
CREATE POLICY "Usuários autenticados podem fazer upload de avatar"
ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'profiles' AND
  (storage.foldername(name))[1] = 'avatars'
);

-- Criar política para permitir visualização pública dos avatares
CREATE POLICY "Avatares são publicamente visíveis"
ON storage.objects FOR SELECT TO public USING (
  bucket_id = 'profiles' AND
  (storage.foldername(name))[1] = 'avatars'
);