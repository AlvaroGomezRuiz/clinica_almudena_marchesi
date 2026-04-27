# Producto — Plataforma Clínica Almudena Marchesi

> Última actualización: 2026-04-27

## Stack tecnológico

| Capa         | Tecnología                                                        |
|--------------|-------------------------------------------------------------------|
| Frontend     | Next.js 14 (App Router), React 18, Tailwind CSS — Vercel (UE)    |
| Backend      | Supabase: Postgres + RLS, Auth, Storage, Realtime, Edge Functions |
| Pagos        | Stripe (Checkout + Payment Element embebido)                      |
| Emails       | Resend vía Edge Functions (DKIM, SPF, templates HTML)             |
| Observabilidad | Sentry (`@sentry/nextjs`, region EU)                            |

---

## Módulos entregados

### Web pública

| Página              | Ruta                | Descripción                                     |
|---------------------|---------------------|-------------------------------------------------|
| Inicio              | `/`                 | Landing con secciones editoriales y CTA          |
| Enfoque             | `/enfoque`          | Metodología terapéutica                          |
| Servicios           | `/servicios`        | Catálogo de terapias y bonos                     |
| Sobre mí            | `/sobre-mi`         | Perfil profesional de la terapeuta               |
| Contacto            | `/contacto`         | Formulario y datos de contacto                   |
| Legales             | `/aviso-legal`      | Aviso legal, privacidad, cookies                 |
| Registro paciente   | `/registro-paciente`| Auto-registro con OTP + ficha clínica cifrada    |
| Login               | `/login`            | Acceso con email + contraseña                    |

### Portal del paciente (`/portal`)

| Funcionalidad       | Descripción                                                       |
|---------------------|-------------------------------------------------------------------|
| Citas               | Reserva online, calendario visual, cancelación (>48h)             |
| Pagos y bonos       | Historial, compra de bonos, facturas PDF descargables             |
| Mensajería          | Chat en tiempo real con adjuntos y notas de voz                   |
| Recursos            | Material terapéutico asignado (PDF, audio, vídeo)                 |
| Ajustes             | Tema, notificaciones, solicitudes RGPD                            |
| Bienvenida          | Gate de onboarding hasta primera cita o pago                      |

### Panel de administración (`/admin`)

| Funcionalidad       | Descripción                                                       |
|---------------------|-------------------------------------------------------------------|
| Agenda              | Vista semanal, bloqueos, plantillas horarias                      |
| Pacientes           | Ficha clínica cifrada, búsqueda blind index, edición por sección  |
| Ficha clínica       | Diagnósticos, medicación, notas de sesión (todo cifrado AES-256)  |
| Mensajería          | Bandeja de conversaciones, misma lógica de cifrado                |
| Facturación         | KPIs, exportación CSV, asignación manual de bonos                 |
| Recursos            | Subida, asignación a pacientes, visor integrado                   |
| Configuración       | MFA, preferencias, logs de acceso                                 |

---

## Flujos principales

### Registro del paciente

1. Paciente rellena datos clínicos en `/registro-paciente`
2. Server Action almacena en cookies httpOnly (TTL 15 min) + envía OTP
3. Paciente introduce código + define contraseña (≥14 caracteres)
4. RPC `paciente_autoregistro_cifrada` crea ficha completa cifrada
5. Email de bienvenida automático

### Reserva de cita

1. Paciente selecciona día y hora en `/portal/citas/reservar`
2. RPC `obtener_disponibilidad` genera slots reales (descontando bloqueos)
3. Si tiene bono activo → cita confirmada + sesión consumida
4. Si no → pago vía Payment Element embebido (Stripe)
5. Webhook confirma pago → cita pasa a `confirmada`
6. Email de confirmación automático

### Chat en tiempo real

1. RPC `chat_mi_conversacion()` crea o recupera la conversación
2. Suscripción a `postgres_changes` en Supabase Realtime
3. Envío vía RPC `chat_enviar_mensaje` (cifrado + permisos)
4. UI optimistic con reemplazo al llegar el evento Realtime

### Pagos con Stripe

1. Payment Element embebido (PCI-compliant, tarjetas nunca tocan servidor)
2. Webhook verifica firma HMAC-SHA256 + procesa con RPC idempotente
3. Tabla `stripe_events` para auditoría y replay
4. Métodos: tarjeta, Apple/Google Pay, Klarna, SEPA (según dashboard)

---

## Emails transaccionales

| Tipo                 | Disparador                           | Momento    |
|----------------------|--------------------------------------|------------|
| `booking_confirmed`  | Cita confirmada (pago o bono)        | Inmediato  |
| `reminder_48h`       | Cron horario                         | ~48h antes |
| `reminder_24h`       | Cron horario                         | ~24h antes |
| `booking_cancelled`  | Cancelación (admin o paciente)       | Inmediato  |
| `nueva_asignacion`   | Recurso asignado desde admin         | Inmediato  |
| `welcome`            | Alta de paciente                     | Inmediato  |
| `bono_comprado`      | Compra de bono completada            | Inmediato  |

---

## Dominio canónico

**Producción:** `https://ampsicologia.es`
**Contacto:** `contacto@ampsicologia.es`
