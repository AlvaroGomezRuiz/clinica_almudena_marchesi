# Arquitectura visual — Clínica Almudena

> Última actualización: **2026-04-22** (hito 14 · limpieza final).
> Documento vivo. Complementa a `arquitectura-tecnica.md` con diagramas Mermaid renderizables en GitHub / VS Code.

---

## 0. Pregunta frecuente: *"¿Dónde está el backend si no hay carpeta `backend/`?"*

**No existe un único servidor "backend" porque no hace falta.** El backend está distribuido en 3 capas, todas gestionadas por Supabase y Vercel — ambas con CI/CD, autoescalado y observabilidad nativas:

| Capa | Dónde corre | Qué hace | Dónde está el código |
|---|---|---|---|
| **BFF / Server Actions** | Vercel (Node runtime) | Validación de inputs, autenticación, orquestación entre frontend y Supabase, subida de ficheros con magic-bytes + rate-limit, exportación CSV. | `frontend/src/services/*`, `frontend/src/app/api/*` |
| **Postgres + RPC + RLS** | Supabase (`eu-central-1`) | Lógica de negocio crítica (reservas, cifrado AES-256 vía pgcrypto+Vault, auditoría, búsqueda blind-index), permisos por fila (RLS). | `supabase/migrations/0001…0029*.sql` |
| **Edge Functions (Deno)** | Supabase Edge Runtime | Webhooks externos firmados (Stripe, Resend), envío de email transaccional, cron horario, generación de PDF de factura, exports RGPD, healthcheck. | `supabase/functions/<name>/index.ts` |

> **Para el que mire el repo**: no verá una carpeta `backend/`, pero sí verá:
> - `supabase/migrations/` → **"ese es tu backend-DB"** (lógica + permisos).
> - `supabase/functions/` → **"ese es tu backend-API externo"** (webhooks + cron).
> - `frontend/src/app/api/` y `frontend/src/services/*` → **"ese es tu backend-for-frontend"**.
>
> Todo documentado en `README.md §1-§2` y en los diagramas de más abajo.

---

## 1. Diagrama de sistema (alto nivel)

```mermaid
flowchart LR
    subgraph CLIENT["Navegador (paciente / admin)"]
        UI["Next.js 14 App Router<br/>React Server Components"]
    end

    subgraph VERCEL["Vercel · fra1 (Frankfurt)"]
        SSR["SSR + Server Actions<br/>/src/app/**"]
        BFF["API Routes<br/>/src/app/api/**<br/>(rate-limit · magic-bytes · CSV)"]
        MW["middleware.ts<br/>(Auth + RBAC + CSP)"]
    end

    subgraph SUPABASE["Supabase · eu-central-1"]
        AUTH["Auth<br/>(cookies httpOnly, MFA TOTP, OTP email)"]
        DB[("Postgres 17<br/>+ RLS + Vault")]
        RPC{{"RPC cifradas<br/>app_encrypt · app_bidx<br/>is_admin · current_paciente_id"}}
        STORAGE[("Storage buckets<br/>avatares · recursos<br/>chat-adjuntos · firmas-rgpd")]
        REALTIME(("Realtime WS"))
        EDGE["Edge Functions (Deno)"]
    end

    subgraph EXT["Servicios externos"]
        STRIPE["Stripe<br/>(Payment Element + webhooks)"]
        RESEND["Resend<br/>(transactional email + webhooks)"]
        SENTRY["Sentry EU<br/>(error monitoring)"]
    end

    UI -- HTTPS --> MW
    MW --> SSR
    MW --> BFF
    SSR -- "@supabase/ssr<br/>(cookies forwarded)" --> AUTH
    SSR -- RPC --> RPC
    BFF -- service_role<br/>(server-only) --> DB
    RPC --> DB
    DB -- "publication realtime" --> REALTIME
    REALTIME -- WS --> UI
    SSR -- "signed URL" --> STORAGE
    STORAGE -. RLS por user_id .- DB

    EDGE -- SECURITY DEFINER --> DB
    STRIPE -- "webhook HMAC" --> EDGE
    RESEND -- "webhook HMAC" --> EDGE
    EDGE -- "REST signed" --> RESEND
    SSR -- "redirect + confirm" --> STRIPE
    SSR -. Sentry DSN .-> SENTRY
    EDGE -. Sentry DSN .-> SENTRY
```

