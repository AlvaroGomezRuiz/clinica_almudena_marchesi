// Edge Function: cron-recordatorios-24h
// -----------------------------------------------------------------------------
// Invocada por pg_cron cada hora. Lee:
//   * public.citas_pendientes_recordatorio_48h() — ventana 47h–49h, tipo reminder_48h
//   * public.citas_pendientes_recordatorio_24h() — ventana 23h–25h, tipo reminder_24h
// y dispara un email por fila vía Resend (misma lógica de log/prefs).
//
// Seguridad: valida Bearer == CRON_SECRET (definido en app.settings.cron_secret
// del servidor Postgres, referenciado desde pg_cron). Esto evita que cualquiera
// con la anon key pueda disparar el cron.
// -----------------------------------------------------------------------------

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { resendEmailTags } from "../_shared/resend-tags.ts";
import { sendViaResend } from "../_shared/resend.ts";
import { renderReminder24h, renderReminder48h } from "../_shared/templates.ts";

interface CandidateRow {
  cita_id:      string;
  paciente_id:  string;
  user_id:      string;
  email:        string;
  display_name: string | null;
  servicio:     string;
  inicio:       string;
  duracion_min: number;
}

type ReminderKind = "reminder_24h" | "reminder_48h";
type PrefKey = "reminder_24h" | "reminder_48h";

const APP_URL    = Deno.env.get("FRONTEND_URL") ?? "https://ampsicologia.es";
const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") ?? "Clínica Almudena <onboarding@resend.dev>";
const REPLY_TO   = Deno.env.get("RESEND_REPLY_TO") ?? undefined;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function supabaseAdmin(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no configurados");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function processBatch(
  admin: SupabaseClient,
  rows: readonly CandidateRow[],
  kind: ReminderKind,
  prefKey: PrefKey,
  render: (c: CandidateRow) => { subject: string; html: string; text: string },
): Promise<{ sent: number; failed: number; skipped: number }> {
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const c of rows) {
    const { data: prefs } = await admin
      .from("notificaciones_prefs")
      .select(prefKey)
      .eq("user_id", c.user_id)
      .maybeSingle<Record<PrefKey, boolean | null>>();

    if (prefs && prefs[prefKey] === false) {
      await admin.from("emails_log").insert({
        email_type: kind,
        to_email:   c.email,
        to_user_id: c.user_id,
        cita_id:    c.cita_id,
        status:     "skipped",
        error_message: "opted_out",
      });
      skipped++;
      continue;
    }

    const { data: logRow, error: insErr } = await admin
      .from("emails_log")
      .insert({
        email_type: kind,
        to_email:   c.email,
        to_user_id: c.user_id,
        cita_id:    c.cita_id,
        status:     "pending",
      })
      .select("id")
      .maybeSingle();

    if (insErr) {
      // deno-lint-ignore no-explicit-any
      if ((insErr as any).code === "23505") continue;
      failed++;
      continue;
    }

    const logId = logRow?.id;
    if (logId == null) {
      failed++;
      continue;
    }

    const rendered = render(c);
    const result = await sendViaResend({
      from:     FROM_EMAIL,
      to:       c.email,
      subject:  rendered.subject,
      html:     rendered.html,
      text:     rendered.text,
      reply_to: REPLY_TO,
      tags: resendEmailTags(kind, [
        { name: "cita_id", value: c.cita_id },
      ]),
    });

    await admin
      .from("emails_log")
      .update({
        status:        result.ok ? "sent" : "failed",
        provider_id:   result.providerId ?? null,
        error_message: result.error ?? null,
        attempts:      result.attempts,
        sent_at:       result.ok ? new Date().toISOString() : null,
      })
      .eq("id", logId);

    if (result.ok) sent++;
    else failed++;
  }

  return { sent, failed, skipped };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const expected = Deno.env.get("CRON_SECRET");
  if (!expected) return json({ error: "cron_secret_not_configured" }, 500);

  const auth = req.headers.get("authorization") ?? "";
  const provided = auth.replace(/^Bearer\s+/i, "");
  if (provided !== expected) return json({ error: "forbidden" }, 403);

  const admin = supabaseAdmin();

  const [r48, r24] = await Promise.all([
    admin.rpc("citas_pendientes_recordatorio_48h"),
    admin.rpc("citas_pendientes_recordatorio_24h"),
  ]);

  if (r48.error) return json({ error: "rpc_failed", detail: r48.error.message }, 500);
  if (r24.error) return json({ error: "rpc_failed", detail: r24.error.message }, 500);

  const rows48 = (r48.data ?? []) as CandidateRow[];
  const rows24 = (r24.data ?? []) as CandidateRow[];

  if (rows48.length === 0 && rows24.length === 0) {
    return json({ ok: true, processed: 0 }, 200);
  }

  const out48 = await processBatch(
    admin,
    rows48,
    "reminder_48h",
    "reminder_48h",
    (c) => renderReminder48h({
      display_name: c.display_name,
      servicio:     c.servicio,
      inicio:       c.inicio,
      duracion_min: c.duracion_min,
      app_url:      APP_URL,
    }),
  );

  const out24 = await processBatch(
    admin,
    rows24,
    "reminder_24h",
    "reminder_24h",
    (c) => renderReminder24h({
      display_name: c.display_name,
      servicio:     c.servicio,
      inicio:       c.inicio,
      duracion_min: c.duracion_min,
      app_url:      APP_URL,
    }),
  );

  const sent = out48.sent + out24.sent;
  const failed = out48.failed + out24.failed;
  const skipped = out48.skipped + out24.skipped;
  const processed = rows48.length + rows24.length;

  return json(
    {
      ok: true,
      processed,
      sent,
      failed,
      skipped,
      detail_48h: { n: rows48.length, sent: out48.sent, failed: out48.failed, skipped: out48.skipped },
      detail_24h: { n: rows24.length, sent: out24.sent, failed: out24.failed, skipped: out24.skipped },
    },
    200,
  );
});
