// Edge Function: invoice-pdf
// -----------------------------------------------------------------------------
// Genera una factura PDF A4 para un pago completado. El paciente sólo puede
// descargar la suya (RPC `datos_factura` aplica la comprobación).
//
// Flujo:
//   1. Valida JWT (authenticated).
//   2. Llama a RPC `public.datos_factura(pago_id)` → devuelve filas con
//      número de factura asignado (advisory-lock por año).
//   3. Renderiza PDF con pdf-lib y lo devuelve con Content-Type: application/pdf.
//
// Emisor: se lee de env vars FACTURA_EMISOR_*. Si alguna no está configurada,
// responde 503 con un error claro para evitar emitir facturas inválidas.
//
// IVA: los servicios de psicología sanitaria están EXENTOS (art. 20.1.3 LIVA).
// -----------------------------------------------------------------------------

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "https://esm.sh/pdf-lib@1.17.1";

import { buildCorsHeaders, handleOptions } from "../_shared/cors.ts";
import { captureEdgeError } from "../_shared/sentry.ts";

const UUID_RE = /^[0-9a-f-]{36}$/i;

interface FacturaData {
  numero_factura: string;
  fecha_factura: string;
  moneda: string;
  importe_centimos: number;
  metodo: string | null;
  descripcion: string | null;
  cita_inicio: string | null;
  servicio_nombre: string | null;
  bono_nombre: string | null;
  bono_sesiones: number | null;
  paciente_nombre: string | null;
  paciente_email: string | null;
  paciente_user_id: string;
}

interface Emisor {
  nombre: string;
  nif: string;
  direccion: string;
  email: string;
  telefono: string;
  iban: string;
}

function json(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function readEmisor(): Emisor | null {
  const nombre = Deno.env.get("FACTURA_EMISOR_NOMBRE");
  const nif = Deno.env.get("FACTURA_EMISOR_NIF");
  const direccion = Deno.env.get("FACTURA_EMISOR_DIRECCION");
  if (!nombre || !nif || !direccion) return null;
  return {
    nombre,
    nif,
    direccion,
    email: Deno.env.get("FACTURA_EMISOR_EMAIL") ?? "",
    telefono: Deno.env.get("FACTURA_EMISOR_TELEFONO") ?? "",
    iban: Deno.env.get("FACTURA_EMISOR_IBAN") ?? "",
  };
}

function euro(cents: number, moneda: string): string {
  const v = (cents / 100).toFixed(2).replace(".", ",");
  return `${v} ${moneda}`;
}

function fechaLarga(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Madrid",
  });
}

function fechaCortaHora(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleString("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Madrid",
  });
}

interface DrawCtx {
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
}

function drawText(
  ctx: DrawCtx,
  text: string,
  x: number,
  y: number,
  size: number,
  opts: { bold?: boolean; color?: [number, number, number] } = {}
): void {
  ctx.page.drawText(text, {
    x,
    y,
    size,
    font: opts.bold ? ctx.bold : ctx.font,
    color: rgb(
      (opts.color?.[0] ?? 30) / 255,
      (opts.color?.[1] ?? 30) / 255,
      (opts.color?.[2] ?? 30) / 255
    ),
  });
}

