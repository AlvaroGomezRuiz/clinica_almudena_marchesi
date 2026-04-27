# Cronología e hitos técnicos

> Línea temporal de decisiones y entregas. Para el estado operativo actual (checklist, secrets, dominio) ver `docs/00_proyecto/estado-y-pendientes.md`.  
> **Gastos de herramientas y dominio** (facturables aparte del tiempo de ingeniería): `docs/00_proyecto/costes-herramientas.md`.

---

## Hito 0 — Arranque de este ciclo (7 abr 2026)

- Fecha registrada como **inicio del trabajo concentrado** en el repositorio y producto entregable actual (sprint de ingeniería hacia producción).
- No invalida por sí sola los hitos siguientes: parte del diseño y del código **reutiliza o evoluciona** decisiones anteriores (p. ej. elección inicial de Next.js o migraciones numeradas).

## Hito 1 — Fundacion (Q4 2025)

- Stack inicial: Next.js 14 (App Router) + FastAPI + MySQL + Docker *(MySQL y Docker retirados en Hito 12 — ver abajo)*.
- Autenticacion propia basada en JWT emitido por FastAPI.
- Landing publica basica, dashboard admin rudimentario.

## Hito 2 — Blindaje de seguridad

- Sentry instrumentado sin PII (`send_default_pii = false`).
- Secretos movidos a `.env` fuera del repo.
- Docker Compose parametrizado con `env_file`.
- Scripts backend eliminan credenciales hardcodeadas.
- Focus visible WCAG restaurado en frontend.
- `robots.ts` + `sitemap.ts` de Next.js App Router.

## Hito 3 — Cifrado y contratos estrictos (FastAPI)

- Fernet (AES-128) + blind indexes HMAC-SHA256 via SQLAlchemy `TypeDecorator`.
- Pydantic v2 con `extra="forbid"` en todos los schemas.
- Contratos TypeScript espejo en `frontend/src/contracts/`.
- API v1 de citas con proteccion anti-solape + JWT.

## Hito 4 — Migracion a Supabase como backend principal

Decision arquitectonica: se sustituye FastAPI + MySQL + Docker por **Supabase (Postgres + Auth + Storage + Realtime + Edge Functions)**. Motivos:

- Zero servers que mantener.
- RLS nativo Postgres ⇒ autorizacion en la fila, no en la app.
- Realtime WebSocket out-of-the-box.
- Edge Functions Deno para webhooks / crons.
- Plan Free cubre el volumen esperado (<10 GB DB, <500k filas).

FastAPI queda **stand-by** en `backend/` por si el cliente quiere replegarse.

## Hito 5 — Migraciones SQL 0001..0011

- `0001_init.sql`: enums, tablas, triggers, indices.
- `0002_rls.sql`: policies canonicas (`*_self_*`, `*_admin_all`).
- `0003_storage.sql`: buckets `recursos`, `firmas-rgpd`, `avatares`, `chat-adjuntos`, `paciente-adjuntos`.
- `0004_realtime.sql`: publication + replica identity.
- `0005_seed_servicios.sql`: catalogo base.
- `0006_chat.sql`: RPCs `chat_mi_conversacion`, `chat_enviar_mensaje`, `chat_marcar_leidos`.
- `0007_disponibilidad.sql`: `horarios_clinica` + `obtener_disponibilidad` + `reservar_cita`.
- `0008_seed_demo.sql`: usuarios y datos de demo.
- `0009_email.sql`: `emails_log`, `notificaciones_prefs`, `pg_cron` horario.
- `0010_stripe.sql`: `bonos_config`, `stripe_events`, `procesar_pago_stripe`.
- `0011_audit_hashchain.sql`: auditoria tamper-evident SHA-256.

## Hito 6 — Edge Functions + integraciones

- `send-email` + `cron-recordatorios-24h` (Resend).
- `stripe-checkout` + `stripe-webhook` (Stripe hosted).
- `cancel-cita`, `assign-recurso`, `resend-webhook`.
- Bundler propio (`supabase/scripts/bundle_for_deploy.mjs`) para inlinear `_shared/`.
- Smoke tests (`supabase/scripts/smoke_test.mjs`).

## Hito 7 — Migraciones 0012..0021 (sprint producto)

- `0012_auditoria_ficha_clinica`: registro accesos sensibles.
- `0013_chat_rgpd_preferencias_retry`.
- `0014_horario_plantillas_retry`.
- `0015_agenda_bloqueos_metadata`.
- `0016_ficha_mvp_plaintext_retry`.
- `0017_citas_notas_plaintext_mvp`.
- `0018_recursos_publico`.
- `0019_facturas`: numeracion correlativa + serie anual.
- `0020_rgpd_exports`: export JSON firmado.
- `0021_security_lints_fix`: `security_invoker=true` + `search_path` fijo.

