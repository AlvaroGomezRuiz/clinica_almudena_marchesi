# Clínica Almudena — Checklist maestro de testing

Documento vivo con **todos los tests manuales y automáticos** pendientes para el repaso general final (pre-producción).

> Orden recomendado: primero los smoke tests rápidos del happy path (sección 1), luego casos borde y seguridad (sección 2), y finalmente performance/a11y/SEO (sección 3).

---

## 0. Setup de entorno de pruebas

- [ ] `.env.local` de `frontend/` apunta al **proyecto Supabase de staging** (no el de prod).
- [ ] Stripe en **test mode** (claves `sk_test_...`, `pk_test_...`, webhook secret `whsec_...`).
- [ ] Resend en modo **sandbox**: dominio verificado o reenvío a email propio.
- [ ] `CRON_SECRET` coincide entre Supabase Dashboard y `pg_cron` job.
- [ ] Seed demo aplicado (`0008_seed_demo.sql`) y usuarios creados:
  - `almudena@admin.com` / `Almudena2026!`
  - `usuario@visualizacion.com` / `Usuario2026!`
- [ ] Edge Functions desplegadas:
  - `send-email`, `cron-recordatorios-24h`, `stripe-checkout`, `stripe-webhook`, `cancel-cita`, `assign-recurso`, `resend-webhook`.
- [ ] Migraciones aplicadas hasta `0020_rgpd_exports.sql` incluida.
- [ ] Edge Functions adicionales desplegadas: `invoice-pdf`, `rgpd-request`, `stripe-payment-intent`.
- [ ] Buckets Storage creados: `avatares`, `recursos`, `chat-adjuntos`, `paciente-adjuntos`, `rgpd-exports`.
- [ ] Variables de entorno emisor factura: `FACTURA_EMISOR_NOMBRE`, `FACTURA_EMISOR_NIF`, `FACTURA_EMISOR_DIRECCION`, `FACTURA_EMISOR_CP_CIUDAD`, `FACTURA_EMISOR_EMAIL`.

---

## 1. Smoke tests — Happy path

### 1.1 Autenticación y RBAC
- [ ] Login admin → redirige a `/admin`.
- [ ] Login paciente → redirige a `/portal`.
- [ ] Paciente no puede acceder a `/admin/*` (middleware debe redirigir).
- [ ] Admin sí puede acceder a `/portal/*` (modo "vista paciente", si se habilita).
- [ ] Logout limpia cookie de Supabase y vuelve a `/login`.

### 1.2 Chat realtime
- [ ] Abrir `/portal/mensajes` (paciente) y `/admin/mensajes/[id]` (admin) en dos ventanas.
- [ ] Enviar desde paciente → aparece optimista e instantáneo en admin (<1s).
- [ ] Enviar desde admin → idem al paciente.
- [ ] Marcar como leído en admin → contador rojo desaparece en `/admin/mensajes`.
- [ ] Recargar → historial intacto y ordenado cronológicamente.
- [ ] Scroll automático al fondo al enviar / al recibir cuando el usuario ya está abajo.
- [ ] Si el usuario había hecho scroll arriba, llega un mensaje → botón "↓ nuevo mensaje" visible sin forzar scroll.

### 1.3 Reserva de cita
- [ ] `/portal/citas/reservar` → seleccionar servicio → seleccionar día → aparecen slots.
- [ ] Reservar slot **con bono activo** → cita queda `confirmada`, bono decrece una sesión, llega email `booking_confirmed`.
- [ ] Reservar slot **sin bono** → redirige a Stripe Checkout.
- [ ] Completar pago en Stripe (tarjeta `4242 4242 4242 4242`) → webhook confirma cita, llega email `booking_confirmed`.
- [ ] Cancelar en Stripe → redirige a `/portal/pagos/cancel`, slot sigue reservado temporalmente y expira.
- [ ] Dos navegadores reservando el **mismo slot** simultáneamente → solo uno gana, el otro recibe `slot_ocupado` y refresca.

