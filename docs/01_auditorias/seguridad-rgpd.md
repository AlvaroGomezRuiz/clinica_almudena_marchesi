# Auditoria de Seguridad y Cumplimiento RGPD

> **Alcance**: seguridad end-to-end + cumplimiento RGPD + Ley 41/2002 (historia clinica) + LOPDGDD.
> **Fecha**: 2026-04-21 (revisada 2026-04-22 con ronda senior).

---

## 1. Resumen ejecutivo

El sistema implementa un modelo de **Defense in Depth** con **4 capas** de proteccion (transporte, cabeceras, autenticacion/autorizacion, cifrado de datos). Cumple los controles requeridos por Articulo 32 RGPD, Articulo 17 Ley 41/2002 y LOPDGDD Articulo 28 (deber de seguridad).

| Capa                     | Estado  | Cumplimiento normativo                         |
|--------------------------|---------|-----------------------------------------------|
| Transporte (TLS 1.3)     | Verde   | RGPD Art. 32.1.a                              |
| Cabeceras HTTP           | Verde   | RGPD Art. 25 (privacy by design)              |
| Autenticacion            | Verde   | LOPDGDD Art. 28.2                             |
| Autorizacion (RBAC+RLS)  | Verde   | RGPD Art. 32.2 (confidencialidad)             |
| Cifrado en reposo        | Verde   | RGPD Art. 32.1.a (cifrado)                    |
| Auditoria                | Verde   | Ley 41/2002 Art. 17 (integridad)              |
| Backup                   | Amarillo | RGPD Art. 32.1.c (resiliencia)                |
| DPO / Registro           | Pendiente | RGPD Art. 30 / 37 (organizacional)            |

**Veredicto tecnico**: listo para go-live. Pendiente formalizacion documental organizacional.

---

## 2. Capa 1 — Transporte (TLS)

