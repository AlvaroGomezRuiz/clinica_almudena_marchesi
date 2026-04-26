// Edge Function: rgpd-request
// -----------------------------------------------------------------------------
// Procesa una solicitud RGPD registrada en `public.rgpd_requests`.
//
// Dos modos de invocación:
//   1. "ack"    — tras crear la solicitud. Envía acuse de recibo al usuario
//                 y marca estado = 'en_revision'. Cualquiera con JWT puede
//                 invocarlo para SU propia solicitud.
//   2. "execute"— ejecuta la acción (hoy: sólo `exportar`). SOLO admin, a
//                 través de un futuro botón en el panel de solicitudes.
//
// Body: { request_id: uuid, mode?: 'ack' | 'execute' }   (default: 'ack').
// -----------------------------------------------------------------------------

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

import { buildCorsHeaders, handleOptions } from "../_shared/cors.ts";
import { resolveResendFrom, resolveResendReplyTo } from "../_shared/resend-from.ts";
import { resendEmailTags } from "../_shared/resend-tags.ts";
import { sendViaResend } from "../_shared/resend.ts";
import { captureEdgeError, wrapEdgeHandler } from "../_shared/sentry.ts";
import {
  renderRgpdAck,
  renderRgpdExportReady,
} from "../_shared/templates.ts";

const UUID_RE = /^[0-9a-f-]{36}$/i;
const APP_URL = Deno.env.get("FRONTEND_URL") ?? "https://ampsicologia.es";

interface RgpdRow {
  id: string;
  user_id: string;
  tipo: string;
  estado: string;
  motivo: string | null;
  fecha_limite: string | null;
  created_at: string;
}

interface ProfileRow {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
}