### 1.4 Pagos Stripe
- [ ] Compra de bono desde `/portal/pagos` → redirección a Stripe → pago OK → aparece en `bonos_pacientes`.
- [ ] Pago cita sin bono (ver 1.3) → `pagos.estado = 'completado'`.
- [ ] Tarjeta rechazada (`4000 0000 0000 0002`) → `pagos.estado = 'fallido'`, email no se envía.
- [ ] Tarjeta 3DS (`4000 0025 0000 3155`) → reto mostrado, pago completa tras OK.
- [ ] Webhook `checkout.session.completed` **duplicado** (replay con Stripe CLI) → idempotente, no duplica pago ni bono.

### 1.5 Emails transaccionales
- [ ] Registro paciente → llega `welcome` con enlace confirmación.
- [ ] Reserva confirmada → `booking_confirmed` con datos correctos (fecha, hora, servicio).
- [ ] 24h antes de cita → `reminder_24h` (disparado por `pg_cron`).
- [ ] Cancelación → `booking_cancelled` con motivo y estado reembolso.
- [ ] Asignación de recurso → `nueva_asignacion` con link al recurso.
- [ ] Paciente desactiva `reminders_enabled` en `/portal/ajustes` → no llega recordatorio 24h.

### 1.6 Cancelación de cita
- [ ] Paciente cancela cita >24h antes → sin cargo, bono devuelto (si lo había), email `booking_cancelled`.
- [ ] Paciente cancela cita <24h antes → advertencia visible, pago no reembolsado.
- [ ] Admin cancela cualquier cita → siempre puede forzar reembolso total desde UI.
- [ ] Reembolso parcial Stripe → aparece en `pagos.metadata.refund_id`, email notifica monto.

### 1.7 Recursos
- [ ] Admin sube recurso → aparece en `/admin/recursos`.
- [ ] Admin asigna recurso a paciente → aparece en `/portal/recursos`, email `nueva_asignacion` llega.
- [ ] Paciente descarga recurso → audit log registra evento.

### 1.8 Auto-registro
- [ ] Usuario anónimo → `/registro-paciente` → rellena form + acepta RGPD → recibe email de verificación.
- [ ] Click en enlace de verificación → `/auth/callback?code=...` intercambia sesión, dispara welcome, redirige a `/portal`.
- [ ] Sin verificar email → no puede acceder a `/portal` (middleware bloquea).
- [ ] Intento de registro con email ya existente → mensaje genérico sin leak de info (no "ya existe" literal).
- [ ] Honeypot field (`company`) relleno por bot → submit silencioso, sin crear cuenta.
- [ ] Enlace "¿Primera vez? Crear cuenta" visible en `/login`.

### 1.9 Webhook Resend (bounces / complaints)
- [ ] Config `RESEND_WEBHOOK_SECRET` presente en Supabase Edge Secrets.
- [ ] Webhook Resend apunta a `https://<project>.supabase.co/functions/v1/resend-webhook`.
- [ ] Evento `email.bounced` (hard) → fila en `email_webhook_events`, `notificaciones_prefs.<tipo> = false` en el usuario afectado.
- [ ] Evento `email.complained` → idem con `action_taken = 'opt_out_complaint'`.
- [ ] Evento `email.delivered` → fila en `email_webhook_events`, sin cambios en `notificaciones_prefs`.
- [ ] Replay mismo `svix-id` → idempotente, no duplica.
- [ ] Firma Svix alterada → 401, ningún efecto secundario.

### 1.10 Tema claro / oscuro y glow
- [ ] `ThemeToggle` visible en `PortalShell` (paciente) y `AdminShell`.
- [ ] Al cambiar tema: persiste tras recarga (cookie `theme` o `localStorage` vía `next-themes`).
- [ ] `prefers-color-scheme: dark` del SO → tema oscuro cargado en primera visita.
- [ ] Sin *flash* (FOUC) al navegar entre rutas.
- [ ] Clase `.glow-card` se activa en hover: halo difuso, no mueve el layout.
- [ ] Contraste WCAG AA en ambos temas (texto normal y bordes de botones).
- [ ] Color de enlaces y `focus-ring` visibles en dark.

