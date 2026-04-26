// Plantillas HTML transaccionales inline-styled (email clients no soportan CSS extern)
// Paleta alineada con "Serenity Moncloa" de la web pública.
// Tipografía: system stack (Georgia/serif + Helvetica/sans) — máxima compatibilidad.

import {
  CLINIC_EMAIL_CONTACT_ADDRESS,
  CLINIC_EMAIL_DOC_TITLE,
  CLINIC_EMAIL_FOOTER_ADDRESS,
  CLINIC_EMAIL_FOOTER_LEGAL,
  CLINIC_EMAIL_HEADER_LINE1,
  CLINIC_EMAIL_HEADER_LINE2,
  CLINIC_PUBLIC_PHONE_DISPLAY,
  CLINIC_PUBLIC_PHONE_TEL,
} from './clinic-brand.ts';

const COLORS = {
  parchment: "#F3E9DD",
  ink:       "#1E1B18",
  inkSoft:   "#4A4640",
  sage:      "#6B8A7A",
  sageDark:  "#4F6B5C",
  warm:      "#C99463",
  hairline:  "rgba(30,27,24,0.12)",
} as const;

/**
 * Pie fijo (solo texto) alineado al bloque HTML de `shell` (legal, NAP, contacto, ajustes).
 * Todo envío transaccional debe añadirlo a la parte `text` vía `appendPlainTextEmailFooter`.
 */
function formatPlainTextEmailFooter(appUrl: string): string {
  const base = appUrl.replace(/\/$/, '');
  return [
    '—',
    CLINIC_EMAIL_FOOTER_LEGAL,
    `${CLINIC_EMAIL_FOOTER_ADDRESS} · ${CLINIC_PUBLIC_PHONE_DISPLAY}`,
    CLINIC_EMAIL_CONTACT_ADDRESS,
    `Gestionar notificaciones: ${base}/portal/ajustes`,
  ].join('\n');
}

function appendPlainTextEmailFooter(mainBody: string, appUrl: string): string {
  const t = mainBody.trim();
  if (t.length === 0) return formatPlainTextEmailFooter(appUrl);
  return `${t}\n\n${formatPlainTextEmailFooter(appUrl)}`;
}

function escapeHtml(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDateEs(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Madrid",
  }).format(d);
}

function formatTimeEs(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  }).format(d);
}

interface ShellOptions {
  preheader: string;
  appUrl: string;
}

