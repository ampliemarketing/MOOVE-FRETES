-- Adiciona coluna related_id na tabela notifications para navegação ao tocar na notificação
alter table public.notifications
  add column if not exists related_id uuid;

-- Habilita a extensão pg_net para chamadas HTTP dentro do banco
create extension if not exists pg_net with schema extensions;

-- Função que chama a Edge Function via HTTP após insert em notifications
create or replace function public.trigger_push_notification()
returns trigger
language plpgsql
security definer
as $$
begin
  perform extensions.http_post(
    url     := 'https://hjdykjdhxepgfnkurvgr.supabase.co/functions/v1/send-push-notification',
    body    := json_build_object('record', row_to_json(new))::text,
    headers := json_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqZHlramRoeGVwZ2Zua3VydmdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNTI5NzYsImV4cCI6MjA3OTYyODk3Nn0.IpkS-Gi6cwMQxDYt6qI7_djxEBnqZ-bfMvHFL-L7GYU'
    )
  );
  return new;
end;
$$;

-- Trigger: dispara após cada insert na tabela notifications
drop trigger if exists on_notification_insert on public.notifications;
create trigger on_notification_insert
  after insert on public.notifications
  for each row
  execute function public.trigger_push_notification();