### 1.11 Agenda admin ampliada
- [ ] `/admin/agenda` vista semanal: grid 7 cols × franjas horarias, citas posicionadas por `inicio`.
- [ ] Vista diaria: click en un día muestra lista cronológica con servicio y paciente.
- [ ] Vista mensual: badges de carga por día (verde <50 %, ámbar 50-80 %, rojo >80 %).
- [ ] Bloquear día completo → ninguna reserva nueva en ese día; citas existentes siguen visibles.
- [ ] Plantilla de horario (`horario_plantillas`) aplicada a semana futura → slots generados.
- [ ] Cambiar plantilla no rompe citas ya confirmadas.

### 1.12 Ficha clínica paciente
- [ ] `/admin/pacientes/[id]` carga diagnóstico, medicación, notas, adjuntos.
- [ ] Botón "ojo" por campo sensible alterna texto en claro / oculto, con log en `admin_lookups`.
- [ ] Timeline cronológico (citas + notas + pagos) ordena descendente.
- [ ] Exportar PDF/CSV de la ficha completa → descarga correcta.
- [ ] Subir adjunto (`paciente-adjuntos`) → storage privado, firma de URL al abrirse.

### 1.13 Chat con adjuntos
- [ ] Adjuntar PDF o imagen en `/portal/mensajes` → aparece en la conversación con icono adecuado.
- [ ] Admin ve el adjunto, al click firma URL por 5 min.
- [ ] `chat-adjuntos` bucket es privado, sin acceso público.
- [ ] Mensaje solo-adjunto (sin texto) → se crea con placeholder (p. ej. "📎 Archivo adjunto").

### 1.14 Facturación admin
- [ ] `/admin/facturacion` muestra KPIs (ingresos mes, pagos pendientes, bonos activos).
- [ ] Reporte mensual con filtro de mes → tabla de todos los pagos del período.
- [ ] Exportar CSV → descarga con cabeceras (`fecha`, `paciente`, `concepto`, `importe`, `metodo`, `factura_num`).
- [ ] Gestión de bonos: alta, edición, baja desde UI sin SQL directo.

### 1.15 Recursos admin
- [ ] `/admin/recursos` tabs: Tareas, Lecturas, Legales, Misceláneos.
- [ ] Subir archivo o URL externa → aparece en la pestaña correcta.
- [ ] Marcar como `publico = true` → visible en `/portal/recursos` → Biblioteca general.
- [ ] Asignar recurso a paciente → aparece en `/portal/recursos` → Para ti.

### 1.16 Configuración admin (MFA + cifrado)
- [ ] `/admin/configuracion` muestra estado MFA real (`auth.mfa.listFactors`).
- [ ] Activar TOTP → QR visible, flujo de enrolamiento funciona.
- [ ] Logs de `admin_lookups` visibles con paginación.
- [ ] Subir avatar admin → bucket `avatares` con URL firmada en UI.

### 1.17 Portal inicio + citas + reservar
- [ ] `/portal` dashboard: próxima cita, sesiones restantes, últimos mensajes sin leer.
- [ ] `/portal/citas`: filtros "próximas" / "pasadas" / "canceladas".
- [ ] Crear / editar / borrar nota paciente en cita → visible para admin.
- [ ] Cada cita muestra coste y método de pago cuando existe.
- [ ] `/portal/citas/reservar`: calendario mensual, resumen a la derecha, CTA claro.

### 1.18 Portal mensajes con adjuntos
- [ ] Botón `+` adjuntar → input de archivo (PDF, imagen).
- [ ] Upload optimista + barra progreso.
- [ ] Error de upload (bucket lleno, tipo inválido) → mensaje claro, sin bloqueo.

### 1.19 Portal recursos
- [ ] Tabs `Para ti` / `Biblioteca general` / `Legal y RGPD` con contador.
- [ ] Descarga redirige a `/api/portal/recursos/download/[id]` y devuelve 302 a URL firmada.
- [ ] Recurso con `external_url` abre en nueva pestaña sin firmar URL.
- [ ] Paciente no puede descargar recurso que no le ha sido asignado ni es `publico`.