function shell(inner: string, { preheader, appUrl }: ShellOptions): string {
  const baseUrl = appUrl.replace(/\/$/, '');
  const safePreheader = escapeHtml(preheader);
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>${escapeHtml(CLINIC_EMAIL_DOC_TITLE)}</title>
</head>
<body style="margin:0;padding:0;background-color:${COLORS.parchment};font-family:Georgia,'Times New Roman',serif;color:${COLORS.ink};-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${safePreheader}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${COLORS.parchment};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;width:100%;background-color:#FBF6EF;border:1px solid ${COLORS.hairline};border-radius:20px;overflow:hidden;">
        <tr><td style="padding:32px 40px 20px 40px;border-bottom:1px solid ${COLORS.hairline};">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="vertical-align:middle;">
                <span style="display:inline-block;width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,${COLORS.sage} 0%,${COLORS.sageDark} 100%);vertical-align:middle;"></span>
                <span style="display:inline-block;margin-left:12px;vertical-align:middle;">
                  <span style="display:block;font-family:Georgia,serif;font-size:18px;letter-spacing:0.02em;color:${COLORS.ink};">${escapeHtml(CLINIC_EMAIL_HEADER_LINE1)}</span>
                  <span style="display:block;margin-top:4px;font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:${COLORS.inkSoft};">${escapeHtml(CLINIC_EMAIL_HEADER_LINE2)}</span>
                </span>
              </td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:32px 40px 40px 40px;font-size:16px;line-height:1.65;color:${COLORS.ink};">
          ${inner}
        </td></tr>
        <tr><td style="padding:24px 40px 32px 40px;border-top:1px solid ${COLORS.hairline};font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:${COLORS.inkSoft};">
          <p style="margin:0 0 6px 0;">${escapeHtml(CLINIC_EMAIL_FOOTER_LEGAL)}</p>
          <p style="margin:0 0 6px 0;">${escapeHtml(CLINIC_EMAIL_FOOTER_ADDRESS)} · <a href="tel:${escapeHtml(CLINIC_PUBLIC_PHONE_TEL)}" style="color:${COLORS.inkSoft};text-decoration:none;">${escapeHtml(CLINIC_PUBLIC_PHONE_DISPLAY)}</a></p>
          <p style="margin:0 0 6px 0;"><a href="mailto:${escapeHtml(CLINIC_EMAIL_CONTACT_ADDRESS)}" style="color:${COLORS.sageDark};text-decoration:none;">${escapeHtml(CLINIC_EMAIL_CONTACT_ADDRESS)}</a></p>
          <p style="margin:0;">Has recibido este correo porque eres paciente de la consulta. <a href="${baseUrl}/portal/ajustes" style="color:${COLORS.sageDark};">Gestionar notificaciones</a></p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0 0;font-family:Helvetica,Arial,sans-serif;font-size:11px;color:${COLORS.inkSoft};">© ${new Date().getFullYear()} ${escapeHtml(CLINIC_EMAIL_DOC_TITLE)}</p>
    </td></tr>
  </table>
</body>
</html>`;
}

function button(label: string, href: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0;">
    <tr><td style="border-radius:999px;background-color:${COLORS.sageDark};">
      <a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 28px;font-family:Helvetica,Arial,sans-serif;font-size:14px;letter-spacing:0.04em;text-transform:uppercase;color:#FBF6EF;text-decoration:none;border-radius:999px;">${escapeHtml(label)}</a>
    </td></tr>
  </table>`;
}

function h1(text: string): string {
  return `<h1 style="margin:0 0 16px 0;font-family:Georgia,serif;font-size:28px;line-height:1.2;font-weight:400;color:${COLORS.ink};">${escapeHtml(text)}</h1>`;
}

function eyebrow(text: string): string {
  return `<p style="margin:0 0 12px 0;font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${COLORS.sageDark};">${escapeHtml(text)}</p>`;
}

function detailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:10px 0;border-bottom:1px solid ${COLORS.hairline};font-family:Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${COLORS.inkSoft};width:40%;">${escapeHtml(label)}</td>
    <td style="padding:10px 0;border-bottom:1px solid ${COLORS.hairline};font-family:Georgia,serif;font-size:15px;color:${COLORS.ink};text-align:right;">${escapeHtml(value)}</td>
  </tr>`;
}

// ---------------------------------------------------------------------------
// Templates exportados
// ---------------------------------------------------------------------------

export interface WelcomeData {
  display_name?: string | null;
  app_url: string;
}

export function renderWelcome(data: WelcomeData): { subject: string; html: string; text: string } {
  const name = data.display_name?.split(" ")[0] ?? "";
  const greeting = name ? `Bienvenida, ${name}` : "Bienvenida a tu espacio";
  const html = shell(
    `${eyebrow("Acceso al portal")}
     ${h1(greeting)}
     <p style="margin:0 0 16px 0;">Tu cuenta en la Clínica Almudena Marchesi Fernández ya está activa. Desde el portal podrás consultar tus próximas citas, reservar nuevas sesiones, acceder a recursos personalizados y hablar directamente con Almudena.</p>
     ${button("Abrir mi portal", `${data.app_url}/portal`)}
     <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${COLORS.inkSoft};">Si no esperabas este correo, puedes ignorarlo sin problema.</p>`,
    { preheader: "Tu portal de paciente está listo.", appUrl: data.app_url },
  );
  const text = appendPlainTextEmailFooter(
    `${greeting}\n\nTu cuenta en la Clínica Almudena Marchesi Fernández está activa.\nAccede al portal: ${data.app_url}/portal\n\nSi no esperabas este correo, ignóralo.`,
    data.app_url
  );
  return { subject: "Bienvenida a tu portal", html, text };
}