---

## 2. Flujo: auto-registro de paciente (hito 14)

```mermaid
sequenceDiagram
    actor P as Paciente
    participant N as Next.js (Vercel)
    participant C as Cookies httpOnly (15 min TTL)
    participant A as Supabase Auth
    participant D as Postgres RPC
    participant R as Resend

    P->>N: 1. POST /registro-paciente (paso 1)<br/>nombre, DNI, teléfono, motivo, medicación, alergias...
    N->>N: validación Zod server-side
    N->>C: persiste draft_paciente_* (15 min TTL)
    N->>A: signInWithOtp({ shouldCreateUser: true })
    A->>R: envía email con código OTP
    A-->>N: ok
    N-->>P: redirect /registro-paciente/verificar

    P->>N: 2. POST /verificar (paso 2)<br/>code OTP + password (≥14 chars)
    N->>A: verifyOtp({ type:'email' }) → crea sesión
    N->>A: updateUser({ password })
    N->>C: lee draft_paciente_* de cookies
    N->>D: RPC paciente_autoregistro_cifrada(...)
    D->>D: app_encrypt(DNI, nombre, tel, email, medicación...)<br/>app_bidx(DNI, email, tel) para búsqueda
    D-->>N: paciente_id (uuid)
    N->>C: clear drafts
    N-->>P: redirect /portal (o /portal/citas/reservar?plan=...)
```

---

## 3. Flujo: reserva de cita con pago embebido

```mermaid
sequenceDiagram
    actor P as Paciente
    participant N as Next.js Server Action
    participant D as Postgres (RPC + RLS)
    participant E as Edge Fn stripe-payment-intent
    participant S as Stripe Payment Element
    participant W as Edge Fn stripe-webhook
    participant R as Resend

    P->>N: abrir /portal/citas/reservar
    N->>D: RPC obtener_disponibilidad(fecha, servicio)
    D-->>N: slots[]
    N-->>P: render SlotPicker
    P->>N: click slot
    N->>D: RPC reservar_cita(servicio, slot)

    alt con bono activo
        D->>D: cita.estado='confirmada' + consume sesión del bono
        D-->>N: cita_id
        N->>R: send-email booking_confirmed
        N-->>P: /portal/citas (confirmada)
    else sin bono
        D->>D: cita.estado='bloqueo_temporal' (TTL 10 min)
        D-->>N: cita_id
        N->>E: crearPaymentIntentCitaAction(cita_id)
        E->>E: Stripe PaymentIntent (amount, currency, metadata:{cita_id})
        E-->>N: client_secret
        N-->>P: PaymentElementDrawer<br/>(Stripe Elements inline)
        P->>S: tarjeta + confirmar
        S-->>W: checkout.session.completed<br/>payment_intent.succeeded<br/>(HMAC signed)
        W->>W: verifica firma HMAC-SHA256
        W->>D: RPC procesar_pago_stripe(event)<br/>pagos.stripe_event_id UNIQUE (idempotencia)
        D->>D: cita.estado='confirmada' + insert pagos
        W->>R: send-email booking_confirmed
        S-->>P: redirect /portal/pagos/success
    end
```

---

## 4. Flujo: chat realtime

```mermaid
sequenceDiagram
    actor P as Paciente
    actor A as Almudena (admin)
    participant N as Next.js
    participant D as Postgres
    participant RT as Realtime WS

    P->>N: abrir /portal/mensajes
    N->>D: RPC chat_mi_conversacion()
    D-->>N: conversation_id
    N->>RT: subscribe postgres_changes<br/>filter=conversation_id=eq.<id>
    P->>N: sendMensajeAction(texto)
    N->>D: RPC chat_enviar_mensaje<br/>(SECURITY DEFINER, check RLS + unread_*)
    D->>RT: INSERT mensajes → broadcast
    RT-->>P: echo (optimistic confirmed)
    RT-->>A: nuevo mensaje (unread_admin++)
    A->>N: abrir /admin/mensajes/[id]
    N->>D: RPC chat_marcar_leidos → unread_admin=0
```

