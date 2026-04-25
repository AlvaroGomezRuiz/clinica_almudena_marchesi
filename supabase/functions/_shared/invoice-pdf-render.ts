// Render PDF de factura (compartido entre invoice-pdf y send-email).
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "https://esm.sh/pdf-lib@1.17.1";

import { metodoPagoLabel } from "./metodo-pago.ts";

export interface FacturaData {
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

export interface Emisor {
  nombre: string;
  nif: string;
  direccion: string;
  email: string;
  telefono: string;
  iban: string;
  colegiada: string;
  regcess: string;
}

export function readInvoiceEmisor(): Emisor | null {
  const nombre = Deno.env.get("FACTURA_EMISOR_NOMBRE");
  const nif = Deno.env.get("FACTURA_EMISOR_NIF");
  const direccionLinea = Deno.env.get("FACTURA_EMISOR_DIRECCION");
  if (!nombre || !nif || !direccionLinea) return null;
  const cpCiudad = Deno.env.get("FACTURA_EMISOR_CP_CIUDAD")?.trim();
  const direccion = cpCiudad
    ? `${direccionLinea.trim()}\n${cpCiudad}`
    : direccionLinea.trim();
  return {
    nombre,
    nif,
    direccion,
    email: Deno.env.get("FACTURA_EMISOR_EMAIL") ?? "",
    telefono: Deno.env.get("FACTURA_EMISOR_TELEFONO") ?? "",
    iban: Deno.env.get("FACTURA_EMISOR_IBAN") ?? "",
    colegiada: Deno.env.get("FACTURA_EMISOR_COLEGIADA") ?? "",
    regcess: Deno.env.get("FACTURA_EMISOR_REGCESS") ?? "",
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
  opts: { bold?: boolean; color?: [number, number, number] } = {},
): void {
  ctx.page.drawText(text, {
    x,
    y,
    size,
    font: opts.bold ? ctx.bold : ctx.font,
    color: rgb(
      (opts.color?.[0] ?? 30) / 255,
      (opts.color?.[1] ?? 30) / 255,
      (opts.color?.[2] ?? 30) / 255,
    ),
  });
}

/** Devuelve bytes PDF A4 o lanza si falla pdf-lib. */
export async function renderInvoicePdfBytes(data: FacturaData, emisor: Emisor): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ctx: DrawCtx = { page, font, bold };
  const colImporteX = 520;

  let hy = 790;
  drawText(ctx, emisor.nombre, 50, hy, 16, { bold: true });
  hy -= 20;
  drawText(ctx, `NIF: ${emisor.nif}`, 50, hy, 9);
  hy -= 12;
  if (emisor.colegiada) {
    drawText(ctx, `Col. COPM: ${emisor.colegiada}`, 50, hy, 9);
    hy -= 12;
  }
  if (emisor.regcess) {
    drawText(ctx, `REGCESS: ${emisor.regcess}`, 50, hy, 9);
    hy -= 12;
  }
  emisor.direccion.split("\n").forEach((line) => {
    drawText(ctx, line, 50, hy, 9);
    hy -= 12;
  });
  if (emisor.email) {
    drawText(ctx, emisor.email, 50, hy, 9);
    hy -= 12;
  }
  if (emisor.telefono) {
    drawText(ctx, emisor.telefono, 50, hy, 9);
  }

  drawText(ctx, "FACTURA", 400, 790, 18, { bold: true });
  drawText(ctx, `Nº ${data.numero_factura}`, 400, 770, 11, { bold: true });
  drawText(ctx, `Fecha: ${fechaLarga(data.fecha_factura)}`, 400, 755, 9);

  page.drawLine({
    start: { x: 50, y: 695 },
    end: { x: 545, y: 695 },
    thickness: 0.5,
    color: rgb(0.85, 0.85, 0.85),
  });

  drawText(ctx, "FACTURAR A", 50, 675, 9, { bold: true, color: [110, 110, 110] });
  drawText(ctx, data.paciente_nombre ?? "—", 50, 660, 12, { bold: true });
  if (data.paciente_email) drawText(ctx, data.paciente_email, 50, 646, 9);

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
  drawText(ctx, "Importe", colImporteX, tableTop - 15, 9, { bold: true });

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
  drawText(ctx, euro(data.importe_centimos, data.moneda), colImporteX, tableTop - 42, 10);

  const totalY = tableTop - 110;
  drawText(ctx, "Base imponible", 380, totalY, 10);
  drawText(ctx, euro(data.importe_centimos, data.moneda), colImporteX, totalY, 10);

  drawText(ctx, "IVA: exención 0%", 380, totalY - 15, 9, {
    color: [110, 110, 110],
  });
  drawText(ctx, euro(0, data.moneda), colImporteX, totalY - 15, 9, {
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
    colImporteX,
    totalY - 42,
    12,
    { bold: true },
  );

  if (data.metodo) {
    drawText(
      ctx,
      `Forma de pago: ${metodoPagoLabel(data.metodo)}`,
      50,
      totalY - 80,
      9,
    );
  }

  const pieY = 110;
  drawText(
    ctx,
    "Servicios de psicología sanitaria exentos de IVA (art. 20.1.3 Ley 37/1992). Titulación PGS (máster habilitante).",
    50,
    pieY + 36,
    8,
    { color: [110, 110, 110] },
  );
  drawText(
    ctx,
    "Documento generado electrónicamente. Los datos personales se tratan conforme al RGPD (UE) 2016/679.",
    50,
    pieY + 22,
    8,
    { color: [110, 110, 110] },
  );
  if (emisor.iban) {
    drawText(ctx, `IBAN: ${emisor.iban}`, 50, pieY + 6, 8, { color: [110, 110, 110] });
  }

  return await pdf.save();
}

export function invoicePdfBytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
