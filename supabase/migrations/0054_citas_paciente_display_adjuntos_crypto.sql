-- 0054 — Vista citas: nombre paciente para agenda admin.
--         Adjuntos chat: columna reservada para cifrado en reposo (audio/archivo).
-- ---------------------------------------------------------------------------

-- 1) Vista v_citas_expandidas: display_name del perfil vinculado al paciente
--    NOTA: con CREATE OR REPLACE VIEW las columnas *nuevas* solo pueden ir al
--    final; si se insertan en medio, Postgres 42P16 intenta “renombrar” columnas.
create or replace view public.v_citas_expandidas as
  select
    c.id,
    c.paciente_id,
    c.servicio_id,
    c.inicio,
    c.fin,
    c.estado,
    s.nombre    as servicio_nombre,
    s.duracion_minutos,
    s.precio_centimos,
    p.user_id   as paciente_user_id,
    c.created_at,
    c.updated_at,
    pr.display_name as paciente_display_name
  from public.citas c
  join public.servicios s on s.id = c.servicio_id
  join public.pacientes p on p.id = c.paciente_id
  left join public.profiles pr on pr.id = p.user_id
  where c.activo = true;

alter view public.v_citas_expandidas set (security_invoker = true);

-- 2) Adjuntos: esquema de cifrado en reposo (null = binario actual en bucket privado + TLS)
alter table public.mensajes_adjuntos
  add column if not exists encryption_scheme text null;

comment on column public.mensajes_adjuntos.encryption_scheme is
  'Valores previstos: null/none (Storage tal cual), app_aes256gcm (cifrado cliente/servidor antes de subir — p. ej. voz sensible).';