---

## 5. Flujo: cron recordatorios (ventana ≈48h)

```mermaid
sequenceDiagram
    participant PGCRON as pg_cron (Supabase)
    participant EF as Edge Fn cron-recordatorios-24h
    participant D as Postgres RPC
    participant R as Resend
    participant L as emails_log

    Note over PGCRON: cada hora al minuto 5
    PGCRON->>EF: POST /functions/v1/cron-recordatorios-24h<br/>Authorization: Bearer CRON_SECRET
    EF->>EF: valida header CRON_SECRET === env
    EF->>D: RPC citas_pendientes_recordatorio_48h()<br/>+ citas_pendientes_recordatorio_24h()
    D-->>EF: citas[] + datos paciente
    loop por cada cita
        EF->>L: insert emails_log (dedupe_key UNIQUE)
        alt opt-in del paciente
            EF->>R: Resend (template reminder_48h o reminder_24h)<br/>retry exponencial x3
            R-->>EF: message_id
            EF->>L: update estado='sent' + resend_id
        else opt-out
            EF->>L: estado='skipped'
        end
    end
```

---

## 6. Flujo: admin edita ficha cifrada (con auditoría)

```mermaid
sequenceDiagram
    actor A as Almudena (admin)
    participant N as Next.js /admin/pacientes/[id]
    participant D as Postgres
    participant AL as admin_lookups (audit log)

    A->>N: click "revelar DNI"
    N->>D: RPC paciente_revelar_campo(id, 'dni_nie', justificacion)
    D->>D: is_admin()? sí
    D->>AL: insert admin_lookups<br/>(user_id, paciente_id, campo, justificacion, ip, ua)
    D->>D: app_decrypt(dni_nie_ciphertext)
    D-->>N: plaintext
    N-->>A: SensitiveField con plaintext

    A->>N: editar teléfono inline
    N->>D: RPC paciente_actualizar_cifrado({telefono: "..."})
    D->>D: app_encrypt(telefono) + app_bidx(telefono)
    D->>D: update pacientes set telefono_ciphertext=..., telefono_bidx=...
    D-->>N: ok
```

---

## 7. Capas de seguridad (resumen)

```mermaid
graph TD
    subgraph L1["Capa 1 · Auth"]
        A1["Password ≥14 + complejidad"]
        A2["MFA TOTP opcional"]
        A3["Cookies httpOnly·secure·sameSite·path"]
        A4["middleware RBAC /admin /portal"]
    end
    subgraph L2["Capa 2 · RLS (Postgres)"]
        B1["is_admin() helper"]
        B2["current_paciente_id() helper"]
        B3["Policies en todas las tablas"]
    end
    subgraph L3["Capa 3 · Cifrado aplicativo"]
        C1["AES-256-GCM vía pgcrypto"]
        C2["Vault = master key (rotación 90d)"]
        C3["HMAC-SHA256 blind index (_bidx)"]
    end
    subgraph L4["Capa 4 · Auditoría"]
        D1["hash-chain en auditoria"]
        D2["admin_lookups por revelado PII"]
        D3["stripe_events replay-safe"]
    end
    subgraph L5["Capa 5 · Defensas aplicativas"]
        E1["CSP unificada next.config.js"]
        E2["Rate-limit por acción + user_id"]
        E3["Magic-bytes en uploads"]
        E4["CSV injection escape"]
    end
    L1 --> L2 --> L3 --> L4 --> L5
```

---

## 8. Matriz: ¿dónde vive cada responsabilidad?

