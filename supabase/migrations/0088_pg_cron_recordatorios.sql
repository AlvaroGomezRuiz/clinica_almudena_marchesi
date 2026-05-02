-- ============================================================================
-- 0088_pg_cron_recordatorios.sql
-- ----------------------------------------------------------------------------
-- Registra 3 trabajos pg_cron que invocan Edge Functions via pg_net.
-- Horarios en UTC:
--   08:00 UTC → cron-recordatorios-24h (recordatorios de citas próximas)
--   09:00 UTC → cron-recordatorio-pago-cita (citas sin pagar)
--   09:30 UTC → cron-recordatorio-pre-bono (bonos sin activar)
--
-- IMPORTANTE: Antes de aplicar, habilitar en Supabase Dashboard:
--   Database → Extensions → pg_cron
--   Database → Extensions → pg_net
--
-- Si pg_cron o pg_net no están habilitadas, este bloque lanza un error
-- controlado (raise notice) y no falla la migración completa.
-- ============================================================================

do $outer$
declare
  v_base       text := 'https://koxsikkobjlycqqfstye.supabase.co/functions/v1';
  v_key        text;
  v_cmd        text;
  v_extensions_ok boolean := true;
begin
  -- Verificar que pg_cron y pg_net están disponibles
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise notice 'SKIP: pg_cron no está habilitada. Habilítala en el Dashboard y re-aplica esta migración.';
    v_extensions_ok := false;
  end if;

  if not exists (select 1 from pg_extension where extname = 'pg_net') then
    raise notice 'SKIP: pg_net no está habilitada. Habilítala en el Dashboard y re-aplica esta migración.';
    v_extensions_ok := false;
  end if;

  if not v_extensions_ok then
    return;
  end if;

  -- Service role key (configurar en: Dashboard → Database → Configuration → Settings
  --   como app.service_role_key = 'eyJhb...')
  v_key := coalesce(
    nullif(current_setting('app.service_role_key', true), ''),
    'PENDIENTE_CONFIGURAR_SERVICE_ROLE_KEY'
  );

  -- ─── Desregistrar crons existentes (idempotente) ───────────────────────
  begin
    perform cron.unschedule('cron-recordatorios-24h');
  exception when others then null;
  end;

  begin
    perform cron.unschedule('cron-recordatorio-pago-cita');
  exception when others then null;
  end;

  begin
    perform cron.unschedule('cron-recordatorio-pre-bono');
  exception when others then null;
  end;

  -- ─── 1. Recordatorios 24h/48h de citas confirmadas — 08:00 UTC ─────────
  v_cmd := 'select net.http_post(' ||
           'url     := ' || quote_literal(v_base || '/cron-recordatorios-24h') || ',' ||
           'headers := jsonb_build_object(' ||
           '  ''Content-Type'',  ''application/json'',' ||
           '  ''Authorization'', ''Bearer ' || v_key || '''' ||
           '),' ||
           'body    := ''{}''::jsonb' ||
           ')';

  perform cron.schedule('cron-recordatorios-24h', '0 8 * * *', v_cmd);

  -- ─── 2. Cancelación / recordatorio citas pendiente_pago — 09:00 UTC ────
  v_cmd := 'select net.http_post(' ||
           'url     := ' || quote_literal(v_base || '/cron-recordatorio-pago-cita') || ',' ||
           'headers := jsonb_build_object(' ||
           '  ''Content-Type'',  ''application/json'',' ||
           '  ''Authorization'', ''Bearer ' || v_key || '''' ||
           '),' ||
           'body    := ''{}''::jsonb' ||
           ')';

  perform cron.schedule('cron-recordatorio-pago-cita', '0 9 * * *', v_cmd);

  -- ─── 3. Recordatorio pre-bonos sin activar — 09:30 UTC ─────────────────
  v_cmd := 'select net.http_post(' ||
           'url     := ' || quote_literal(v_base || '/cron-recordatorio-pre-bono') || ',' ||
           'headers := jsonb_build_object(' ||
           '  ''Content-Type'',  ''application/json'',' ||
           '  ''Authorization'', ''Bearer ' || v_key || '''' ||
           '),' ||
           'body    := ''{}''::jsonb' ||
           ')';

  perform cron.schedule('cron-recordatorio-pre-bono', '30 9 * * *', v_cmd);

  raise notice 'pg_cron: 3 trabajos registrados correctamente.';
end
$outer$;
