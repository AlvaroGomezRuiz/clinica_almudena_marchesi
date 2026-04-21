-- 0024_auto_encrypt_triggers
-- ====================================================================
-- Triggers BEFORE INSERT/UPDATE que cifran automáticamente las columnas
-- plaintext a _ciphertext en las 3 tablas MVP de ficha clínica.
--
-- Garantiza cifrado en reposo incluso si un cliente escribe vía INSERT
-- directo (p.ej. el paciente añadiendo notas desde /portal/citas, donde
-- app_encrypt está restringida a service_role).
--
-- Idempotentes: si ya hay ciphertext (porque se usó la RPC cifrada), no
-- se sobreescribe. Esto permite convivencia RPC + INSERT directo sin
-- doble-cifrado.
--
-- Nota: el trigger es SECURITY DEFINER indirectamente por ser owner del
-- relation. Llama a public.app_encrypt() que es security definer con
-- ejecución abierta al owner de la función (postgres).
-- ====================================================================

begin;

-- --------------------------------------------------------------------
-- paciente_diagnosticos: titulo + notas (descripcion no se cifra, es
-- el "título amplio" visible).
-- --------------------------------------------------------------------
create or replace function public.tg_diagnostico_auto_encrypt()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.titulo is not null and new.titulo_ciphertext is null then
    new.titulo_ciphertext := public.app_encrypt(new.titulo);
  end if;
  if new.descripcion is not null and new.notas_ciphertext is null then
    new.notas_ciphertext := public.app_encrypt(new.descripcion);
  end if;
  return new;
end;
$$;

drop trigger if exists diagnostico_auto_encrypt on public.paciente_diagnosticos;
create trigger diagnostico_auto_encrypt
  before insert or update on public.paciente_diagnosticos
  for each row execute function public.tg_diagnostico_auto_encrypt();

-- --------------------------------------------------------------------
-- paciente_medicacion: notas (nombre/dosis/frecuencia son tokens cortos
-- que no merecen cifrado, pero las notas sí).
-- --------------------------------------------------------------------
create or replace function public.tg_medicacion_auto_encrypt()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.notas is not null and new.notas_ciphertext is null then
    new.notas_ciphertext := public.app_encrypt(new.notas);
  end if;
  return new;
end;
$$;

drop trigger if exists medicacion_auto_encrypt on public.paciente_medicacion;
create trigger medicacion_auto_encrypt
  before insert or update on public.paciente_medicacion
  for each row execute function public.tg_medicacion_auto_encrypt();

-- --------------------------------------------------------------------
-- citas_notas_paciente: contenido
-- --------------------------------------------------------------------
create or replace function public.tg_nota_cita_auto_encrypt()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.contenido is not null and new.contenido_ciphertext is null then
    new.contenido_ciphertext := public.app_encrypt(new.contenido);
  end if;
  return new;
end;
$$;

drop trigger if exists nota_cita_auto_encrypt on public.citas_notas_paciente;
create trigger nota_cita_auto_encrypt
  before insert or update on public.citas_notas_paciente
  for each row execute function public.tg_nota_cita_auto_encrypt();

commit;