| Responsabilidad | Vercel (Next.js) | Supabase Postgres | Supabase Edge Fn | Externo |
|---|---|---|---|---|
| Renderizado SSR | **✔** | | | |
| Validación input (Zod) | **✔** | | | |
| Auth (signup/login/MFA) | proxy cookies | **✔ gotrue** | | |
| Reglas de negocio (reservar cita, cifrar PII) | | **✔ RPC+RLS** | | |
| Webhook Stripe (verify firma + idempotencia) | | | **✔ stripe-webhook** | Stripe |
| Webhook Resend (bounce/complaint) | | | **✔ resend-webhook** | Resend |
| Envío email transaccional | | | **✔ send-email** | Resend |
| Cron recordatorios (~48h + ~24h) | | pg_cron trigger | **✔ cron-recordatorios-24h** (migr. **0060+0061**) | |
| PDF facturas | | metadatos | **✔ invoice-pdf** | |
| Export RGPD | | firma | **✔ rgpd-request** | |
| Healthcheck externo | | | **✔ health** (verify_jwt=false) | UptimeRobot |
| Rate-limit upload | **✔ /api/***  | | | |
| Magic-bytes validation | **✔ lib/security/file-validation** | | | |
| CSV injection escape | **✔ /api/admin/facturacion/export** | | | |
| Observabilidad errores | Sentry browser + server | | Sentry Edge | Sentry EU |
| Storage (ficheros) | signed URLs | políticas RLS | | Supabase Storage |
| Pago (PCI) | solo Payment Element | — | — | Stripe |

---

## 9. Migraciones aplicadas en producción

| # | Nombre | Resumen |
|---|---|---|
| 0001-0005 | init · rls · storage · realtime · seed_servicios | Esqueleto base. |
| 0006-0007 | chat · disponibilidad | RPCs de chat y reserva. |
| 0008-0011 | seed demo · email · stripe · audit hashchain | Infra operativa. |
| 0012-0015 | auditoría ficha · chat RGPD prefs · horarios recurrentes · agenda metadata | Compliance + UX clínica. |
| 0016-0020 | ficha MVP · notas cita · recursos · facturas · RGPD exports | Features clínicas. |
| 0021 | security_lints_fix | `security_invoker=true`, `search_path` fijo. |
| 0022-0024b | cifrado F5 | pgcrypto + Vault + RPCs CRUD cifradas + triggers auto-encrypt. |
| 0026 | performance_indexes | 8 índices compuestos + ANALYZE (ganancia 2-10×). |
| 0027 | ficha_bulk_descifrar | lectura atómica multi-campo con audit. |
| 0028 | retirar_seed_demo | script idempotente (pendiente ejecutar al go-live). |
| **0029** | **paciente_autoregistro** | **RPC cifrada para auto-registro OTP (hito 14).** |

---

## 10. Convenciones del equipo

- **Rama de producción GitHub:** `frontend` (minúsculas).
- **Root directory Vercel:** `frontend` (Linux case-sensitive).
- **Región Vercel:** `fra1` (alineada con Supabase `eu-central-1`).
- **Monorepo:** un solo paquete — `frontend/` + `supabase/` + `docs/`. El antiguo `backend/` FastAPI se eliminó en el hito 14 (22-abr-2026).
- **Flujo de migraciones:** append-only. Nunca se reescribe una migración aplicada; se crea una `NNNN+1_fix_*.sql`.
- **Flujo de Edge Functions:** bundle con `node supabase/scripts/bundle_for_deploy.mjs` si se toca `_shared/`, luego `supabase functions deploy <name>`.

---

## 11. Archivos de referencia

- `README.md` — guía global de producción.
- `docs/03_ingenieria/arquitectura-tecnica.md` — visión detallada con invariantes técnicos.
- `docs/03_ingenieria/roadmap.md` — qué queda pendiente post-hito 14.
- `docs/00_proyecto/estado-y-pendientes.md` — estado vivo del proyecto (es la fuente de verdad operativa).
- `supabase/BOOTSTRAP.md` — setup inicial de Supabase desde cero.