async function renderPdf(data: FacturaData, emisor: Emisor): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ctx: DrawCtx = { page, font, bold };

  // Encabezado
  drawText(ctx, emisor.nombre, 50, 790, 16, { bold: true });
  drawText(ctx, `NIF: ${emisor.nif}`, 50, 770, 9);
  emisor.direccion.split("\n").forEach((line, i) => {
    drawText(ctx, line, 50, 758 - i * 12, 9);
  });
  if (emisor.email) drawText(ctx, emisor.email, 50, 722, 9);
  if (emisor.telefono) drawText(ctx, emisor.telefono, 50, 710, 9);

  // Bloque factura (arriba derecha)
  drawText(ctx, "FACTURA", 400, 790, 18, { bold: true });
  drawText(ctx, `Nº ${data.numero_factura}`, 400, 770, 11, { bold: true });
  drawText(ctx, `Fecha: ${fechaLarga(data.fecha_factura)}`, 400, 755, 9);

  // Separador
  page.drawLine({
    start: { x: 50, y: 695 },
    end: { x: 545, y: 695 },
    thickness: 0.5,
    color: rgb(0.85, 0.85, 0.85),
  });

  // Destinatario
  drawText(ctx, "FACTURAR A", 50, 675, 9, { bold: true, color: [110, 110, 110] });
  drawText(ctx, data.paciente_nombre ?? "—", 50, 660, 12, { bold: true });
  if (data.paciente_email) drawText(ctx, data.paciente_email, 50, 646, 9);

  // Tabla conceptos
  const tableTop = 580;
  page.drawRectangle({
    x: 50,
    y: tableTop - 22,
    width: 495,
    height: 22,
    color: rgb(0.96, 0.96, 0.94),
  });
  drawText(ctx, "Concepto", 60, tableTop - 15, 9, { bold: true });
  drawText(ctx, "Cantidad", 380, tableTop - 15, 9, { bold: true });
  drawText(ctx, "Importe", 480, tableTop - 15, 9, { bold: true });

  // Línea de concepto
  let concepto = data.descripcion ?? "";
  if (!concepto) {
    if (data.bono_nombre) {
      concepto = `Bono ${data.bono_sesiones ?? ""} sesiones — ${data.bono_nombre}`.trim();
    } else if (data.servicio_nombre) {
      concepto = `Sesión — ${data.servicio_nombre}`;
    } else {
      concepto = "Servicio profesional";
    }
  }
  if (data.cita_inicio) {
    const fc = fechaCortaHora(data.cita_inicio);
    if (fc) concepto += `  ·  ${fc}`;
  }

  drawText(ctx, concepto.slice(0, 70), 60, tableTop - 42, 10);
  drawText(ctx, "1", 400, tableTop - 42, 10);
  drawText(ctx, euro(data.importe_centimos, data.moneda), 480, tableTop - 42, 10);

  // Totales
  const totalY = tableTop - 110;
  drawText(ctx, "Base imponible", 380, totalY, 10);
  drawText(ctx, euro(data.importe_centimos, data.moneda), 480, totalY, 10);

  drawText(ctx, "IVA (0% — exento art. 20.1.3 LIVA)", 380, totalY - 15, 9, {
    color: [110, 110, 110],
  });
  drawText(ctx, euro(0, data.moneda), 480, totalY - 15, 9, {
    color: [110, 110, 110],
  });

  page.drawLine({
    start: { x: 380, y: totalY - 25 },
    end: { x: 545, y: totalY - 25 },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  });

  drawText(ctx, "TOTAL", 380, totalY - 42, 12, { bold: true });
  drawText(
    ctx,
    euro(data.importe_centimos, data.moneda),
    480,
    totalY - 42,
    12,
    { bold: true }
  );

  // Método de pago
  if (data.metodo) {
    drawText(ctx, `Forma de pago: ${data.metodo}`, 50, totalY - 80, 9);
  }

  // Pie legal
  const pieY = 110;
  drawText(
    ctx,
    "Servicios de psicología sanitaria exentos de IVA (art. 20.1.3 Ley 37/1992).",
    50,
    pieY + 36,
    8,
    { color: [110, 110, 110] }
  );
  drawText(
    ctx,
    "Documento generado electrónicamente. Los datos personales se tratan conforme al RGPD (UE) 2016/679.",
    50,
    pieY + 22,
    8,
    { color: [110, 110, 110] }
  );
  if (emisor.iban) {
    drawText(ctx, `IBAN: ${emisor.iban}`, 50, pieY + 6, 8, { color: [110, 110, 110] });
  }

  return await pdf.save();
}

Deno.serve(async (req) => {
  const cors = buildCorsHeaders(req.headers.get("origin"));
  const opts = handleOptions(req);
  if (opts) return opts;

  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405, cors);
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader) return json({ error: "unauthorized" }, 401, cors);

  const emisor = readEmisor();
  if (!emisor) {
    return json(
      {
        error: "emisor_no_configurado",
        detail:
          "Faltan FACTURA_EMISOR_NOMBRE / FACTURA_EMISOR_NIF / FACTURA_EMISOR_DIRECCION en la Edge Function.",
      },
      503,
      cors
    );
  }

  let body: { pago_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400, cors);
  }

  const pagoId = body.pago_id ?? "";
  if (!UUID_RE.test(pagoId)) {
    return json({ error: "pago_id_invalido" }, 400, cors);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Cliente autenticado con el JWT del user → RPC aplica auth.uid() para
  // validar ownership (no usamos service_role aquí a propósito).
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data, error } = await supabase.rpc("datos_factura", {
    p_pago_id: pagoId,
  });

  if (error) {
    const msg = error.message ?? "rpc_error";
    const code = msg.includes("forbidden")
      ? 403
      : msg.includes("pago_no_encontrado")
      ? 404
      : msg.includes("pago_no_completado")
      ? 409
      : 500;
    if (code >= 500) {
      captureEdgeError(error, {
        area: "invoice-pdf",
        event_type: "datos_factura_rpc",
        entity_id: pagoId,
        fingerprint: ["invoice-pdf", "rpc", msg],
      });
    }
    return json({ error: msg }, code, cors);
  }

  const fila = (Array.isArray(data) ? data[0] : data) as FacturaData | undefined;
  if (!fila) return json({ error: "sin_datos" }, 404, cors);

  try {
    const pdfBytes = await renderPdf(fila, emisor);
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        ...cors,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="factura-${fila.numero_factura}.pdf"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    captureEdgeError(err, {
      area: "invoice-pdf",
      event_type: "render_pdf",
      entity_id: pagoId,
      fingerprint: ["invoice-pdf", "render"],
    });
    return json({ error: "render_failed", detail }, 500, cors);
  }
});
