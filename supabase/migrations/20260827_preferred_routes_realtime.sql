-- Habilita Supabase Realtime (postgres_changes) para a tabela preferred_routes.
--
-- O cliente já assina INSERT/UPDATE/DELETE em preferred_routes
-- (subscribeToRoutesRealtime em src/utils/supabase-sync.ts), mas a tabela
-- nunca foi adicionada à publicação `supabase_realtime`, então nenhum evento
-- chegava e a lista de rotas de interesse dos motoristas não atualizava ao
-- vivo para os demais usuários (transportadoras / agenciadores).
--
-- replica identity full: payloads de UPDATE/DELETE trazem a linha antiga
-- completa (o handler de DELETE usa payload.old.id).
--
-- Seguro rodar várias vezes.

alter table public.preferred_routes replica identity full;

do $$
begin
  -- publicação pode não existir em projeto novo
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
    raise notice 'Publicação supabase_realtime criada.';
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'preferred_routes'
  ) then
    execute 'alter publication supabase_realtime add table public.preferred_routes';
    raise notice 'preferred_routes adicionada à publicação supabase_realtime.';
  else
    raise notice 'preferred_routes já estava na publicação supabase_realtime.';
  end if;
end $$;