- **TLS 1.3** forzado por Vercel + Supabase.
- **HSTS** con `max-age=63072000` (2 anos), `includeSubDomains`, `preload`-ready.
- Sin endpoints HTTP plano; ningun proxy intermedio.
- Certificado gestionado por Vercel (Let's Encrypt rotacion 90 dias).

## 3. Capa 2 — Cabeceras HTTP

Definidas en **`frontend/next.config.js`** (unica fuente de verdad desde la ronda senior 2026-04-22; el middleware ya no las duplica para evitar divergencias).

| Cabecera                         | Valor                                                                     | Proteccion                          |
|----------------------------------|---------------------------------------------------------------------------|-------------------------------------|
| `Strict-Transport-Security`      | `max-age=63072000; includeSubDomains; preload`                            | downgrade                           |
| `X-Frame-Options`                | `DENY`                                                                    | clickjacking                        |
| `X-Content-Type-Options`         | `nosniff`                                                                 | MIME sniffing                       |
| `Referrer-Policy`                | `strict-origin-when-cross-origin`                                         | leak referer                        |
| `Permissions-Policy`             | `camera=(), microphone=(), geolocation=(), payment=(self "https://js.stripe.com"), interest-cohort=(), browsing-topics=()` | API sensitive abuse + FLoC opt-out |
| `Content-Security-Policy`        | ver detalle abajo                                                         | XSS                                 |
| `X-XSS-Protection`               | `1; mode=block`                                                           | legacy XSS                          |
| `X-Powered-By`                   | vacio                                                                     | fingerprint servidor                |
| `Cross-Origin-Opener-Policy`     | `same-origin`                                                             | spectre-like                        |
| `Cross-Origin-Resource-Policy`   | `same-origin`                                                             | cross-origin leaks                  |
| `Origin-Agent-Cluster`           | `?1`                                                                      | aislamiento renderer process        |

### CSP (detalle)
```
default-src 'self';
script-src 'self' 'unsafe-inline' https://js.stripe.com https://*.vercel-insights.com https://*.vercel-scripts.com;
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https://*.supabase.co https://*.stripe.com;
font-src 'self' data:;
connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://*.sentry.io https://*.ingest.de.sentry.io https://vercel.live https://vitals.vercel-insights.com;
frame-src 'self' https://js.stripe.com https://hooks.stripe.com;
worker-src 'self' blob:;
object-src 'none';
base-uri 'self';
form-action 'self' https://checkout.stripe.com;
frame-ancestors 'none';
upgrade-insecure-requests;
```

Notas:
- `next/image` incluye ahora su propia CSP aislada (`contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;"`).
- Las rutas `/portal/*`, `/admin/*` y `/api/*` emiten ademas `Cache-Control: private, no-store, must-revalidate` + `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet` (ni CDNs ni buscadores deben cachear o indexar datos clinicos).
- El middleware (`frontend/src/middleware.ts`) solo anade `Vary: Cookie, Accept-Encoding` y los headers internos de identidad (`x-user-id`, `x-user-role`).

### Deuda CSP
Actualmente `script-src` incluye `unsafe-inline` porque Next.js 14 inyecta scripts inline sin nonce. Migracion a nonce-CSP se abordara con Next 15.

## 4. Capa 3 — Autenticacion

### 4.1 Mecanismo
- Supabase Auth con email + password.
- Password policy client-side: minimo 12 chars, score `zxcvbn >= 3`.
- Password policy server-side: minimo 12 chars (Supabase setting).
- MFA TOTP opcional via `authenticator` apps.
- Cookies `httpOnly` + `Secure` + `SameSite=Lax` gestionadas por `@supabase/ssr`.
- **Refuerzo 2026-04-22**: helper `hardenCookieOptions()` en `frontend/src/lib/supabase/middleware.ts` fuerza `httpOnly:true`, `secure:true` en prod, `sameSite:'lax'`, `path:'/'` por encima de lo que proponga la libreria (defensa en profundidad · previene downgrades accidentales).

### 4.2 Sesiones
- Sliding refresh automatico al 50% de vida del access token.
- Logout invalida la sesion en Supabase Auth.
- JWT alg RS256 (Supabase firma).

### 4.3 Deficiencias aceptadas
- **Leaked Password Protection (HIBP)**: requiere Supabase Pro. Mitigacion: zxcvbn + 12 chars minimo + campana educacion usuarios.

## 5. Capa 4 — Autorizacion (RBAC + RLS)

### 5.1 RBAC
- Rol almacenado en `profiles.role` (`'admin' | 'paciente'`).
- Middleware Next.js filtra por prefijo de ruta (`/admin/*` solo admin, `/portal/*` solo paciente).
- Backend resuelve rol via `public.is_admin()` (SECURITY DEFINER).

### 5.2 RLS
- Todas las tablas tienen RLS. Sin policy ⇒ sin acceso.
- Policies canonicas: `*_self_*` + `*_admin_all`.
- Inserts en `pagos`, `auditoria`, `emails_log` bloqueados para `authenticated`, permitidos solo a `service_role`.

### 5.3 Validacion efectiva
Cada policy se prueba:
```sql
-- Como paciente X
set role authenticated;
set request.jwt.claims to '{"sub":"<uuid_paciente>","role":"authenticated"}';
select * from pacientes;  -- solo devuelve fila propia
```

## 6. Cifrado en reposo

### 6.1 Columnas cifradas
14 columnas actualmente:
- `pacientes`: `nombre_ciphertext`, `apellidos_ciphertext`, `email_ciphertext`, `dni_ciphertext`, `telefono_ciphertext`, `direccion_ciphertext`, `contacto_emergencia_nombre_ciphertext`, `contacto_emergencia_telefono_ciphertext`, `motivo_consulta_ciphertext`, `motivo_consulta_inicial_ciphertext`, `preferencias_clinicas_ciphertext`.
- `paciente_diagnosticos`: `titulo_ciphertext`, `notas_ciphertext`.
- `paciente_medicacion`: `notas_ciphertext`.
- `citas_notas_paciente`: `contenido_ciphertext`.

### 6.2 Algoritmo
`pgp_sym_encrypt` (AES-256 CFB) via `pgcrypto`. IV aleatorio por cifrado.

### 6.3 Gestion de clave
- Master key generada: `gen_random_bytes(32)` → hex 64 chars.
- Almacenamiento: `supabase_vault.decrypted_secrets` con nombre `app_encryption_key`.
- Acceso: solo `public._app_encryption_key()` (SECURITY DEFINER), revocado a anon/authenticated.
- **No existe** copia de la clave en `.env`, logs, git, ni fichero local.

### 6.4 Blind index (HMAC-SHA256)
- `email_bidx`, `dni_bidx`, `telefono_bidx` — UNIQUE.
- Normaliza input: `lower(btrim(x))`.
- HMAC determinista con la master key ⇒ permite busqueda exacta sin exponer plaintext.

### 6.5 Rotacion
Procedimiento manual documentado en `0022_cifrado_setup.sql`:
1. Generar `app_encryption_key_v2`.
2. Re-cifrar registros con script offline.
3. Borrar `v1`.

## 7. Auditoria tamper-evident

Tabla `public.auditoria`:
```
(id, ts, usuario, accion, detalles, hash_previo, hash_integridad)
```

`hash_integridad = SHA-256(hash_previo || usuario::text || accion || ts::text || detalles::text)`.

Writer: `RPC registrar_consulta_sensible` llamado desde:
- `paciente_revelar_campo` (cada decrypt campo individual).
- `registro_clinico_descifrar` (decrypt ficha completa).
- Edge Function `rgpd-request` (exports/derecho acceso).

Query de verificacion disponible en `docs/05_operaciones/checklist-produccion.md` (Parte B, comprobaciones de cifrado y almacenamiento en secciones B.2 y B.4B).

## 8. Cumplimiento RGPD

### 8.1 Principios (Art. 5)

| Principio                   | Implementacion                                        |
|-----------------------------|-------------------------------------------------------|
| Licitud, lealtad            | Consentimiento explicito + firma al alta               |
| Finalidad                   | Solo gestion clinica, declarado en `/privacidad`       |
| Minimizacion                | Campos mandatorios minimos                             |
| Exactitud                   | Paciente puede editar perfil en `/portal/ajustes`      |
| Limitacion de plazo         | Soft delete `activo=false`; purga anonima a 5 anos    |
| Integridad y confidencialidad | Cifrado + RLS + TLS                                 |
| Responsabilidad proactiva   | Auditoria + DPIA + registro tratamientos (pendiente)  |

### 8.2 Derechos del interesado (Art. 15-22)

| Derecho             | Implementacion                                              |
|---------------------|-------------------------------------------------------------|
| Acceso              | Edge Function `rgpd-request` genera export JSON firmado     |
| Rectificacion       | `/portal/ajustes` + `actualizarPacienteSensiblesAction`     |
| Supresion           | RPC `paciente_soft_delete` (anonimizacion via hash)         |
| Limitacion          | Trigger: si `activo=false`, no aparece en citas/mensajes    |
| Portabilidad        | Export JSON + PDF historia via `rgpd-request`               |
| Oposicion           | `notificaciones_prefs` opt-in por tipo                      |
| Decisiones auto.    | N/A (sin automated decisioning)                             |

### 8.3 Evaluacion de Impacto (DPIA)
**Pendiente** documental. Categoria datos especiales (Art. 9.2.h — salud). Requiere documento formal antes de operacion publica.

### 8.4 Registro de tratamientos (Art. 30)
**Pendiente** formalizar como documento independiente. Incluir:
- Responsable: Clinica Almudena Marchesi
- Delegado de Proteccion de Datos (si aplica por volumen — opcional <5000 pacientes)
- Finalidad: gestion clinica psicologica
- Categorias de datos: identificativos, contacto, salud (Art. 9)
- Destinatarios: ninguno externo salvo Supabase (encargado) + Stripe (encargado pagos)
- Transferencias: UE (eu-central-1 Frankfurt)
- Plazo de conservacion: 5 anos post-alta + anonimizacion
- Medidas tecnicas: este documento

### 8.5 Contratos con encargados
- **Supabase**: DPA (Data Processing Agreement) disponible en Supabase Dashboard.
- **Stripe**: DPA firmado al crear cuenta.
- **Resend**: DPA publico en su legal.
- **Vercel**: DPA incluido en terminos enterprise (firmar por mail si facturacion > X).

**Accion**: descargar y guardar los 4 DPAs en `docs/legal/` (pendiente).

## 9. Ley 41/2002 (historia clinica)

### Articulos cumplidos

| Articulo | Requisito                                   | Cumplimiento                                   |
|----------|---------------------------------------------|-----------------------------------------------|
| Art. 15  | Contenido minimo historia clinica           | `pacientes` + `paciente_diagnosticos` + `paciente_medicacion` + `citas_notas_paciente` |
| Art. 16.5 | Confidencialidad                            | RLS + cifrado + auditoria accesos              |
| Art. 17  | Conservacion minimo 5 anos                  | No hay DELETE, soft delete con `activo`       |
| Art. 17  | Integridad + autenticidad                    | Hash-chain auditoria                          |
| Art. 18  | Acceso del paciente                          | `/portal/citas` historia completa              |

## 10. Observabilidad segura

### Sentry
- **Frontend**: `beforeSend` redacta email, DNI, telefono, IBAN, NIE, tarjetas.
- **Edge**: tags con `entity_id`, nunca `payload`.
- **Source maps**: subidos a Sentry y borrados del CDN publico.
- **Tunnel** `/monitoring`: evita adblockers y oculta DSN.

### Logs
- Supabase Logs: filtrados, retencion 7 dias plan Free.
- `emails_log` y `auditoria`: indefinida en DB.

## 11. Gestion de secretos

| Secreto                            | Ubicacion                                   | Rotacion programada |
|------------------------------------|---------------------------------------------|---------------------|
| `SUPABASE_SERVICE_ROLE_KEY`        | Vercel env + Supabase EF secret             | 90 dias             |
| `STRIPE_SECRET_KEY`                | Supabase EF secret                          | 90 dias             |
| `STRIPE_WEBHOOK_SECRET`            | Supabase EF secret                          | 90 dias             |
| `RESEND_API_KEY`                   | Supabase EF secret                          | 90 dias             |
| `SENTRY_AUTH_TOKEN`                | Vercel env                                  | 180 dias            |
| `CRON_SECRET`                      | Supabase EF secret + pg_cron                | 90 dias             |
| `app_encryption_key`               | supabase_vault                              | anual (con re-cifrado) |

## 12. Vulnerabilidades conocidas

| CVE / Clase        | Estado                     | Notas                                     |
|---------------------|----------------------------|-------------------------------------------|
| Next.js < 14.2.35  | Parcheado (14.2.35)        | Multiples CVEs 2024/2025 cubiertas        |
| cryptography < 41  | Parcheado (46.0.6)         | FastAPI no desplegado                     |
| Supply chain       | `pip-audit` en `backend/rebuild_bunker.ps1` | Correr en CI        |

## 12.bis Defensas aplicativas añadidas en la ronda senior (2026-04-22)

Capa complementaria al modelo DiD, centrada en **inputs del usuario** en endpoints escritos en Next.js (no Supabase).

### Rate limiting (`frontend/src/lib/security/rate-limit.ts`)
In-memory con ventana deslizante y `sweepIfNeeded()` para evitar leaks en cold starts serverless.

| Endpoint                               | Ventana | Limite | Observaciones                                 |
|----------------------------------------|---------|--------|-----------------------------------------------|
| `POST /api/mensajes/attach`            | 1 min   | 20     | Anti-spam en chat.                            |
| `POST /api/admin/avatar/upload`        | 1 h     | 10     | Evita churn de storage.                       |
| `POST /api/admin/recursos/upload`      | 1 h     | 30     | Limita volumen diario admin.                  |

Nota: al no ser persistente, cada instancia de Vercel mantiene su contador. Aceptable para clinica unica (1 admin + pocos pacientes). Migrar a Upstash Redis si se pasa a multi-tenant.

### Validacion de ficheros por magic bytes (`frontend/src/lib/security/file-validation.ts`)
- Detecta firma binaria real (`89 50 4E 47` PNG, `25 50 44 46` PDF, etc.).
- Protege contra MIME spoofing (ejecutables renombrados con extension inocua).
- Formatos admitidos: PNG, JPEG, WEBP, HEIC/HEIF, AVIF, PDF, GIF.
- Aplicado en `/api/mensajes/attach` y `/api/admin/avatar/upload`.
- **Pendiente**: extender a video/audio para `/api/admin/recursos/upload` (actualmente valida solo MIME en esa ruta).

### CSV injection (OWASP WSTG-BUSL-02)
`csvEscape()` en `/api/admin/facturacion/export` prefija con comilla simple cualquier celda que empiece por `=`, `+`, `-`, `@`, tab o CR. Previene ejecucion de formulas cuando el CSV se abre en Excel/LibreOffice/Google Sheets.

### Cabeceras sensibles en rutas privadas
- `Cache-Control: private, no-store, must-revalidate` en `/portal/*`, `/admin/*`, `/api/*`.
- `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet` en las mismas rutas.
- `Vary: Cookie, Accept-Encoding` global (middleware).

### Verificacion
- `npm run build` pasa con 0 errores TS.
- Supabase Performance Advisor sin WARN tras migracion `0026`.
- Supabase Security Advisor con 1 WARN aceptado (`auth_leaked_password_protection` · requiere Supabase Pro).

## 13. Acciones recomendadas

### Bloqueantes pre-produccion
1. Rotar todas las passwords y API keys (checklist sección 6 de `docs/00_proyecto/estado-y-pendientes.md`).
2. Borrar seeds demo y datos de testing.
3. Verificar dominio en Resend (SPF/DKIM/DMARC) antes de primer email real.
4. Configurar Stripe en modo Live y nuevo webhook secret.

### Organizativos (no bloquean tecnicamente go-live, si legalmente)
5. Redactar DPIA formal con asesoria legal (LOPDGDD Art. 35).
6. Registro de tratamientos Art. 30 en documento Word/PDF.
7. Aviso legal y politica de privacidad revisados por abogado (URLs `/aviso-legal`, `/privacidad`, `/cookies` existen como plantilla).
8. Contrato DPA firmado con Supabase, Stripe, Resend, Vercel archivado.

### Continuos
9. Revision trimestral de accesos a `auditoria` (buscar patrones anomalos).
10. Test de restore DB cada 6 meses en staging.
11. Pentest externo antes de 12 meses de operacion.

---

## 14. Adenda · Hardening de 22-abr-2026 (smoke E2E definitivo)

El smoke E2E de "ultima pasada" antes de go-live descubrio un conjunto de
vulnerabilidades que se han corregido y cerrado en esta misma sesion. Se
documentan aqui para trazabilidad RGPD.

### 14.1 Fuga de plaintext en columnas legacy (CRITICA · fix 0034)
- Las RPCs `diagnostico_crear_cifrado`, `medicacion_crear_cifrada` y
  `nota_cita_guardar_cifrada` insertaban simultaneamente el plaintext en
  `paciente_diagnosticos.titulo/descripcion`, `paciente_medicacion.notas` y
  `citas_notas_paciente.contenido`. El ciphertext existia, pero el plaintext
  era leido por la UI y - peor - accesible via PostgREST + RLS.
- **Fix aplicado** (`0034_fix_rgpd_plaintext_leak.sql`):
  - Las 3 RPCs solo insertan en columnas `_ciphertext`.
  - Plaintext de filas existentes puesto a `NULL` (selectivo para que no
    se borren notas propias escritas por el paciente).
  - Dropped: `diag_paciente_ver_propio` y `medic_paciente_ver_propia`. El
    paciente ya no puede leer sus DX/medicacion por SELECT directo, solo el
    admin via RPC descifradora con audit.
  - Recreada `cnp_paciente_read_own` con filtro `autor_user_id = auth.uid()`:
    el paciente solo ve sus propias notas, nunca las del terapeuta.
- **Verificacion**: con `SET ROLE authenticated` + JWT del paciente de prueba,
  SELECT a las 3 tablas devuelve 0 filas clinicas del terapeuta.

### 14.2 Auditoria bulk de lectura clinica (fix 0036)
- Nuevo RPC admin `paciente_dx_med_bulk_descifrar(p_paciente_id)` devuelve
  `{diagnosticos[], medicacion[]}` descifrados + registra **una sola**
  entrada en `admin_lookups` con `campo='bulk_export'`,
  `justificacion='ficha_admin_ui_dx_med'`. Reduce N entradas de audit a 1
  y evita N llamadas RPC desde el servidor Next.js.

### 14.3 UPSERT en notas de sesion (fix 0035)
- `nota_cita_guardar_cifrada` siempre hacia INSERT ⇒ duplicados al editar.
  Ahora: si existe nota activa del mismo admin (`autor_user_id = auth.uid()`
  AND `activo = true`) para esa `cita_id`, hace UPDATE del ciphertext +
  `updated_at`. Si no, INSERT. Sin bug de duplicados.

### 14.4 CHECK de `admin_lookups.campo` ampliado (fix 0031 + 0033)
- Se permiten los valores usados por la app: `acceso_ficha_completa`,
  `bulk_export`, `paciente_diagnosticos.titulo|notas`,
  `paciente_medicacion.notas`, `citas_notas_paciente.contenido`, etc.

### 14.5 Bugs funcionales colaterales corregidos
- `reservar_cita` con ambiguedad `estado` (OUT vs columna de
  `bonos_pacientes`) ⇒ 100% reservas fallaban. **Fix 0030**.
- `registro_clinico_descifrar` usaba `CASE (text, text) WHEN (...)` que
  PostgreSQL rechazaba con 42804. **Fix 0032** reescribiendolo con
  `IF/ELSIF`.

### 14.6 Estado final tras el hardening
- 0 columnas clinicas con plaintext legible por RLS o PostgREST.
- 100% lecturas admin a DX/medicacion/notas generan entrada en `admin_lookups`.
- 100% reservas (con o sin bono) funcionan.
- 100% UPSERTs de nota admin no duplican.
- RLS paciente: no ve DX, medicacion ni notas del terapeuta (verificado con
  JWT real bajo `SET ROLE authenticated`).