export interface BookingConfirmedData {
  display_name?: string | null;
  servicio: string;
  inicio: string;   // ISO
  duracion_min: number;
  app_url: string;
}

export function renderBookingConfirmed(data: BookingConfirmedData): { subject: string; html: string; text: string } {
  const name = data.display_name?.split(" ")[0] ?? "";
  const fecha = formatDateEs(data.inicio);
  const hora  = formatTimeEs(data.inicio);
  const html = shell(
    `${eyebrow("Reserva confirmada")}
     ${h1(name ? `Nos vemos pronto, ${name}` : "Tu sesión está confirmada")}
     <p style="margin:0 0 20px 0;">Hemos reservado tu sesión. Aquí tienes los detalles:</p>
     <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 8px 0;">
       ${detailRow("Servicio", data.servicio)}
       ${detailRow("Fecha", fecha)}
       ${detailRow("Hora", `${hora} (${data.duracion_min} min)`)}
     </table>
     ${button("Ver mis citas", `${data.app_url}/portal/citas`)}
     <p style="margin:16px 0 0 0;font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${COLORS.inkSoft};">Si hay un pago completado asociado a esta reserva, encontrarás la factura en PDF como adjunto.</p>
     <p style="margin:8px 0 0 0;font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${COLORS.inkSoft};">¿Necesitas cambiar la fecha? Puedes hacerlo desde el portal con al menos 48h de antelación.</p>`,
    { preheader: `${data.servicio} · ${fecha} · ${hora}`, appUrl: data.app_url },
  );
  const text = appendPlainTextEmailFooter(
    `Reserva confirmada\n\n${data.servicio}\n${fecha} a las ${hora} (${data.duracion_min} min)\n\nSi aplica, la factura PDF va adjunta a este correo.\n\nGestionar citas: ${data.app_url}/portal/citas`,
    data.app_url
  );
  return { subject: `Confirmación: ${data.servicio} · ${fecha}`, html, text };
}

export interface Reminder24hData {
  display_name?: string | null;
  servicio: string;
  inicio: string;
  duracion_min: number;
  app_url: string;
}

export function renderReminder24h(data: Reminder24hData): { subject: string; html: string; text: string } {
  const name = data.display_name?.split(" ")[0] ?? "";
  const fecha = formatDateEs(data.inicio);
  const hora  = formatTimeEs(data.inicio);
  const html = shell(
    `${eyebrow("Recordatorio (24 horas antes)")}
     ${h1(name ? `Te espero mañana, ${name}` : "Tu sesión es mañana")}
     <p style="margin:0 0 20px 0;">Te escribo para recordarte la cita (aprox. 24h antes). Para cambios o cancelación <strong>online</strong>, la política es con al menos 48 horas de antelación; para lo demás, escribe a la consulta.</p>
     <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 8px 0;">
       ${detailRow("Servicio", data.servicio)}
       ${detailRow("Fecha", fecha)}
       ${detailRow("Hora", `${hora} (${data.duracion_min} min)`)}
     </table>
     ${button("Ver detalle en el portal", `${data.app_url}/portal/citas`)}
     <p style="margin:16px 0 0 0;font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${COLORS.inkSoft};">Recuerda llegar unos minutos antes. Un fuerte abrazo.</p>`,
    { preheader: `Mañana a las ${hora} · ${data.servicio}`, appUrl: data.app_url },
  );
  const text = appendPlainTextEmailFooter(
    `Recordatorio (≈24h antes, sesión mañana).\n\n${data.servicio}\n${fecha} a las ${hora} (${data.duracion_min} min)\n\nDetalle: ${data.app_url}/portal/citas`,
    data.app_url
  );
  return { subject: `Recordatorio: mañana · ${data.servicio} · ${hora}`, html, text };
}

export type Reminder48hData = Reminder24hData;

