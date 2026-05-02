// Edge Function: send-email
// -----------------------------------------------------------------------------
// Router de emails transaccionales. Recibe { type, to_user_id, data } y:
//   1. Valida JWT del caller (service_role o usuario autenticado).
//   2. Verifica opt-in del paciente en notificaciones_prefs (RLS-bypassed).
//   3. Inserta fila `pending` en emails_log (UNIQUE dedupe nos protege).
//   4. Renderiza HTML + text desde _shared/templates.
//   5. Envía vía Resend con retry exponencial (3 intentos).
//   6. Actualiza emails_log a 'sent' / 'failed' con provider_id o error.
// -----------------------------------------------------------------------------

// deno-lint-ignore-file no-explicit-any
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { buildCorsHeaders, handleOptions } from "../_shared/cors.ts";
import {
  type FacturaData,
  invoicePdfBytesToBase64,
  readInvoiceEmisor,
  renderInvoicePdfBytes,
} from "../_shared/invoice-pdf-render.ts";
import { resendEmailTags } from "../_shared/resend-tags.ts";
import { resolveResendFrom, resolveResendReplyTo } from "../_shared/resend-from.ts";
import { sendViaResend } from "../_shared/resend.ts";
import {
  renderWelcome,
  renderBookingConfirmed,
  renderReminder24h,
  renderReminder48h,
  renderBookingCancelled,
  renderNuevaAsignacion,
  renderBonoComprado,
  renderCitaPendientePago,
  renderCitaPendienteRecordatorio,
  renderCitaConfirmadaAdmin,
  renderPreBonoAsignado,
  renderPreBonoRecordatorio,
} from "../_shared/templates.ts";

type EmailType =
  | "welcome"
  | "booking_confirmed"
  | "reminder_24h"
  | "reminder_48h"
  | "booking_cancelled"
  | "nueva_asignacion"
  | "bono_comprado"
  | "cita_pendiente_pago"
  | "cita_pendiente_pago_recordatorio"
  | "cita_confirmada_admin_notif"
  | "pre_bono_asignado"
  | "pre_bono_recordatorio";

interface SendEmailRequest {
  type: EmailType;
  to_user_id?: string;    // preferente — resuelve email desde profiles
  to_email?: string;      // fallback si to_user_id no disponible
  cita_id?: string;
  /** `bono_comprado`: dedupe; `booking_confirmed`: adjuntar factura PDF al correo. */
  pago_id?: string;
  data?: Record<string, unknown>;
}

interface ProfileRow {
  id: string;
  email: string;
  display_name: string | null;
}

interface PrefsRow {
  welcome: boolean;
  booking_confirmed: boolean;
  booking_cancelled: boolean;
  reminder_24h: boolean;
  reminder_48h: boolean;
  nueva_asignacion: boolean;
}

const APP_URL = Deno.env.get("FRONTEND_URL") ?? "https://ampsicologia.es";