## Hito 8 — F5 Cifrado real

- `0022_cifrado_setup`: pgcrypto + supabase_vault + `app_encrypt`/`app_decrypt`/`app_bidx`.
- `0023_cifrado_rpcs_crud`: CRUD cifrado para pacientes + diagnosticos + medicacion + notas.
- `0024_auto_encrypt_triggers`: BEFORE INSERT/UPDATE triggers.
- `0024b_fix_nota_cita_upsert`: fix edge case unique.

## Hito 9 — Payment Element embebido

- `stripe-payment-intent` Edge Function.
- `PaymentElementDrawer` componente frontend con dark/light theme + locale `es`.
- Flujo in-page (sin redirect a Checkout hosted) para citas y bonos.
- `payment_intent.succeeded` anadido al webhook Stripe.

## Hito 10 — Sentry observabilidad

- Proyecto Sentry EU Frankfurt `o4511259694465024`.
- Tres proyectos: `frontend`, `backend` (FastAPI stand-by), `supabase-edge`.
- `beforeSend` redacta PII, DNI, IBAN, tarjetas.
- Tunnel `/monitoring` para evitar adblockers.
- Instrumentacion Edge manual via HTTP envelope.

## Hito 11 — Reorganizacion del repo (abril 2026)

- Renombrado `BACKEND/` → `backend/` y `FRONTEND/` → `frontend/`.
- Consolidacion `.DOCS/` + `docs/` en un unico `docs/` con seis carpetas numeradas (convención anterior en inglés).
- Limpieza scripts obsoletos.
- Reescritura `.gitignore` + `README.md`.
- Auditorías técnicas en `01_auditorias/` (`arquitectura`, `backend`, `frontend`, `base-de-datos`, `seguridad-rgpd`); informes: `02_informes/ejecutivo-cliente` y `valor-reposicion-software`.

## Hito 13 — Cierre pre-launch: UX admin + observabilidad + cleanup (22-abr-2026)

> Ejecutado en 5 fases secuenciales dejando explícitamente todo lo
> dependiente del dominio para el final del proyecto.

- **UX admin cifrada** (FASE 1):
  - Edición inline de campos sensibles en la ficha del paciente
    (`EditableSensitiveField` + `paciente_actualizar_cifrado`).
  - Nota post-sesión cifrada desde admin en el timeline
    (`NotaSesionAdminEditor` + `nota_cita_guardar_cifrada`, descifrado
    on-demand con auditoría minimal).
  - Búsqueda por DNI/email/teléfono con blind index HMAC
    (`paciente_buscar_por_campo`), detección automática de patrón.
- **Cleanup legacy** (FASE 2):
  - Retirada de `services/payments/` y `components/payments/` (flujo
    antiguo vía backend FastAPI). `/pagos` ahora redirige a
    `/citas/nueva` (Payment Element embebido).
  - `npm run build` limpio (42 páginas, 0 errores TS).
- **Observabilidad** (FASE 3):
  - Nueva Edge Function `health` que verifica `app_encryption_ready()`
    + conectividad DB, con `verify_jwt=false` para monitores externos.
  - `docs/05_operaciones/alertas-operativas.md` con 7 reglas Sentry,
    flujo de pago fallido (email paciente + admin), Resend webhook,
    monitor externo y matriz de responsabilidad.
- **Data hygiene** (FASE 4):
  - Migración idempotente `0028_retirar_seed_demo.sql` lista para
    ejecutar justo antes del go-live (limpia demo sin tocar admins).
- **Docs** (cierre de ronda 2026-04-22): `docs/03_ingenieria/roadmap.md` y `docs/00_proyecto/estado-y-pendientes.md`
  reflejan todo lo anterior; FASE FINAL (dominio) queda listada y
  pospuesta.

## Hito 12 — Retirada de MySQL (22-abr-2026)

- **Motivo**: la fuente de verdad unica es Supabase Postgres; mantener MySQL
  en paralelo solo duplicaba esquema y generaba deuda tecnica.
- **Eliminado**:
  - `docker-compose.yml` (servicio MySQL local).
  - `.env` raiz (credenciales `MYSQL_*`).
  - `pymysql` de `backend/requirements.txt`.
  - Logica `SET FOREIGN_KEY_CHECKS` de `backend/scripts/rebuild_system.py`
    (reemplazada por `DROP TABLE ... CASCADE` estandar Postgres).
- **Migrado**:
  - `backend/.env` ahora apunta a `postgresql+psycopg2://...` (Supabase o
    Postgres local) con `psycopg2-binary` como driver.