/** Recordatorio informativo ~48h antes (en ~2 días). Política de cancelación online: 48h. */
export function renderReminder48h(data: Reminder48hData): { subject: string; html: string; text: string } {
  const name = data.display_name?.split(" ")[0] ?? "";
  const fecha = formatDateEs(data.inicio);
  const hora  = formatTimeEs(data.inicio);
  const html = shell(
    `${eyebrow("Recordatorio (48 horas antes)")}
     ${h1(name ? `Hola, ${name} — en dos días tienes sesión` : "En dos días tienes sesión")}
     <p style="margin:0 0 20px 0;">Te aviso con ~48h de margen. Puedes gestionar o cancelar la cita <strong>online</strong> con al menos 48 horas de antelación; si hace falta, escribe a la consulta.</p>
     <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 8px 0;">
       ${detailRow("Servicio", data.servicio)}
       ${detailRow("Fecha", fecha)}
       ${detailRow("Hora", `${hora} (${data.duracion_min} min)`)}
     </table>
     ${button("Ver detalle en el portal", `${data.app_url}/portal/citas`)}
     <p style="margin:16px 0 0 0;font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${COLORS.inkSoft};">Recuerda llegar unos minutos antes. Un fuerte abrazo.</p>`,
    { preheader: `En 2 días a las ${hora} · ${data.servicio}`, appUrl: data.app_url },
  );
  const text = appendPlainTextEmailFooter(
    `Recordatorio (≈48h antes): en dos días tienes sesión.\n\n${data.servicio}\n${fecha} a las ${hora} (${data.duracion_min} min)\n\nVer detalle: ${data.app_url}/portal/citas`,
    data.app_url
  );
  return { subject: `Recordatorio: en 2 días · ${data.servicio} · ${hora}`, html, text };
}

export interface BookingCancelledData {
  display_name?: string | null;
  servicio: string;
  inicio: string;
  app_url: string;
}

export function renderBookingCancelled(data: BookingCancelledData): { subject: string; html: string; text: string } {
  const name = data.display_name?.split(" ")[0] ?? "";
  const fecha = formatDateEs(data.inicio);
  const hora  = formatTimeEs(data.inicio);
  const html = shell(
    `${eyebrow("Cita cancelada")}
     ${h1(name ? `Cita cancelada, ${name}` : "Tu cita ha sido cancelada")}
     <p style="margin:0 0 20px 0;">Queda confirmada la cancelación de tu sesión:</p>
     <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 8px 0;">
       ${detailRow("Servicio", data.servicio)}
       ${detailRow("Fecha prevista", `${fecha} · ${hora}`)}
     </table>
     ${button("Reservar otra sesión", `${data.app_url}/portal/citas/reservar`)}
     <p style="margin:16px 0 0 0;font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${COLORS.inkSoft};">Si la cancelación es un error, contacta con la consulta cuanto antes.</p>`,
    { preheader: `Cancelación ${fecha} · ${hora}`, appUrl: data.app_url },
  );
  const text = appendPlainTextEmailFooter(
    `Cita cancelada.\n\n${data.servicio}\n${fecha} a las ${hora}\n\nReservar de nuevo: ${data.app_url}/portal/citas/reservar`,
    data.app_url
  );
  return { subject: `Cancelación: ${data.servicio} · ${fecha}`, html, text };
}

export interface NuevaAsignacionData {
  display_name?: string | null;
  titulo_recurso: string;
  tipo_recurso: string;  // 'pdf' | 'video' | ...
  app_url: string;
}