### 1.20 Portal pagos (Payment Element + facturas)
- [ ] `/portal/pagos` agrupa histórico por mes (descendente).
- [ ] Icono método de pago correcto (💳 card, 🟣 Klarna, 🍎 Apple Pay, 🔵 Google Pay, 🔄 SEPA).
- [ ] Comprar bono → Stripe Checkout (o Payment Element si migrado) con `automatic_payment_methods`.
- [ ] Tras pago OK → bono aparece en "Bonos activos" con barra de progreso.
- [ ] Botón "Descargar factura" en pago `completado` → PDF A4 con nº de factura, IVA exento, emisor y receptor correctos.
- [ ] Factura descargada dos veces → mismo `numero_factura` (no duplicar numeración).

### 1.21 Portal ajustes (RGPD + baja)
- [ ] Editar avatar + nombre → refleja inmediatamente en header.
- [ ] Cambiar tema, notificaciones, `privacy_mode_default` → persiste tras logout.
- [ ] Solicitar derecho RGPD (export / rectif / portab / limitac / oposic) → fila en `rgpd_requests`, email `rgpd_ack`.
- [ ] Admin ejecuta `rgpd-request` en modo `execute` para tipo `exportar` → bucket `rgpd-exports` contiene JSON, email `rgpd_export_ready` con URL firmada.
- [ ] Solicitar baja → fila RGPD tipo `borrado`, email ack, estado `pendiente`.
- [ ] Histórico de solicitudes visible con estado y fecha límite (30 días).

### 1.22 Edge Function invoice-pdf
- [ ] Invocación directa con `pago_id` válido y JWT del paciente → PDF válido (descargable).
- [ ] Pago sin `numero_factura` → RPC asigna uno y PDF lo muestra.
- [ ] Paciente A solicitando factura de pago de paciente B → 403.
- [ ] Admin puede solicitar factura de cualquier pago.
- [ ] Dos descargas simultáneas del mismo pago → mismo nº (advisory lock).

### 1.23 Edge Function rgpd-request
- [ ] Modo `ack` por el propio usuario → status `en_revision`, `fecha_limite = now + 30d`.
- [ ] Modo `execute` solo permitido con rol admin → 403 si paciente.
- [ ] Export JSON contiene: perfil, citas, pagos, bonos, mensajes (texto plano de `body` nullable), recursos, notas.
- [ ] Firma URL export caduca en 7 días (`export_expires_at`).

### 1.24 Edge Function stripe-payment-intent
- [ ] POST `kind=cita` → devuelve `client_secret` válido (empieza por `pi_..._secret_...`).
- [ ] POST `kind=bono` → idem.
- [ ] Importe del PI coincide con el de la RPC `preparar_checkout_*`.
- [ ] Metadata contiene `kind`, `user_id` y (`cita_id` | `bono_config_id`).
- [ ] `payment_intent.succeeded` llega al webhook → `pagos` registra el pago y (si `kind=cita`) confirma la cita.
- [ ] Webhook no duplica el pago si ya existía pago con mismo `stripe_payment_intent` (por carrera entre `checkout.session.completed` y `payment_intent.succeeded`).

---

## 2. Casos borde y seguridad

### 2.1 RLS (Row Level Security)
- [ ] Paciente A intenta leer `citas` de paciente B vía API directa (curl con su JWT) → 0 filas.
- [ ] Paciente intenta insertar cita para otro paciente → `new row violates row-level security policy`.
- [ ] Paciente intenta `UPDATE` directo en `bonos_pacientes.sesiones_consumidas` → denegado.
- [ ] Admin puede ver todo (`role = 'admin'` en `profiles`).

### 2.2 Webhooks
- [ ] Stripe webhook con firma inválida → 401, evento NO se procesa.
- [ ] Stripe webhook con body modificado pero firma válida previa → 401.
- [ ] Resend webhook con `svix-signature` inválida → 401.
- [ ] Replay de `checkout.session.completed` (mismo `event.id`) → idempotente (dedupe vía `stripe_events`).
- [ ] Replay de `email.bounced` → idempotente (dedupe vía `emails_log`).