- **Resultado**: FastAPI stand-by queda con el mismo motor que produccion.
  Si algun dia se despliega, habla contra la misma base que Supabase sin
  puertas dobles.

## Hito 16 — GEO + dominio canónico + legales versionados (23-abr-2026)

- Dominio de producción canónico **`https://ampsicologia.es`** (metadata, URLs públicas, contacto `contacto@ampsicologia.es` donde aplique en código).
- `buildPublicPageMetadata`, JSON-LD `@graph` en home, `WebPage` + `dateModified` en páginas legales; versión legal **`2026-04-23-v1`**.
- Toolkit local **`.GEO/`**: script `run-geo-audit.ps1` + venv Python para auditorías reproducibles sobre URL o `sitemap.xml` (informes en `.GEO/reports/`).
- Documentación: `docs/03_ingenieria/geo-y-seo.md`; toolkit local `.GEO/` (si el clon lo incluye).

## Hito 17 — Migraciones Supabase: alineación CLI + reglas cancelación paciente (23-abr-2026)

- **Problema:** el remoto registraba migraciones con prefijos timestamp (`202604…`) y el repo usaba prefijos `0001`…`0046` → `supabase db push` fallaba con *Remote migration versions not found in local*.
- **Solución:** 47 ficheros no-op `202604*_remote_reconcile.sql` + `supabase migration repair --status applied` para las versiones `0001`…`0046` ya reflejadas en esquema; tras eso `migration list --linked` muestra Local/Remote alineados y `db push` responde *up to date*.
- **Producto:** migración **`0046_cancelar_cita_48h_sin_reembolso_paciente.sql`** — paciente solo cancela si `inicio > now() + 48h`; sin reembolso Stripe automático al paciente. **`0045_chat_enviar_variable_conflict.sql`** — pragma `variable_conflict` en `chat_enviar_mensaje`.
- **`supabase/config.toml`:** `[db] major_version = 17` alineado con proyecto enlazado; revisión de `verify_jwt` por función según contrato (API key / webhook / cron).
- Plantilla Auth confirmación: `content_path` relativo al repo (`./supabase/templates/confirmation.html`) para que `supabase link` resuelva bien en Windows.

## Hito 18 — Documentación: carpetas y ficheros en español (23-abr-2026)

- Directorios renombrados: `00_project_control` → `00_proyecto`, `01_audits` → `01_auditorias`, `02_reports` → `02_informes`, `03_engineering` → `03_ingenieria`, `04_design` → `04_diseno`, `05_operations` → `05_operaciones`.
- Ficheros `.md` en **kebab-case** español (ej. `estado-y-pendientes.md`, `geo-y-seo.md`).
- Nuevo `docs/README.md` (índice y criterios) y `costes-herramientas.md` (Cursor + dominio).
- Enlaces en documentación y `README.md` raíz alineados a las nuevas rutas.

## Hito 19 — Documentación unificada en `docs/` (26-abr-2026)

- Un solo árbol de Markdown en la **raíz** del monorepo; retirada la duplicación bajo `frontend/docs/`.
- Añadidos: `00_proyecto/linea-base-producto.md`, `05_operaciones/checklist-produccion.md`, `03_ingenieria/estructura-frontend-src.md`. La verificación puntual de 2026-04-22 quedó resumida en la sección *Verificación de build* (más abajo); eliminado el antiguo fichero de comprobación por “fases” sueltas.
- `docs/README.md` e índice de `README.md` raíz (§12) actualizados.
- **(Actualización 26-abr-2026, bis)** `02_informes/informe-unico.md` y `01_auditorias/sintesis-plataforma.md` (experimentos de consolidación) reemplazados de nuevo por **auditorías completas** por capítulo + dos informes (`ejecutivo-cliente`, `valor-reposicion-software`). `plan-remediacion-2026-04-22` retirado: el histórico queda en git. Checklists `testing` + `produccion` unificados en `05_operaciones/checklist-produccion.md`.

## Hito 21 — Política 48h en producto: cancelación y recordatorio email (26-abr-2026)

- **Cancelación paciente (online):** ya fijada en `0046` (más de 48h hasta el inicio; sin refund Stripe automático al paciente en ese flujo).
- **Recordatorios de cita:** `0060` (enum, columna, RPC 24h) + `0061` (RPC 48h) — `reminder_48h` (47h–49h) y `reminder_24h` (23h–25h). La cancelación online sigue **48h** (`0046`).

## Hito 22 — Refinamientos de la app: agenda, horario Madrid, público y accesibilidad (26-abr-2026)