export function renderNuevaAsignacion(data: NuevaAsignacionData): { subject: string; html: string; text: string } {
  const name = data.display_name?.split(" ")[0] ?? "";
  const html = shell(
    `${eyebrow("Nuevo recurso")}
     ${h1(name ? `Almudena te ha compartido algo, ${name}` : "Tienes un nuevo recurso asignado")}
     <p style="margin:0 0 12px 0;">Se ha añadido a tu portal:</p>
     <p style="margin:0 0 20px 0;font-family:Georgia,serif;font-size:18px;color:${COLORS.ink};"><strong>${escapeHtml(data.titulo_recurso)}</strong> <span style="font-family:Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${COLORS.sageDark};">· ${escapeHtml(data.tipo_recurso)}</span></p>
     ${button("Ver en el portal", `${data.app_url}/portal/recursos`)}`,
    { preheader: `Nuevo recurso: ${data.titulo_recurso}`, appUrl: data.app_url },
  );
  const text = appendPlainTextEmailFooter(
    `Nuevo recurso asignado: ${data.titulo_recurso} (${data.tipo_recurso})\n\nVer en el portal: ${data.app_url}/portal/recursos`,
    data.app_url
  );
  return { subject: `Nuevo recurso: ${data.titulo_recurso}`, html, text };
}

export interface BonoCompradoData {
  display_name?: string | null;
  /** Título o línea de producto p. ej. bono. */
  producto: string;
  sesiones: number;
  /** Ya formateado, p. ej. 510,00 eur. */
  importe_label: string;
  metodo_label: string;
  validez_label: string;
  app_url: string;
}

export function renderBonoComprado(
  data: BonoCompradoData
): { subject: string; html: string; text: string } {
  const name = data.display_name?.split(" ")[0] ?? "";
  const subj = `${name ? `${name}, pago ` : "Pago "}recibido: ${data.producto}`;
  const apertura = name
    ? `Hola ${name},<br><br>Confirmamos que hemos recibido <strong>${escapeHtml(data.importe_label)}</strong> mediante <strong>${escapeHtml(data.metodo_label)}</strong> por <strong>${escapeHtml(data.producto)}</strong>. Tu bono ya está activo con <strong>${data.sesiones} sesión${data.sesiones === 1 ? "" : "es"}</strong> para reservar cuando quieras. Fecha límite de uso del bono: <strong>${escapeHtml(data.validez_label)}</strong>.`
    : `Hemos recibido <strong>${escapeHtml(data.importe_label)}</strong> con <strong>${escapeHtml(data.metodo_label)}</strong> por <strong>${escapeHtml(data.producto)}</strong> (${data.sesiones} sesión${data.sesiones === 1 ? "" : "es"}). Bono en uso hasta: <strong>${escapeHtml(data.validez_label)}</strong>.`;
  const html = shell(
    `${eyebrow("Pago registrado")}
     ${h1(name ? `Todo listo, ${name}` : "Gracias, tu pago está registrado")}
     <p style="margin:0 0 18px 0;">${apertura}</p>
     <p style="margin:0 0 20px 0;font-family:Helvetica,Arial,sans-serif;font-size:14px;color:${COLORS.inkSoft};">Resumen del pedido. La factura en PDF va adjunta a este correo cuando el emisor fiscal está configurado en el servidor.</p>
     <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 8px 0;">
       ${detailRow("Compra", data.producto)}
       ${detailRow("Sesiones incluidas", String(data.sesiones))}
       ${detailRow("Importe", data.importe_label)}
       ${detailRow("Forma de pago", data.metodo_label)}
       ${detailRow("Bono: uso hasta", data.validez_label)}
     </table>
     ${button("Abrir bonos y factura", `${data.app_url}/portal/pagos`)}
     <p style="margin:16px 0 0 0;font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${COLORS.inkSoft};">Cualquier duda sobre el cobro, responde a este correo. Tarjeta, Apple/Google Pay o Stripe Link figuran con la etiqueta que viste al pagar.</p>`,
    { preheader: `Pago: ${data.importe_label} · ${data.sesiones} sesiones`, appUrl: data.app_url },
  );
  const text = appendPlainTextEmailFooter(
    name
      ? `Hola ${name}, pago recibido.\n\n${data.producto} · ${data.sesiones} sesiones\nImporte: ${data.importe_label} (${data.metodo_label})\nBono (uso) hasta: ${data.validez_label}\n\nResumen: ${data.app_url}/portal/pagos`
      : `Pago registrado\n\n${data.producto}\nSesiones: ${data.sesiones}\nImporte: ${data.importe_label}\nPago: ${data.metodo_label}\nBono (uso) hasta: ${data.validez_label}\n\n${data.app_url}/portal/pagos`,
    data.app_url
  );
  return { subject: subj, html, text };
}

