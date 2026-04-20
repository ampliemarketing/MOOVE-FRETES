-- Criar bucket público para anexos do chat
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments',
  true,
  52428800, -- 50MB
  NULL      -- Todos os tipos de arquivo
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "chat_attachments_select" ON storage.objects;
DROP POLICY IF EXISTS "chat_attachments_insert" ON storage.objects;
DROP POLICY IF EXISTS "chat_attachments_delete" ON storage.objects;

-- Qualquer usuário autenticado pode fazer upload
CREATE POLICY "chat_attachments_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-attachments');

-- Leitura pública (bucket é público mesmo, mas garante a policy)
CREATE POLICY "chat_attachments_select"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-attachments');

-- Usuário pode deletar seus próprios arquivos
CREATE POLICY "chat_attachments_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'chat-attachments' AND owner = auth.uid());
