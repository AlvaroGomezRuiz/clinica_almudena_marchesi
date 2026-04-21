-- =============================================================================
-- 0018 · Recursos públicos / biblioteca general
-- =============================================================================
-- Añade la columna `publico` para marcar recursos de biblioteca general
-- (visibles para cualquier paciente autenticado, no sólo los asignados).
--
-- Los legales (aviso LOPD, política RGPD) también pueden subirse con publico=true.
-- =============================================================================

begin;

alter table public.recursos
  add column if not exists publico boolean not null default false;

create index if not exists recursos_publico_idx
  on public.recursos(publico) where publico = true;

-- Extiende la policy de lectura: admin + asignación + recurso público
drop policy if exists recursos_paciente_read on public.recursos;
create policy recursos_paciente_read on public.recursos
  for select using (
    public.is_admin()
    or publico = true
    or exists (
      select 1 from public.recurso_asignaciones ra
      where ra.recurso_id = recursos.id
        and ra.paciente_id = public.current_paciente_id()
        and ra.activo = true
    )
  );

-- Storage: permite leer los binarios de recursos públicos sin necesidad de
-- asignación explícita.
drop policy if exists "recursos_paciente_read" on storage.objects;
create policy "recursos_paciente_read" on storage.objects
  for select using (
    bucket_id = 'recursos'
    and (
      exists (
        select 1
        from public.recurso_asignaciones ra
        join public.recursos r on r.id = ra.recurso_id
        where ra.paciente_id = public.current_paciente_id()
          and ra.activo = true
          and storage.objects.name like r.id::text || '/%'
      )
      or exists (
        select 1
        from public.recursos r
        where r.publico = true
          and storage.objects.name like r.id::text || '/%'
      )
    )
  );

commit;
