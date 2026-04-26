-- Realtime en adjuntos de chat: la UI puede fusionar URLs firmadas al insertar la fila
-- (el INSERT en public.mensajes puede llegar antes que mensajes_adjuntos).

do $$
begin
  if not exists (
    select 1
      from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'mensajes_adjuntos'
  ) then
    alter publication supabase_realtime add table public.mensajes_adjuntos;
  end if;
end $$;

alter table public.mensajes_adjuntos replica identity full;
