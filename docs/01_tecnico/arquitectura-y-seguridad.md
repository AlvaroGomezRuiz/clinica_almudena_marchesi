# Arquitectura y seguridad

> Última actualización: 2026-04-27 — auditoría de seguridad senior aplicada

## Diagrama de arquitectura

```
┌──────────────┐    HTTPS    ┌──────────────────────┐   RLS + RPC   ┌───────────────────────┐
│  Navegador   │────────────▶│ Vercel · Next.js 14  │──────────────▶│ Supabase (eu-central) │
│  (usuario)   │◀────────────│  App Router + SSR    │◀──────────────│ Postgres + Auth + Rt  │
└──────────────┘   Cookies   └──────────────────────┘    WebSocket  └───────────────────────┘
                                      ▲
                         Stripe webhook │
                         (vía Edge Fn)  │
```

---

## Capas de seguridad

### Capa 1 — Autenticación

| Control                          | Implementación                                                  |
|----------------------------------|-----------------------------------------------------------------|
| Contraseñas                      | ≥12 caracteres, validación Supabase + server action             |
| MFA                              | TOTP opcional, enrollment en `/admin/configuracion`             |
| Middleware                       | Valida sesión en cada request + RBAC por rol                    |
| Cookies                          | `httpOnly`, `secure`, `sameSite: lax`, `path: /`                |
| Geo-gate                         | **Solo ES/PT/AD**. Todo tráfico exterior bloqueado en Edge      |
| Header Vary                      | `Cookie, Accept-Encoding` → evita fuga de sesión en CDN         |

### Capa 2 — Row Level Security (RLS)

| Principio                        | Detalle                                                         |
|----------------------------------|-----------------------------------------------------------------|
| Activación                       | Todas las tablas con `enable row level security`                |
| Helper `is_admin()`              | `true` si `profiles.role = 'admin'`                             |
| Helper `current_paciente_id()`   | Devuelve `pacientes.id` del usuario autenticado                 |
| Paciente                         | Solo ve filas donde `paciente_id = current_paciente_id()`       |
| Admin                            | Lee todas las filas                                             |
| Auditoría                        | Solo lectura para admin; inserts vía `service_role`             |

### Capa 3 — Cifrado en reposo

| Elemento                         | Detalle                                                         |
|----------------------------------|-----------------------------------------------------------------|
| Algoritmo                        | AES-256-GCM vía `pgcrypto` + `pgp_sym_encrypt`
| Clave maestra                    | En Supabase Vault (no en env vars). Rotación trimestral         |
| Blind indexes                    | HMAC-SHA256 para búsqueda exacta sin descifrar                  |
| Columnas cifradas                | `_ciphertext` (PII: DNI, nombre, teléfono, notas clínicas)      |
| Chat                             | Mensajes cifrados en `body_ciphertext` + vista descifrada       |
| Funciones                        | `app_encrypt`, `app_decrypt`, `app_bidx` — SECURITY DEFINER     |

### Capa 4 — Auditoría tamper-evident

| Control                          | Detalle                                                         |
|----------------------------------|-----------------------------------------------------------------|
| Hash-chain                       | `SHA-256(hash_previo ∥ usuario ∥ acción ∥ ts ∥ detalles)`        |
| Tabla `auditoria`                | Append-only, inmutable. Solo `service_role` inserta             |
| Tabla `admin_lookups`            | Registro de cada campo sensible revelado por admin              |

### Capa 5 — Defensas aplicativas

| Control                          | Detalle                                                                    |
|----------------------------------|----------------------------------------------------------------------------|
| CSP                              | Estricta con `strict-dynamic`, fuente única en `next.config.js`            |
| HSTS                             | 2 años + `includeSubDomains` + `preload`                                   |
| Headers                          | `X-Frame-Options: DENY`, `CORP: same-origin`, `Referrer: strict-origin`    |
| Rate limiting                    | Ventana deslizante, Upstash Redis o fallback en memoria                    |
| Magic-bytes                      | Validación de firma binaria real vs MIME declarado                         |
| CSV injection                    | Prefijo `'` en exports contra fórmulas Excel                               |
| Path traversal                   | Sanitización de `..` y `/` en nombres de archivos                          |
| Source maps                      | Deshabilitados en producción, eliminados tras upload a Sentry              |
| Powered-by                       | Deshabilitado (`poweredByHeader: false`)                                   |

### Capa 6 — Rendimiento DB

| Índice                                                  | Uso                        |
|---------------------------------------------------------|----------------------------|
| `citas(paciente_id, inicio DESC)`                       | Ficha paciente             |
| `citas(inicio) WHERE estado IN ('confirmada','bloqueo')` | Dashboard agenda          |
| `pagos(paciente_id, fecha_pago DESC)`                   | Historial pagos            |
| `pagos(estado, fecha_pago DESC)`                        | Export facturación         |
| `mensajes(conversation_id, created_at DESC)`            | Chat                       |
| `mensajes_adjuntos(mensaje_id, created_at ASC)`         | Adjuntos                   |
| `stripe_events(received_at DESC) WHERE processed IS NULL` | Cola de reintentos       |
| `profiles(role)`                                        | Filtros admin              |

---

## SEO y GEO

| Elemento                | Estado    | Detalle                                                    |
|-------------------------|-----------|------------------------------------------------------------|
| JSON-LD                 | ✅        | `@graph`: WebSite + LocalBusiness/MedicalBusiness          |
| Canonical + hreflang    | ✅        | `es-ES`, metadataBase con dominio canónico                 |
| Open Graph              | ✅        | Imagen, título, descripción por página                     |
| robots.txt              | ✅        | Disallows para `/admin`, `/portal`, `/api`                 |
| sitemap.xml             | ✅        | Todas las páginas públicas con lastmod                     |
| GEO meta tags           | ✅        | `geo.region`, `geo.placename`, ICBM (Moncloa-Chamberí)     |
| LLM crawlers            | ✅        | GPTBot, ClaudeBot, PerplexityBot permitidos                |
| `llms.txt`              | ✅        | Contenido optimizado para indexación LLM                   |
| Zonas privadas          | ✅        | `noindex, nofollow, noarchive, nosnippet` + `no-store`     |

---

## Observabilidad

| Herramienta   | Uso                                                              |
|---------------|------------------------------------------------------------------|
| Sentry        | Errores frontend + server + edge, PII scrubbing antes de envío   |
| Edge `health` | Healthcheck de DB + vault + conectividad                         |
| `stripe_events` | Auditoría completa de webhooks recibidos                       |
| `emails_log`  | Registro de envíos con deduplicación                             |
| `auditoria`   | Hash-chain de acciones sensibles                                 |
