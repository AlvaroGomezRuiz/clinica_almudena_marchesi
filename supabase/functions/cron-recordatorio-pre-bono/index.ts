// Edge Function: cron-recordatorio-pre-bono
// ---------------------------------------------------------------------------
// Cron diario: busca bonos en estado pendiente_pago y envía recordatorio
// cada 3 días al paciente para que complete el pago.
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

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // Buscar bonos pendiente_pago
  const { data: bonos, error: bonosErr } = await admin
    .from("bonos_pacientes")
    .select("id, paciente_id, servicio_id, sesiones_totales, fecha_compra")
    .eq("estado", "pendiente_pago")
    .eq("activo", false);

  if (bonosErr || !bonos) {
    return json({ ok: false, error: bonosErr?.message ?? "no_bonos" }, 500);
  }

  const now = Date.now();
  const MS_3_DAYS = 3 * 24 * 60 * 60 * 1000;
  let reminded = 0;

  for (const bono of bonos) {
    const compraMs = new Date(bono.fecha_compra).getTime();
    const diasDesdeCompra = Math.floor((now - compraMs) / (24 * 60 * 60 * 1000));

    // Enviar recordatorio cada 3 días (día 3, 6, 9, etc.)
    if (diasDesdeCompra > 0 && diasDesdeCompra % 3 === 0) {
      const { data: paciente } = await admin
        .from("pacientes")
        .select("user_id")
        .eq("id", bono.paciente_id)
        .maybeSingle();

      if (paciente?.user_id) {
        const { data: servicio } = await admin
          .from("servicios")
          .select("nombre")
          .eq("id", bono.servicio_id)
          .maybeSingle();

        await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            type: "pre_bono_recordatorio",
            to_user_id: paciente.user_id,
            data: {
              servicio: servicio?.nombre ?? "Servicio",
              sesiones: bono.sesiones_totales,
              bono_id: bono.id,
            },
          }),
        }).catch(() => {});
        reminded++;
      }
    }
  }

  return json({ ok: true, reminded, total: bonos.length });
});