function json(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

interface ExportBundle {
  generated_at: string;
  user: ProfileRow;
  paciente: unknown;
  citas: unknown;
  pagos: unknown;
  bonos: unknown;
  conversaciones: unknown;
  mensajes: unknown;
  notas_citas: unknown;
  recurso_asignaciones: unknown;
  solicitudes_rgpd: unknown;
  notificaciones_prefs: unknown;
}

async function buildExportBundle(
  admin: ReturnType<typeof createClient>,
  user: ProfileRow
): Promise<ExportBundle> {
  const uid = user.id;

  // Identificar paciente (si existe)
  const { data: paciente } = await admin
    .from("pacientes")
    .select("*")
    .eq("user_id", uid)
    .maybeSingle();

  const pacienteId = (paciente as { id?: string } | null)?.id ?? null;

  const [
    { data: citas },
    { data: pagos },
    { data: bonos },
    { data: conversaciones },
    { data: mensajes },
    { data: notasCitas },
    { data: asignaciones },
    { data: rgpd },
    { data: prefs },
  ] = await Promise.all([
    pacienteId
      ? admin.from("citas").select("*").eq("paciente_id", pacienteId)
      : Promise.resolve({ data: [] }),
    pacienteId
      ? admin.from("pagos").select("*").eq("paciente_id", pacienteId)
      : Promise.resolve({ data: [] }),
    pacienteId
      ? admin.from("bonos_pacientes").select("*").eq("paciente_id", pacienteId)
      : Promise.resolve({ data: [] }),
    pacienteId
      ? admin.from("conversaciones").select("*").eq("paciente_id", pacienteId)
      : Promise.resolve({ data: [] }),
    admin.from("mensajes").select("*").eq("autor_id", uid),
    admin.from("citas_notas_paciente").select("*").eq("autor_user_id", uid),
    pacienteId
      ? admin
          .from("recurso_asignaciones")
          .select("*")
          .eq("paciente_id", pacienteId)
      : Promise.resolve({ data: [] }),
    admin.from("rgpd_requests").select("*").eq("user_id", uid),
    admin
      .from("notificaciones_prefs")
      .select("*")
      .eq("user_id", uid)
      .maybeSingle(),
  ]);

  return {
    generated_at: new Date().toISOString(),
    user,
    paciente,
    citas: citas ?? [],
    pagos: pagos ?? [],
    bonos: bonos ?? [],
    conversaciones: conversaciones ?? [],
    mensajes: mensajes ?? [],
    notas_citas: notasCitas ?? [],
    recurso_asignaciones: asignaciones ?? [],
    solicitudes_rgpd: rgpd ?? [],
    notificaciones_prefs: prefs,
  };
}

Deno.serve(wrapEdgeHandler("rgpd-request", async (req) => {
  const cors = buildCorsHeaders(req.headers.get("origin"));
  const opts = handleOptions(req);
  if (opts) return opts;

  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, cors);

  const authHeader = req.headers.get("authorization");
  if (!authHeader) return json({ error: "unauthorized" }, 401, cors);

  let body: { request_id?: string; mode?: "ack" | "execute" };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400, cors);
  }

  const requestId = body.request_id ?? "";
  const mode: "ack" | "execute" = body.mode ?? "ack";
  if (!UUID_RE.test(requestId)) {
    return json({ error: "request_id_invalido" }, 400, cors);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabaseAuth = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const {
    data: { user },
    error: authErr,
  } = await supabaseAuth.auth.getUser();
  if (authErr || !user) return json({ error: "unauthorized" }, 401, cors);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const { data: solicitud, error: reqErr } = await admin
    .from("rgpd_requests")
    .select("id, user_id, tipo, estado, motivo, fecha_limite, created_at")
    .eq("id", requestId)
    .maybeSingle<RgpdRow>();

  if (reqErr || !solicitud) {
    return json({ error: "solicitud_no_encontrada" }, 404, cors);
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("id, email, display_name, role")
    .eq("id", solicitud.user_id)
    .maybeSingle<ProfileRow>();

  if (!profile) return json({ error: "perfil_no_encontrado" }, 404, cors);

  const { data: caller } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: string }>();

  const isAdmin = caller?.role === "admin";
  const isOwner = user.id === solicitud.user_id;

  // Autorización
  if (mode === "ack" && !isAdmin && !isOwner) {
    return json({ error: "forbidden" }, 403, cors);
  }
  if (mode === "execute" && !isAdmin) {
    return json({ error: "forbidden_admin_only" }, 403, cors);
  }

  // -------------------------------------------------------------------------
  // MODE: ack — acuse de recibo + estado → en_revision
  // -------------------------------------------------------------------------
  if (mode === "ack") {
    if (solicitud.estado === "pendiente") {
      const fechaLimite = new Date(
        new Date(solicitud.created_at).getTime() + 30 * 24 * 60 * 60 * 1000
      ).toISOString();
      await admin
        .from("rgpd_requests")
        .update({
          estado: "en_revision",
          fecha_limite: solicitud.fecha_limite ?? fechaLimite,
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId);
    }

    const tpl = renderRgpdAck({
      display_name: profile.display_name,
      tipo: solicitud.tipo,
      fecha_limite:
        solicitud.fecha_limite ??
        new Date(
          new Date(solicitud.created_at).getTime() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
      app_url: APP_URL,
    });

    const send = await sendViaResend({
      from: resolveResendFrom(),
      reply_to: resolveResendReplyTo(),
      to: profile.email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
      tags: resendEmailTags("rgpd_ack", [
        { name: "tipo", value: solicitud.tipo },
      ]),
    });

    return json({ ok: true, mode, email: send }, 200, cors);
  }

  // -------------------------------------------------------------------------
  // MODE: execute — sólo para `exportar` por ahora
  // -------------------------------------------------------------------------
  if (solicitud.tipo !== "exportar") {
    return json(
      {
        ok: false,
        error: "tipo_no_automatizado",
        detail:
          "Sólo 'exportar' se procesa automáticamente. El resto requiere revisión manual de Almudena.",
      },
      400,
      cors
    );
  }

  if (solicitud.estado === "resuelta") {
    return json({ ok: true, mode, note: "ya_resuelta" }, 200, cors);
  }

  const bundle = await buildExportBundle(admin, profile);
  const blob = new TextEncoder().encode(JSON.stringify(bundle, null, 2));
  const storagePath = `${profile.id}/${requestId}.json`;

  const { error: upErr } = await admin.storage
    .from("rgpd-exports")
    .upload(storagePath, blob, {
      contentType: "application/json",
      upsert: true,
      cacheControl: "60",
    });

  if (upErr) {
    captureEdgeError(upErr, {
      area: "rgpd-request",
      event_type: "storage_upload",
      entity_id: requestId,
      fingerprint: ["rgpd-request", "upload"],
    });
    return json({ error: "upload_failed", detail: upErr.message }, 500, cors);
  }

  const expiresIn = 60 * 60 * 24 * 7; // 7 días
  const { data: signed, error: sErr } = await admin.storage
    .from("rgpd-exports")
    .createSignedUrl(storagePath, expiresIn);

  if (sErr || !signed?.signedUrl) {
    captureEdgeError(sErr ?? new Error("sign_failed: empty signedUrl"), {
      area: "rgpd-request",
      event_type: "storage_sign",
      entity_id: requestId,
      fingerprint: ["rgpd-request", "sign"],
    });
    return json({ error: "sign_failed", detail: sErr?.message ?? "" }, 500, cors);
  }

  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  await admin
    .from("rgpd_requests")
    .update({
      estado: "resuelta",
      export_storage_path: storagePath,
      export_expires_at: expiresAt,
      resolucion: "Exportación completada. Enlace enviado por email.",
      resuelta_por: user.id,
      resuelta_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  const tpl = renderRgpdExportReady({
    display_name: profile.display_name,
    signed_url: signed.signedUrl,
    expires_at: expiresAt,
    app_url: APP_URL,
  });

  const send = await sendViaResend({
    from: resolveResendFrom(),
    reply_to: resolveResendReplyTo(),
    to: profile.email,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
    tags: resendEmailTags("rgpd_export_ready"),
  });

  return json(
    {
      ok: true,
      mode,
      storage_path: storagePath,
      expires_at: expiresAt,
      email: send,
    },
    200,
    cors
  );
}));