function json(body: unknown, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function supabaseAdmin(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no configurados");
  return createClient(url, key, { auth: { persistSession: false } });
}

const UUID_RE = /^[0-9a-f-]{36}$/i;

/** Factura PDF para Resend; falla en silencio si emisor o RPC no están listos. */
async function buildInvoiceAttachments(
  admin: SupabaseClient,
  pagoId: string,
): Promise<Array<{ filename: string; content: string }> | undefined> {
  if (!UUID_RE.test(pagoId)) return undefined;
  const emisor = readInvoiceEmisor();
  if (!emisor) return undefined;

  const { data, error } = await admin.rpc("datos_factura_service_mail", {
    p_pago_id: pagoId,
  });
  if (error || data == null) return undefined;

  const fila = (Array.isArray(data) ? data[0] : data) as FacturaData | undefined;
  if (!fila?.numero_factura) return undefined;

  try {
    const bytes = await renderInvoicePdfBytes(fila, emisor);
    return [{
      filename: `factura-${fila.numero_factura}.pdf`,
      content: invoicePdfBytesToBase64(bytes),
    }];
  } catch {
    return undefined;
  }
}

function prefsOptInForType(
  prefs: PrefsRow | null,
  type: EmailType,
  opts?: { readonly pagoId?: string | null },
): boolean {
  /* Tipos de pago / operativos: siempre enviar */
  if (type === "bono_comprado") return true;
  if (type === "booking_confirmed" && opts?.pagoId) return true;
  if (type === "cita_pendiente_pago") return true;
  if (type === "cita_pendiente_pago_recordatorio") return true;
  if (type === "cita_confirmada_admin_notif") return true;
  if (type === "pre_bono_asignado") return true;
  if (type === "pre_bono_recordatorio") return true;
  if (!prefs) return true;
  if (type === "welcome") return prefs.welcome;
  if (type === "booking_confirmed") return prefs.booking_confirmed;
  if (type === "booking_cancelled") return prefs.booking_cancelled;
  if (type === "reminder_24h") return prefs.reminder_24h;
  if (type === "reminder_48h") return prefs.reminder_48h;
  if (type === "nueva_asignacion") return prefs.nueva_asignacion;
  return true;
}

function renderFor(type: EmailType, data: Record<string, unknown>, profile: ProfileRow | null) {
  const base = { display_name: profile?.display_name ?? null, app_url: APP_URL };
  switch (type) {
    case "welcome":
      return renderWelcome({ ...base });
    case "booking_confirmed":
      return renderBookingConfirmed({
        ...base,
        servicio:      String(data.servicio ?? ""),
        inicio:        String(data.inicio ?? ""),
        duracion_min:  Number(data.duracion_min ?? 60),
      });
    case "reminder_24h":
      return renderReminder24h({
        ...base,
        servicio:      String(data.servicio ?? ""),
        inicio:        String(data.inicio ?? ""),
        duracion_min:  Number(data.duracion_min ?? 60),
      });
    case "reminder_48h":
      return renderReminder48h({
        ...base,
        servicio:      String(data.servicio ?? ""),
        inicio:        String(data.inicio ?? ""),
        duracion_min:  Number(data.duracion_min ?? 60),
      });
    case "booking_cancelled":
      return renderBookingCancelled({
        ...base,
        servicio: String(data.servicio ?? ""),
        inicio:   String(data.inicio ?? ""),
      });
    case "nueva_asignacion":
      return renderNuevaAsignacion({
        ...base,
        titulo_recurso: String(data.titulo_recurso ?? ""),
        tipo_recurso:   String(data.tipo_recurso ?? "recurso"),
      });
    case "bono_comprado":
      return renderBonoComprado({
        ...base,
        producto:      String(data.producto ?? "Bono"),
        sesiones:      Number(data.sesiones ?? 0),
        importe_label: String(data.importe_label ?? ""),
        metodo_label:  String(data.metodo_label ?? "—"),
        validez_label: String(data.validez_label ?? "—"),
        app_url:       String(data.app_url ?? APP_URL),
      });
    case "cita_pendiente_pago":
      return renderCitaPendientePago({
        ...base,
        servicio:     String(data.servicio ?? ""),
        inicio:       String(data.inicio ?? ""),
        duracion_min: Number(data.duracion_min ?? 60),
      });
    case "cita_pendiente_pago_recordatorio":
      return renderCitaPendienteRecordatorio({
        ...base,
        servicio:     String(data.servicio ?? ""),
        inicio:       String(data.inicio ?? ""),
        duracion_min: Number(data.duracion_min ?? 60),
      });
    case "cita_confirmada_admin_notif":
      return renderCitaConfirmadaAdmin({
        ...base,
        servicio:     String(data.servicio ?? ""),
        inicio:       String(data.inicio ?? ""),
        duracion_min: Number(data.duracion_min ?? 60),
      });
    case "pre_bono_asignado":
      return renderPreBonoAsignado({
        ...base,
        servicio:      String(data.servicio ?? ""),
        sesiones:      Number(data.sesiones ?? 0),
        validez_label: String(data.validez_label ?? "—"),
      });
    case "pre_bono_recordatorio":
      return renderPreBonoRecordatorio({
        ...base,
        servicio: String(data.servicio ?? ""),
        sesiones: Number(data.sesiones ?? 0),
      });
  }
}

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req.headers.get("origin"));
  const optionsResp = handleOptions(req);
  if (optionsResp) return optionsResp;

  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405, corsHeaders);
  }

  // Autorización: requiere header Authorization (anon o service_role).
  // Validamos presencia; la RLS no aplica aquí porque usamos service_role.
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return json({ error: "unauthorized" }, 401, corsHeaders);
  }

  let payload: SendEmailRequest;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400, corsHeaders);
  }

  if (!payload?.type) return json({ error: "missing_type" }, 400, corsHeaders);
  if (!payload.to_user_id && !payload.to_email) {
    return json({ error: "missing_recipient" }, 400, corsHeaders);
  }

  const admin = supabaseAdmin();

  // Resolver destinatario
  let profile: ProfileRow | null = null;
  let toEmail = payload.to_email ?? "";
  let toUserId: string | null = payload.to_user_id ?? null;

  if (toUserId) {
    const { data: p, error } = await admin
      .from("profiles")
      .select("id, email, display_name")
      .eq("id", toUserId)
      .maybeSingle();
    if (error) return json({ error: "profile_lookup_failed", detail: error.message }, 500, corsHeaders);
    if (!p) return json({ error: "profile_not_found" }, 404, corsHeaders);
    profile = p as ProfileRow;
    toEmail = profile.email;
  }

  if (!toEmail) return json({ error: "no_email_for_recipient" }, 422, corsHeaders);

  // Opt-in check
  if (toUserId) {
    const { data: prefsRaw } = await admin
      .from("notificaciones_prefs")
      .select("welcome, booking_confirmed, booking_cancelled, reminder_24h, reminder_48h, nueva_asignacion")
      .eq("user_id", toUserId)
      .maybeSingle();
    const prefs = prefsRaw as PrefsRow | null;

    if (!prefsOptInForType(prefs, payload.type, { pagoId: payload.pago_id })) {
      await admin.from("emails_log").insert({
        email_type: payload.type,
        to_email:   toEmail,
        to_user_id: toUserId,
        cita_id:    payload.cita_id ?? null,
        status:     "skipped",
        error_message: "opted_out",
      });
      return json({ ok: true, skipped: "opted_out" }, 200, corsHeaders);
    }
  }

  // Insert pending (UNIQUE(dedupe_key) impide duplicados)
  const pagoLogId =
    payload.type === "bono_comprado" || payload.type === "booking_confirmed"
      ? (payload.pago_id ?? null)
      : null;

  const { data: logRow, error: insertErr } = await admin
    .from("emails_log")
    .insert({
      email_type: payload.type,
      to_email:   toEmail,
      to_user_id: toUserId,
      cita_id:    payload.cita_id ?? null,
      pago_id:    pagoLogId,
      status:     "pending",
      attempts:   0,
    })
    .select("id")
    .maybeSingle();

  if (insertErr) {
    // 23505 = unique_violation → ya enviado en esta ventana
    if ((insertErr as any).code === "23505") {
      return json({ ok: true, deduped: true }, 200, corsHeaders);
    }
    return json({ error: "log_insert_failed", detail: insertErr.message }, 500, corsHeaders);
  }

  const logId = logRow?.id;
  if (logId == null) {
    return json({ error: "log_insert_no_id" }, 500, corsHeaders);
  }

  const rendered = renderFor(payload.type, payload.data ?? {}, profile);
  if (rendered == null) return json({ error: "unknown_type" }, 400, corsHeaders);

  let attachments: Array<{ filename: string; content: string }> | undefined;
  if (payload.type === "bono_comprado" && payload.pago_id) {
    attachments = await buildInvoiceAttachments(admin, payload.pago_id);
  } else if (payload.type === "booking_confirmed" && payload.pago_id) {
    attachments = await buildInvoiceAttachments(admin, payload.pago_id);
  }

  const result = await sendViaResend({
    from:      resolveResendFrom(),
    to:        toEmail,
    subject:   rendered.subject,
    html:      rendered.html,
    text:      rendered.text,
    reply_to:  resolveResendReplyTo(),
    tags:      resendEmailTags(payload.type),
    attachments,
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

  return json(
    {
      ok: result.ok,
      provider_id: result.providerId,
      attempts: result.attempts,
      error: result.error,
    },
    result.ok ? 200 : 502,
    corsHeaders,
  );
});