// ---------------------------------------------------------------------------
// RGPD — acuse de recibo + exportación lista
// ---------------------------------------------------------------------------

const TIPO_LABELS: Record<string, string> = {
  exportar: "exportación de datos",
  borrado: "supresión (baja de cuenta)",
  rectificar: "rectificación",
  oposicion: "oposición al tratamiento",
  portabilidad: "portabilidad",
  limitacion: "limitación del tratamiento",
};

export interface RgpdAckData {
  display_name?: string | null;
  tipo: string;
  fecha_limite: string | null;
  app_url: string;
}

export function renderRgpdAck(data: RgpdAckData): { subject: string; html: string; text: string } {
  const name = data.display_name?.split(" ")[0] ?? "";
  const tipoLabel = TIPO_LABELS[data.tipo] ?? "solicitud RGPD";
  const plazo = data.fecha_limite
    ? formatDateEs(data.fecha_limite)
    : "30 días naturales";
  const html = shell(
    `${eyebrow("Solicitud RGPD recibida")}
     ${h1(name ? `Hemos recibido tu solicitud, ${name}` : "Solicitud RGPD recibida")}
     <p style="margin:0 0 16px 0;">Tu solicitud de <strong>${escapeHtml(tipoLabel)}</strong> está registrada. Almudena te responderá en un plazo máximo de <strong>${escapeHtml(plazo)}</strong>, conforme al art. 12 del RGPD.</p>
     <p style="margin:0 0 16px 0;">Puedes consultar el estado desde tu portal en cualquier momento.</p>
     ${button("Ver estado", `${data.app_url}/portal/ajustes`)}
     <p style="margin:16px 0 0 0;font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${COLORS.inkSoft};">Si la solicitud fue un error, contacta con nosotros respondiendo a este correo.</p>`,
    { preheader: `Solicitud de ${tipoLabel} registrada`, appUrl: data.app_url },
  );
  const text = appendPlainTextEmailFooter(
    `Solicitud RGPD recibida: ${tipoLabel}\nPlazo de respuesta: ${plazo}\n\nVer estado: ${data.app_url}/portal/ajustes`,
    data.app_url
  );
  return { subject: `Tu solicitud RGPD de ${tipoLabel}`, html, text };
}

export interface RgpdExportReadyData {
  display_name?: string | null;
  signed_url: string;
  expires_at: string;
  app_url: string;
}

export function renderRgpdExportReady(
  data: RgpdExportReadyData
): { subject: string; html: string; text: string } {
  const name = data.display_name?.split(" ")[0] ?? "";
  const expira = formatDateEs(data.expires_at);
  const html = shell(
    `${eyebrow("Exportación lista")}
     ${h1(name ? `Tu copia está lista, ${name}` : "Tu copia de datos está lista")}
     <p style="margin:0 0 16px 0;">Hemos preparado un archivo con todos tus datos personales, citas, pagos, mensajes y adjuntos. El enlace caduca el <strong>${escapeHtml(expira)}</strong> por seguridad.</p>
     ${button("Descargar mi copia", data.signed_url)}
     <p style="margin:16px 0 0 0;font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${COLORS.inkSoft};">Si el enlace caduca, puedes solicitar una nueva exportación desde tu portal en cualquier momento.</p>`,
    { preheader: "Tu exportación RGPD está lista.", appUrl: data.app_url },
  );
  const text = appendPlainTextEmailFooter(
    `Tu copia de datos está lista.\nEnlace (caduca ${expira}): ${data.signed_url}\n\nSi caduca, puedes solicitar otra desde ${data.app_url}/portal/ajustes`,
    data.app_url
  );
  return { subject: "Tu copia de datos RGPD está lista", html, text };
}
