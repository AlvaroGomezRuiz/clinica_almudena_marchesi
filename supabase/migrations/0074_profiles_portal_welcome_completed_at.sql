-- Onboarding portal paciente: una sola pantalla de bienvenida; persiste en profiles.

alter table public.profiles
  add column if not exists portal_welcome_completed_at timestamptz null;

comment on column public.profiles.portal_welcome_completed_at is
  'Paciente marcó la bienvenida del portal (una vez); desacople del gate de pago/bono/cita.';

-- Cuentas existentes: no forzar la nueva pantalla en el próximo login.
update public.profiles
set portal_welcome_completed_at = coalesce(portal_welcome_completed_at, created_at)
where portal_welcome_completed_at is null;
