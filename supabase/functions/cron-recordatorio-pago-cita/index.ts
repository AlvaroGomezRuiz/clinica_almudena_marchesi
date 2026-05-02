// Edge Function: cron-recordatorio-pago-cita
// ---------------------------------------------------------------------------
// Cron diario: busca citas en estado pendiente_pago y:
//   1. Si faltan < 48h → cancela la cita automáticamente.
//   2. Si no → envía email de recordatorio diario al paciente.
//
// Diseñada para ejecutarse via Supabase pg_cron o invocación programada.
//

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { buildCorsHeaders, handleOptions } from "../_shared/cors.ts";

Deno.serve(async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: buildCorsHeaders(origin) });
  }
  const cors = buildCorsHeaders(origin);

  const json = (d: unknown, s = 200) =>
    new Response(JSON.stringify(d), {
      status: s,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const auth = req.headers.get("authorization") ?? "";
  const provided = auth.replace(/^Bearer\s+/i, "");
  if (provided !== serviceKey) {
    return json({ error: "forbidden" }, 403);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // 1. Buscar citas pendiente_pago activas
  const { data: citas, error: citasErr } = await admin
    .from("citas")
    .select("id, paciente_id, servicio_id, inicio")
    .eq("estado", "pendiente_pago")
    .eq("activo", true)
    .gt("inicio", new Date().toISOString());

  if (citasErr || !citas) {
    return json({ ok: false, error: citasErr?.message ?? "no_citas" }, 500);
  }

  const now = Date.now();
  const MS_48H = 48 * 60 * 60 * 1000;
  let cancelled = 0;
  let reminded = 0;

  for (const cita of citas) {
    const inicioMs = new Date(cita.inicio).getTime();
    const horasRestantes = (inicioMs - now) / (1000 * 60 * 60);

    if (horasRestantes < 48) {
      // Cancelar automáticamente — fuera de plazo
      await admin
        .from("citas")
        .update({
          estado: "cancelada",
          activo: false,
          cancelacion_motivo: "Cancelada automáticamente por falta de pago (< 48h).",
          cancelacion_en: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", cita.id);
      cancelled++;
    } else {
      // Enviar recordatorio por email
      const { data: paciente } = await admin
        .from("pacientes")
        .select("user_id")
        .eq("id", cita.paciente_id)
        .maybeSingle();

      if (paciente?.user_id) {
        const { data: servicio } = await admin
          .from("servicios")
          .select("nombre")
          .eq("id", cita.servicio_id)
          .maybeSingle();

        // Fire-and-forget email via send-email
        await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            type: "cita_pendiente_pago_recordatorio",
            to_user_id: paciente.user_id,
            cita_id: cita.id,
            data: {
              servicio: servicio?.nombre ?? "Sesión",
              inicio: cita.inicio,
            },
          }),
        }).catch(() => {});
        reminded++;
      }
    }
  }

  return json({ ok: true, cancelled, reminded, total: citas.length });
});
