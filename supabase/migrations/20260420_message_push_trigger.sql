-- 1. Adiciona colunas de push token na tabela drivers (se não existirem)
alter table public.drivers
  add column if not exists push_token text,
  add column if not exists push_token_updated_at timestamp with time zone;

-- 2. Adiciona coluna related_id na tabela notifications (se não existir)
alter table public.notifications
  add column if not exists related_id uuid;

-- 3. Habilita pg_net para chamadas HTTP dentro do banco
create extension if not exists pg_net with schema extensions;

-- 4. Função que dispara push notification após insert em messages
create or replace function public.trigger_message_push_notification()
returns trigger
language plpgsql
security definer
as $$
declare
  v_participant1 uuid;
  v_participant2 uuid;
  v_recipient_id uuid;
  v_sender_name  text;
  v_push_token   text;
begin
  -- Busca os participantes da conversa
  select participant1_id, participant2_id
    into v_participant1, v_participant2
    from public.conversations
   where id = new.conversation_id;

  if not found then
    return new;
  end if;

  -- O destinatário é o outro participante
  if v_participant1 = new.sender_id then
    v_recipient_id := v_participant2;
  else
    v_recipient_id := v_participant1;
  end if;

  -- Busca o push token do destinatário na tabela drivers
  select push_token into v_push_token
    from public.drivers
   where user_id = v_recipient_id;

  if v_push_token is null or v_push_token = '' then
    return new;
  end if;

  -- Busca o nome do remetente
  select coalesce(name, 'Usuário') into v_sender_name
    from public.profiles
   where id = new.sender_id;

  -- Chama a edge function via pg_net (schema net, não extensions)
  perform net.http_post(
    url     := 'https://hjdykjdhxepgfnkurvgr.supabase.co/functions/v1/send-push-notification',
    body    := jsonb_build_object(
      'record', jsonb_build_object(
        'id',         new.id,
        'user_id',    v_recipient_id,
        'title',      'Nova mensagem de ' || v_sender_name,
        'message',    left(coalesce(new.content, 'Enviou uma mensagem'), 100),
        'type',       'message',
        'related_id', new.conversation_id
      )
    ),
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqZHlramRoeGVwZ2Zua3VydmdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNTI5NzYsImV4cCI6MjA3OTYyODk3Nn0.IpkS-Gi6cwMQxDYt6qI7_djxEBnqZ-bfMvHFL-L7GYU'
    )
  );

  return new;
end;
$$;

-- 5. Remove triggers antigos para evitar conflito
drop trigger if exists on_message_insert_push    on public.messages;
drop trigger if exists on_notification_insert     on public.notifications;

-- 6. Cria trigger na tabela messages (abordagem mais robusta)
create trigger on_message_insert_push
  after insert on public.messages
  for each row
  execute function public.trigger_message_push_notification();
