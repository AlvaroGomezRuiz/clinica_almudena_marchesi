-- 0065 — Perfil público mínimo del terapeuta (avatar) para el chat del portal.
-- Los pacientes no tienen SELECT en profiles de admin; RPC STABLE + security definer.
-- Nota: era 0062 en desarrollo pero chocaba con otra migración 0062 (`cuadricula_reserva_slots`).
-- Una sola versión numérica por migración en Supabase.

create or replace function public.terapeuta_public_profile()
returns table (
  avatar_url   text,
  display_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.avatar_url::text, p.display_name::text
    from public.profiles p
   where p.role = 'admin'
   order by p.created_at asc
   limit 1;
$$;

revoke all on function public.terapeuta_public_profile() from public;
grant execute on function public.terapeuta_public_profile() to authenticated;

comment on function public.terapeuta_public_profile() is
  'Paciente autenticado: avatar y nombre del terapeuta (primer admin por antigüedad).';
