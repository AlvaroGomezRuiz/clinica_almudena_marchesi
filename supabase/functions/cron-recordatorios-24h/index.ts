// Edge Function: cron-recordatorios-24h
// -----------------------------------------------------------------------------
// Invocada por pg_cron cada hora. Lee public.citas_pendientes_recordatorio_24h()
// y dispara un email reminder_24h por cada fila vía la Edge Function send-email.
//
// Seguridad: valida Bearer == CRON_SECRET (definido en app.settings.cron_secret
// del servidor Postgres, referenciado desde pg_cron). Esto evita que cualquiera
// con la anon key pueda disparar el cron.
// -----------------------------------------------------------------------------

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { sendViaResend } from "../_shared/resend.ts";
import { renderReminder24h } from "../_shared/templates.ts";

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

const APP_URL    = Deno.env.get("FRONTEND_URL") ?? "https://clinica-almudena.vercel.app";
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

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const expected = Deno.env.get("CRON_SECRET");
  if (!expected) return json({ error: "cron_secret_not_configured" }, 500);

  const auth = req.headers.get("authorization") ?? "";
  const provided = auth.replace(/^Bearer\s+/i, "");
  if (provided !== expected) return json({ error: "forbidden" }, 403);

  const admin = supabaseAdmin();

  const { data: candidates, error } = await admin
    .rpc("citas_pendientes_recordatorio_24h");

  if (error) return json({ error: "rpc_failed", detail: error.message }, 500);

  const rows = (candidates ?? []) as CandidateRow[];
  if (rows.length === 0) return json({ ok: true, processed: 0 }, 200);

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  // Procesamos secuencial para no saturar rate-limits de Resend (10 req/s).
  // Para volúmenes >50/h, migrar a Promise.all en batches de 5.
  for (const c of rows) {
    // Opt-in check (granular)
    const { data: prefs } = await admin
      .from("notificaciones_prefs")
      .select("reminder_24h")
      .eq("user_id", c.user_id)
      .maybeSingle();

    if (prefs && prefs.reminder_24h === false) {
      await admin.from("emails_log").insert({
        email_type: "reminder_24h",
        to_email:   c.email,
        to_user_id: c.user_id,
        cita_id:    c.cita_id,
        status:     "skipped",
        error_message: "opted_out",
      });
      skipped++;
      continue;
    }

    // Insert pending — UNIQUE index nos protege si otra instancia del cron
    // corre en paralelo por casualidad.
    const { data: logRow, error: insErr } = await admin
      .from("emails_log")
      .insert({
        email_type: "reminder_24h",
        to_email:   c.email,
        to_user_id: c.user_id,
        cita_id:    c.cita_id,
        status:     "pending",
      })
      .select("id")
      .maybeSingle();

    if (insErr) {
      // Dedupe violation → otra instancia ya lo está enviando, skip silencioso.
      // deno-lint-ignore no-explicit-any
      if ((insErr as any).code === "23505") continue;
      failed++;
      continue;
    }

    const rendered = renderReminder24h({
      display_name: c.display_name,
      servicio:     c.servicio,
      inicio:       c.inicio,
      duracion_min: c.duracion_min,
      app_url:      APP_URL,
    });

    const result = await sendViaResend({
      from:     FROM_EMAIL,
      to:       c.email,
      subject:  rendered.subject,
      html:     rendered.html,
      text:     rendered.text,
      reply_to: REPLY_TO,
      tags: [
        { name: "type",    value: "reminder_24h" },
        { name: "cita_id", value: c.cita_id },
      ],
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
      .eq("id", logRow!.id);

    if (result.ok) sent++;
    else failed++;
  }

  return json({ ok: true, processed: rows.length, sent, failed, skipped }, 200);
});
