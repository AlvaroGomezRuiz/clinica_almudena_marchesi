-- ============================================================================
-- 0087_pre_bono_pendiente_pago.sql
-- ----------------------------------------------------------------------------
-- Modifica bono_asignar_manual: si método ≠ 'regalo', crea bono como
-- pendiente_pago (activo=false). El paciente debe pagar para activarlo.
--
-- Trigger trg_activar_pre_bono: cuando se inserta un pago completado con
-- bono_id apuntando a un bono pendiente_pago, lo activa automáticamente.
-- ============================================================================

create or replace function public.bono_asignar_manual(
  p_paciente_id            uuid,
  p_servicio_id            uuid,
  p_sesiones               int,
  p_metodo                 text,
  p_importe_centimos       int,
  p_validez_dias           int default 180,
  p_notas                  text default null,
  p_excluir_facturacion    boolean default false
)
returns table (
  bono_id uuid,
  pago_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin_id       uuid := auth.uid();
  v_is_admin       boolean;
  v_paciente_ok    boolean;
  v_servicio_ok    boolean;
  v_bono_id        uuid;
  v_pago_id        uuid;
  v_fecha_exp      date;
  v_metadata       jsonb;
  v_es_regalo      boolean;
  v_bono_estado    public.bono_estado;
  v_bono_activo    boolean;
begin
  if v_admin_id is null then
    raise exception 'bono_asignar_manual: no autenticado' using errcode = '42501';
  end if;

  select exists (
    select 1 from public.profiles p
     where p.id = v_admin_id and p.role = 'admin'
  ) into v_is_admin;

  if not v_is_admin then
    raise exception 'bono_asignar_manual: requiere rol admin' using errcode = '42501';
  end if;

  if p_metodo not in ('tarjeta', 'bizum', 'transferencia', 'regalo', 'efectivo', 'klarna') then
    raise exception 'bono_asignar_manual: metodo "%" inválido', p_metodo
      using errcode = '22023';
  end if;

  if p_sesiones is null or p_sesiones < 1 or p_sesiones > 100 then
    raise exception 'bono_asignar_manual: sesiones debe estar entre 1 y 100'
      using errcode = '22023';
  end if;

  if p_importe_centimos is null or p_importe_centimos < 0 then
    raise exception 'bono_asignar_manual: importe_centimos no puede ser negativo'
      using errcode = '22023';
  end if;

  select exists (select 1 from public.pacientes where id = p_paciente_id and activo = true)
    into v_paciente_ok;
  if not v_paciente_ok then
    raise exception 'bono_asignar_manual: paciente no existe o inactivo'
      using errcode = 'P0002';
  end if;

  select exists (select 1 from public.servicios where id = p_servicio_id and activo = true)
    into v_servicio_ok;
  if not v_servicio_ok then
    raise exception 'bono_asignar_manual: servicio no existe o inactivo'
      using errcode = 'P0002';
  end if;

  v_fecha_exp := case
    when p_validez_dias is not null and p_validez_dias > 0
      then (current_date + p_validez_dias)
    else null
  end;

  -- Si es regalo o efectivo → activo inmediatamente. Si no → pendiente_pago.
  v_es_regalo := (p_metodo in ('regalo', 'efectivo'));
  v_bono_estado := case when v_es_regalo then 'activo'::public.bono_estado else 'pendiente_pago'::public.bono_estado end;
  v_bono_activo := v_es_regalo;

  insert into public.bonos_pacientes (
    paciente_id, servicio_id, sesiones_totales, sesiones_consumidas,
    estado, fecha_compra, fecha_expiracion, activo
  ) values (
    p_paciente_id, p_servicio_id, p_sesiones, 0,
    v_bono_estado, now(), v_fecha_exp, v_bono_activo
  )
  returning id into v_bono_id;

  v_metadata := jsonb_build_object(
    'origen',           'manual',
    'creado_por',       v_admin_id,
    'notas',            coalesce(p_notas, ''),
    'sesiones',         p_sesiones,
    'validez_dias',     p_validez_dias,
    'pre_bono',         not v_es_regalo
  );

  -- Solo crear pago si es regalo/efectivo (ya pagado). Si no, no creamos pago
  -- hasta que el paciente lo complete vía Stripe.
  if v_es_regalo then
    insert into public.pagos (
      paciente_id, bono_id,
      importe_centimos, moneda, estado,
      metodo, metadata,
      fecha_pago, activo,
      excluir_de_facturacion
    ) values (
      p_paciente_id, v_bono_id,
      greatest(p_importe_centimos, 1), 'EUR', 'completado',
      p_metodo, v_metadata,
      now(), true,
      p_excluir_facturacion or p_importe_centimos = 0 or p_metodo = 'regalo'
    )
    returning id into v_pago_id;
  end if;

  perform public.append_auditoria(
    v_admin_id,
    'bono_asignar_manual',
    'bonos_pacientes',
    v_bono_id::text,
    jsonb_build_object(
      'paciente_id',      p_paciente_id,
      'servicio_id',      p_servicio_id,
      'sesiones',         p_sesiones,
      'metodo',           p_metodo,
      'importe_centimos', p_importe_centimos,
      'pre_bono',         not v_es_regalo,
      'excluir_facturacion', p_excluir_facturacion or p_importe_centimos = 0 or p_metodo = 'regalo',
      'pago_id',          v_pago_id,
      'notas',            coalesce(p_notas, '')
    )
  );

  return query select v_bono_id, v_pago_id;
end
$$;

comment on function public.bono_asignar_manual(uuid, uuid, int, text, int, int, text, boolean) is
  'Bono manual: regalo/efectivo → activo inmediato. Tarjeta/bizum/transfer/klarna → pendiente_pago hasta que paciente complete pago. Max 100 sesiones.';

-- Trigger para activar pre-bono cuando llega pago de Stripe
create or replace function public.activar_pre_bono_tras_pago()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estado = 'completado' and new.bono_id is not null then
    update public.bonos_pacientes
       set estado = 'activo'::public.bono_estado,
           activo = true
     where id = new.bono_id
       and estado = 'pendiente_pago';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_activar_pre_bono on public.pagos;

create trigger trg_activar_pre_bono
  after insert on public.pagos
  for each row
  when (new.estado = 'completado' and new.bono_id is not null)
  execute function public.activar_pre_bono_tras_pago();

comment on function public.activar_pre_bono_tras_pago() is
  'Trigger: cuando un pago completado referencia un bono pendiente_pago, lo activa.';