### 2.3 Rate limiting y abuso
- [ ] 6+ intentos de login fallidos → Supabase Auth bloquea temporalmente.
- [ ] 10+ registros desde misma IP en 1h → rate-limit (Supabase Auth config).
- [ ] Spam de mensajes >20/min de un paciente → considerar rate-limit a nivel RPC (opcional).

### 2.4 Concurrencia
- [ ] Dos admins editan el mismo perfil paciente → último-gana (sin locking optimista implementado, verificar comportamiento).
- [ ] `obtener_disponibilidad` y `reservar_cita` concurrentes → `EXCLUDE USING gist` previene doble booking.

### 2.5 Datos sensibles y RGPD
- [ ] `body_ciphertext` en `mensajes` nunca aparece en logs de Supabase/Vercel.
- [ ] PII nunca en logs de error (verificar Sentry si se integra).
- [ ] Usuario solicita borrado → flujo RGPD elimina datos y mantiene audit log anonimizado.
- [ ] Firmas de consentimiento (`consentimientos_rgpd`) almacenadas en bucket privado con URLs firmadas.

### 2.6 Validación de inputs
- [ ] Reservar cita con `fecha < now()` → rechazado por constraint o RPC.
- [ ] Enviar mensaje vacío → rechazado por RPC (`length > 0`).
- [ ] Registrar con email no-email → rechazado por Supabase Auth.
- [ ] Upload de recurso > 50 MB → rechazado por bucket policy.
- [ ] Upload de adjunto chat > 10 MB → rechazado.
- [ ] Upload a `paciente-adjuntos` con MIME distinto a PDF/imagen → rechazado.

### 2.7 Storage y URLs firmadas
- [ ] `avatares`: solo el propietario puede escribir/sobrescribir su avatar.
- [ ] `recursos`: paciente solo accede a asignados o `publico=true`.
- [ ] `chat-adjuntos` y `paciente-adjuntos`: privados, acceso solo vía signed URL (5-10 min).
- [ ] `rgpd-exports`: acceso solo del usuario dueño, signed URL 7 días.
- [ ] URL firmada expirada → 403 sin leak del contenido.

### 2.8 Cifrado y datos sensibles
- [ ] Columnas `*_ciphertext` nunca devueltas en endpoints públicos.
- [ ] RPC `registrar_consulta_sensible` registra evento en `admin_lookups` con `admin_id` + `paciente_id` + `campo`.
- [ ] Revisar `admin_lookups` en Supabase: no hay lookups huérfanos (admin consultando sin motivo).

### 2.9 Factura e impuestos
- [ ] Serie de facturación anual (`A-2026-0001`, `A-2026-0002`, ...) correlativa sin huecos.
- [ ] Dos pagos en 2025 y 2026 → cada año empieza en `-0001`.
- [ ] Concurrencia: 5 descargas simultáneas de pagos distintos → números consecutivos únicos (advisory lock).
- [ ] IVA exento visible con texto legal (art. 20 LIVA) en PDF.
- [ ] NIF emisor y receptor correctos.

---

## 3. Performance, accesibilidad y SEO

### 3.1 Performance (Vercel Analytics / Lighthouse)
- [ ] Home pública LCP < 2.5s (móvil 3G).
- [ ] `/portal` LCP < 3.0s con seed demo.
- [ ] `/admin` LCP < 3.5s.
- [ ] TTI < 4s en todas las rutas públicas.
- [ ] Bundle JS inicial < 200 KB gzip por ruta.
- [ ] Imágenes servidas vía `next/image` con `priority` solo en hero.

### 3.2 Accesibilidad (WCAG 2.2 AA)
- [ ] Navegación completa por teclado en `/portal` y `/admin` (Tab, Shift+Tab, Enter, Esc).
- [ ] Focus ring visible en todos los elementos interactivos.
- [ ] Contraste >=4.5:1 en texto normal y >=3:1 en texto grande — verificar en ambos temas (claro y oscuro).
- [ ] Todos los `img` tienen `alt` descriptivo (o `alt=""` si decorativo).
- [ ] Formularios con `<label>` asociado a cada input.
- [ ] Mensajes de error ARIA-live.
- [ ] Screen reader (NVDA/VoiceOver) anuncia correctamente el login y el chat.
- [ ] `prefers-reduced-motion` respetado (`.glow-card` sin animación, `ThemeToggle` sin transición).
- [ ] `ThemeToggle` anunciado como `role="switch"` con `aria-checked`.
- [ ] Tabs (`/portal/recursos`, `/admin/recursos`) son `role="tablist"` con flechas ←/→.