- **Nombre interno:** *refinamientos de la app* (ajustes de UX y consistencia sin cambiar el alcance base del producto).
- **Agenda (vista semana):** posicionamiento con **Europe/Madrid**, rejilla en **px** alineada, franja visual **09:00–21:00**; móvil simplificado (nombre en pastilla); tablet/desktop centrado.
- **Horario y datos:** migración **`0064_horario_clinica_09_22_y_limpieza_citas_fuera_franja.sql`** + validación **09:00–21:59** Madrid en reserva y alta manual de cita.
- **Web pública:** tarjetas sin iconos, títulos centrados (`PhilosophySection`, `/enfoque`).
- **Menú móvil portales + público:** `createPortal` a `document.body`; contraste **claro/oscuro** en `EditorialMobileNav` / drawers (WCAG).
- **Documentación:** `docs/00_proyecto/refinamientos-app-2026-04-26.md` (detalle); README raíz y `docs/README.md` enlazan el bloque.

## Hito 23 — Refinamientos de la app: RGPD, ficha, agenda y pulido transversal (27-abr-2026)

- **Nombre interno:** *refinamientos de la app* (continuación de Hito 22; mismos criterios: ajustes sin redefinir alcance).
- **Auditoría (Configuración admin):** resolución correcta del **nombre** en el log de `admin_lookups` mediante cadena `pacientes` → `profiles` (el enlace a ficha ya existía).
- **Ficha paciente:** **adjuntos** con subida validada, almacenamiento `paciente-adjuntos`, listado y descarga por URL firmada (admin).
- **Agenda admin:** **cancelar cita** desde el panel de resumen de cita; alineado con RPC `cancelar_cita` y liberación de hueco en disponibilidad.
- **Transversal:** refinamientos de panel mensajes, listados (pacientes/bonos/biblioteca), pagos/email PDF, avisos de reserva, web pública modo claro — detalle en `docs/00_proyecto/refinamientos-app-2026-04-27.md`.
- **Migraciones Supabase:** eliminado el duplicado de versión **`0062`** (había dos `.sql` con el mismo prefijo). La función **`terapeuta_public_profile`** queda en **`0065_terapeuta_public_profile.sql`** para que `schema_migrations` no choque (`23505`). Ver tabla y operativa en el mismo doc de refinamientos 27-abr.

## Hito 20 — Documentación: auditorías completas y checklist unificado (26-abr-2026)

- Restaurados y reescritos al estado del repo: `01_auditorias/{arquitectura,backend,frontend,base-de-datos}.md` y `02_informes/{ejecutivo-cliente,valor-reposicion-software}.md` (revisión 3 en valor de reposición).
- Eliminados: `plan-remediacion-2026-04-22.md`, `02_informes/informe-unico.md`, `01_auditorias/sintesis-plataforma.md`, `05_operaciones/testing-checklist.md` (contenido fusionado en `checklist-produccion.md` Partes A–C).
- `docs/README.md` e índice de `README.md` raíz (§12) alineados a la nueva estructura y tablas.

## Verificación de build (22 abr 2026)

- En `frontend/`: `npx tsc --noEmit` y `npm run build` (Next 14) correctos en esa fecha.
- Ámbito revisado: ficha admin (edición por secciones, historial), portal de pagos y recursos, chat con audio y validación **magic bytes** + límites en `POST /api/mensajes/attach`. SEPA en Stripe: guía en `docs/05_operaciones/activar-sepa-stripe.md` (activación de dashboard, no bloqueo de código).

## Estado actual (punto de partida para siguientes sesiones)

- **Backend único**: Supabase (Postgres **17** en proyecto enlazado + Edge Functions Deno + Auth + Storage + Realtime + Vault/pgcron).
- **Legacy FastAPI / `backend/`**: **eliminado del repositorio** (hito 14); cualquier lógica nueva va a RPC/Edge.
- **Frontend**: Next.js 14 App Router en Vercel (`frontend/`, rama `frontend`).
- **Cifrado**: AES-256 vía pgcrypto + blind index HMAC-SHA256 + clave en Vault; chat con cifrado en capa app (`0037`).
- **Pagos**: Stripe Payment Element + webhooks idempotentes.
- **Emails**: Resend + plantillas; Auth SMTP opcional hacia Resend.
- **Observabilidad**: Sentry (frontend + edge según despliegue).
- **Bloqueos go-live típicos**: unificar dominio/DNS (si queda alias pendiente), Stripe Live + rotación de secrets, ejecutar `0028_retirar_seed_demo.sql` antes de abrir al público; checklists `docs/00_proyecto/estado-y-pendientes.md` y `docs/05_operaciones/checklist-produccion.md`.
