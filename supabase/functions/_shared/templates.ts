// Plantillas HTML transaccionales inline-styled (email clients no soportan CSS extern)
// Paleta alineada con "Serenity Moncloa" de la web pública.
// Tipografía: system stack (Georgia/serif + Helvetica/sans) — máxima compatibilidad.

const COLORS = {
  parchment: "#F3E9DD",
  ink:       "#1E1B18",
  inkSoft:   "#4A4640",
  sage:      "#6B8A7A",
  sageDark:  "#4F6B5C",
  warm:      "#C99463",
  hairline:  "rgba(30,27,24,0.12)",
} as const;

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
  const safePreheader = escapeHtml(preheader);
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>Clínica Almudena Marchesi</title>
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
                <span style="display:inline-block;margin-left:12px;vertical-align:middle;font-family:Georgia,serif;font-size:18px;letter-spacing:0.02em;color:${COLORS.ink};">Almudena Marchesi Fernández</span>
              </td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:32px 40px 40px 40px;font-size:16px;line-height:1.65;color:${COLORS.ink};">
          ${inner}
        </td></tr>
        <tr><td style="padding:24px 40px 32px 40px;border-top:1px solid ${COLORS.hairline};font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:${COLORS.inkSoft};">
          <p style="margin:0 0 6px 0;">Clínica Almudena Marchesi Fernández · Colegiada nº M-30815</p>
          <p style="margin:0 0 6px 0;">Calle de Moncloa, Madrid · <a href="tel:+34600000000" style="color:${COLORS.inkSoft};text-decoration:none;">+34 600 000 000</a></p>
          <p style="margin:0;">Has recibido este correo porque eres paciente de la consulta. <a href="${appUrl}/portal/ajustes" style="color:${COLORS.sageDark};">Gestionar notificaciones</a></p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0 0;font-family:Helvetica,Arial,sans-serif;font-size:11px;color:${COLORS.inkSoft};">© ${new Date().getFullYear()} Clínica Almudena Marchesi Fernández</p>
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
  const text = `${greeting}\n\nTu cuenta en la Clínica Almudena Marchesi Fernández está activa.\nAccede al portal: ${data.app_url}/portal\n\nSi no esperabas este correo, ignóralo.`;
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
     <p style="margin:16px 0 0 0;font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${COLORS.inkSoft};">¿Necesitas cambiar la fecha? Puedes hacerlo desde el portal con al menos 24h de antelación.</p>`,
    { preheader: `${data.servicio} · ${fecha} · ${hora}`, appUrl: data.app_url },
  );
  const text = `Reserva confirmada\n\n${data.servicio}\n${fecha} a las ${hora} (${data.duracion_min} min)\n\nGestionar citas: ${data.app_url}/portal/citas`;
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
    `${eyebrow("Recordatorio 24 horas")}
     ${h1(name ? `Te espero mañana, ${name}` : "Tu sesión es mañana")}
     <p style="margin:0 0 20px 0;">Te escribo para recordarte tu sesión de mañana. Si necesitas reprogramarla, avísame lo antes posible.</p>
     <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 8px 0;">
       ${detailRow("Servicio", data.servicio)}
       ${detailRow("Fecha", fecha)}
       ${detailRow("Hora", `${hora} (${data.duracion_min} min)`)}
     </table>
     ${button("Ver detalle en el portal", `${data.app_url}/portal/citas`)}
     <p style="margin:16px 0 0 0;font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${COLORS.inkSoft};">Recuerda llegar unos minutos antes. Un fuerte abrazo.</p>`,
    { preheader: `Mañana a las ${hora} · ${data.servicio}`, appUrl: data.app_url },
  );
  const text = `Recordatorio: mañana tienes sesión.\n\n${data.servicio}\n${fecha} a las ${hora} (${data.duracion_min} min)\n\nVer detalle: ${data.app_url}/portal/citas`;
  return { subject: `Recordatorio: tu sesión de mañana a las ${hora}`, html, text };
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
  const text = `Cita cancelada.\n\n${data.servicio}\n${fecha} a las ${hora}\n\nReservar de nuevo: ${data.app_url}/portal/citas/reservar`;
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
  const text = `Nuevo recurso asignado: ${data.titulo_recurso} (${data.tipo_recurso})\n\nVer en el portal: ${data.app_url}/portal/recursos`;
  return { subject: `Nuevo recurso: ${data.titulo_recurso}`, html, text };
}