### 3.3 SEO
- [ ] Meta title y description únicos por ruta pública.
- [ ] OG tags (`og:title`, `og:description`, `og:image`).
- [ ] `sitemap.xml` generado y accesible.
- [ ] `robots.txt` bloquea `/admin` y `/portal`.
- [ ] Structured data `LocalBusiness` + `MedicalClinic` en home.
- [ ] Canonical URLs en todas las páginas públicas.

### 3.4 Observabilidad
- [ ] Logs de Edge Functions revisados sin errores inesperados en las últimas 24h.
- [ ] Dashboard Supabase: queries lentas < 500ms P95.
- [ ] `emails_log`: tasa de `sent` vs `failed` > 98%.
- [ ] `stripe_events`: todos los events procesados (sin pendientes >5min).
- [ ] `rgpd_requests`: sin solicitudes con `fecha_limite < now` y estado != `resuelta` (alerta).
- [ ] `admin_lookups`: revisión semanal de patrones anómalos (un admin consultando muchos pacientes).
- [ ] `pagos` sin `numero_factura` y `estado = 'completado'` > 24h → investigar.

---

## 4. Tests automáticos (opcional — roadmap)

Sugerencia de suite mínima cuando se priorice:

- **Playwright E2E** (ver `.agents/skills` Playwright disponible):
  - `auth.spec.ts` — login admin + paciente.
  - `booking.spec.ts` — flujo completo reserva con bono y sin bono.
  - `chat.spec.ts` — envío y recepción en tiempo real (dos browser contexts).
  - `cancelacion.spec.ts` — cancelar cita y verificar email + reembolso.
- **Vitest/Jest** unit:
  - Templates HTML emails — snapshot.
  - Parsing de `verifyWebhookSignature` (Stripe + Resend).
  - Utilidades `formatDateEs`, `formatTimeEs`.
- **pgTAP** para RPCs y RLS:
  - `chat_enviar_mensaje` — happy path + bloqueo RLS.
  - `reservar_cita` — concurrencia con `pg_sleep`.
  - `procesar_pago_stripe` — idempotencia con replay.
  - `cancelar_cita` — reembolso y restauración de bono.

---

## 5. Checklist de release (go-live)

- [ ] Rotar todas las claves Supabase (anon + service_role).
- [ ] Stripe en **live mode** con webhooks apuntando a prod.
- [ ] Resend con dominio verificado (SPF + DKIM + DMARC).
- [ ] Vercel: project settings → "Preview Comments" OFF en prod.
- [ ] Backup automático Supabase activado (PITR).
- [ ] Rate limits de Supabase Auth ajustados (5 signups/h/IP).
- [ ] `SUPABASE_SERVICE_ROLE_KEY` solo como variable de entorno en Vercel, nunca en código cliente.
- [ ] Política de retención de logs definida (`audit_log` > 2 años; `stripe_events` > 7 años por obligaciones contables).
- [ ] Documento de incidentes / plan de contingencia redactado.
- [ ] Variables emisor factura (`FACTURA_EMISOR_*`) configuradas en Supabase Edge Secrets de producción.
- [ ] `STRIPE_WEBHOOK_SECRET` rotado tras cambio de endpoint.
- [ ] Webhook Stripe configurado para escuchar: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `payment_intent.succeeded`, `payment_intent.payment_failed`.
- [ ] Primera factura de prueba en live mode verificada por asesoría fiscal (numeración, IVA, NIF).
- [ ] Pruebas de restauración de backup PITR realizadas al menos una vez.
- [ ] Plan de respuesta a solicitud RGPD documentado (quién ejecuta `rgpd-request` en `execute`).

---

_Última actualización: automática al modificar features. Añade aquí cualquier nuevo test antes del repaso final._
