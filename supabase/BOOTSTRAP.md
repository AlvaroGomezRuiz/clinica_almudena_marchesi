# Bootstrap — Supabase y entorno (Clínica Almudena)

Procedimiento de referencia para **proyecto Supabase nuevo**, **entorno limpio** o **recuperación** tras borrados manuales (p. ej. buckets en Storage). La app es **Next.js** (`frontend/`) + **Supabase** (Postgres, Auth, Storage, Realtime, **Edge Functions**). No hay backend FastAPI en este repositorio.

**Documentación relacionada:** `docs/02_operaciones/despliegue-y-operacion.md`, `docs/02_operaciones/reset-datos-demostracion.md`, `docs/02_operaciones/stripe-test-a-live.md`.

---

## 1. Crear o elegir proyecto Supabase

- Dashboard: [https://supabase.com/dashboard](https://supabase.com/dashboard)
- Anotar:
  - **Project URL** → `https://<ref>.supabase.co`
  - **Publishable / anon** → `NEXT_PUBLIC_SUPABASE_ANON_KEY` (o clave publishable según versión del panel)
  - **service_role** → `SUPABASE_SERVICE_ROLE_KEY` (**solo** servidor / CI; nunca en el bundle del cliente)

---

## 2. Aplicar migraciones

Desde la raíz del repo (ajusta rutas si usas otra carpeta):

```bash
npm install -g supabase
cd c:/dev/almudena
supabase link --project-ref <ref>
supabase db push
```

`db push` ejecuta **todos** los ficheros de `supabase/migrations/` en orden numérico (esquema `public`, RLS, Storage **buckets + policies**, Realtime, seeds, funciones SQL, etc.). No sustituye pasos manuales que las migraciones documenten aparte (p. ej. secreto Vault del §3).

---

## 3. Vault — clave `app_encryption_key` (una vez por proyecto)

Tras existir la migración de cifrado (`0022_cifrado_setup.sql` y posteriores que la usan), en **SQL Editor** (rol con permiso sobre `vault`):

```sql
select vault.create_secret(
  encode(gen_random_bytes(32), 'hex'),
  'app_encryption_key',
  'Clave maestra de cifrado simétrico para columnas sensibles'
);
```

Sin esto, operaciones que cifran/descifran en base pueden fallar con error explícito de clave no configurada.

---

## 4. Storage — comprobar buckets

Las migraciones (`0003_storage.sql`, `0013_chat_rgpd_preferencias.sql`, `0020_rgpd_exports.sql`, …) insertan filas en `storage.buckets`. Tras un `db push` en proyecto **nuevo**, en **Storage → Buckets** deberías ver **seis** buckets:

|          `id`       |             Notas breves          |
|---------------------|-----------------------------------|
| `recursos`          | Catálogo terapéutico (privado)    |
| `firmas-rgpd`       | Firmas RGPD (privado)             |
| `avatares`          | Público lectura; subida por dueño |
| `chat-adjuntos`     | Adjuntos del chat (privado)       |
| `paciente-adjuntos` | Adjuntos de ficha (privado)       |
| `rgpd-exports`      | Exportaciones RGPD (privado)      |

**Si borraste los buckets desde la UI:** las migraciones **no** se vuelven a ejecutar solas. En **SQL Editor**, recrea las filas (mismos límites/MIME que en migraciones):

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('recursos', 'recursos', false, 52428800,
    array['application/pdf', 'audio/mpeg', 'audio/mp4', 'video/mp4', 'image/jpeg', 'image/png', 'image/webp']),
  ('firmas-rgpd', 'firmas-rgpd', false, 2097152,
    array['image/png', 'image/jpeg', 'application/pdf']),
  ('avatares', 'avatares', true, 5242880,
    array['image/png', 'image/jpeg', 'image/webp']),
  ('chat-adjuntos', 'chat-adjuntos', false, 26214400,
    array['image/png','image/jpeg','image/webp','image/heic',
          'application/pdf',
          'audio/webm','audio/ogg','audio/mpeg','audio/mp4','audio/wav',
          'video/mp4','video/webm']),
  ('paciente-adjuntos', 'paciente-adjuntos', false, 52428800,
    array['image/png','image/jpeg','image/webp','application/pdf']),
  ('rgpd-exports', 'rgpd-exports', false, 52428800,
    array['application/json', 'application/zip', 'application/octet-stream'])
on conflict (id) do update set
  name                = excluded.name,
  public              = excluded.public,
  file_size_limit     = excluded.file_size_limit,
  allowed_mime_types  = excluded.allowed_mime_types;
```

Comprueba **Storage → Policies** sobre `storage.objects`: deben existir políticas (p. ej. `recursos_admin_all`, `chat_adj_*`, `avatares_*`). Si los buckets existen pero la columna **«Policies»** del listado marca **0**, el `INSERT` en `storage.buckets` **no** restaura reglas: aplica migraciones al día (incluye `0078_restore_storage_objects_policies.sql`) o ejecuta ese fichero en SQL Editor.

---

## 5. Primer usuario administración

1. **Authentication → Users → Add user → Create new user**
   - Email real acordado (ej. titular). Contraseña **solo** en el panel.
   - Marcar email confirmado si el flujo lo exige.

2. **SQL Editor** — rol `admin` (ajusta el correo):

```sql
update public.profiles
   set role = 'admin'
 where lower(email::text) = lower('tu-correo-admin@dominio.tld');

select id, email, role from public.profiles where role = 'admin';
```

3. Tras el primer login como admin, el producto exige **MFA (TOTP)** en `/admin/configuracion` cuando corresponda.

---

## 6. Secretos de Edge Functions

En **Supabase → Project Settings → Edge Functions → Secrets** (nombres habituales del repo; contrastar con `frontend/.env.example` y `docs/02_operaciones/despliegue-y-operacion.md`):

|                    Secreto             |                    Uso típico                     |
|----------------------------------------|---------------------------------------------------|
| `STRIPE_SECRET_KEY`                    | Cobros (`sk_test_…` / `sk_live_…`)                |
| `STRIPE_WEBHOOK_SECRET`                | Firma del webhook (`whsec_…`)                     |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Correo transaccional                              |
| `CRON_SECRET`                          | Proteger crons invocados por URL                  |
| `FRONTEND_URL`                         | Enlaces en emails (ej. `https://ampsicologia.es`) |
| `SENTRY_DSN`                           | Errores en Edge (si aplica)                       |
| `FACTURA_EMISOR_*`                     | PDF factura (si aplica)                           |

`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` suelen estar disponibles en el entorno de funciones; confirma en la documentación vigente del panel.

---

## 7. Desplegar Edge Functions

Con CLI, desde la raíz del repo (sustituye `<ref>`):

```bash
supabase functions deploy health --project-ref <ref>
supabase functions deploy send-email --project-ref <ref>
supabase functions deploy stripe-webhook --project-ref <ref>
supabase functions deploy stripe-checkout --project-ref <ref>
supabase functions deploy stripe-payment-intent --project-ref <ref>
supabase functions deploy cancel-cita --project-ref <ref>
supabase functions deploy cron-recordatorios-24h --project-ref <ref>
supabase functions deploy resend-webhook --project-ref <ref>
supabase functions deploy rgpd-request --project-ref <ref>
supabase functions deploy assign-recurso --project-ref <ref>
supabase functions deploy invoice-pdf --project-ref <ref>
```

Despliega solo las que hayas tocado, o todas en un bootstrap completo.

---

## 8. Stripe — webhook

La URL del endpoint **no** es una ruta bajo el dominio de la web: en este proyecto es la Edge Function:

`https://<ref>.supabase.co/functions/v1/stripe-webhook`

Eventos mínimos alineados con el código: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `payment_intent.succeeded`, `payment_intent.payment_failed`. Detalle y paso a **live**: `docs/02_operaciones/stripe-test-a-live.md`.

---

## 9. Frontend (local)

```bash
cd frontend
npm install
cp .env.example .env.local
```

Rellenar `.env.local` con URL Supabase, claves públicas, `SUPABASE_SERVICE_ROLE_KEY` donde el servidor Next lo necesite, Stripe de prueba, etc. (ver `.env.example`).

```bash
npm run dev
```

Probar login en `/login` y panel en `/admin`.

---

## 10. Datos de demostración / producción limpia

Para **vaciar datos operativos** (citas, chat, pagos, `stripe_events`, …) **sin** quitar migraciones ni catálogo fijo (`servicios`, `bonos_config`, plantillas de horario): `docs/02_operaciones/reset-datos-demostracion.md`.

---

## Troubleshooting

|               Síntoma                     |                                             Qué revisar                                                 |
|-------------------------------------------|---------------------------------------------------------------------------------------------------------|
| `relation public.profiles does not exist` | `supabase db push` no aplicado o proyecto equivocado.                                                   |
| Buckets vacíos en UI tras borrarlos       | §4 — `INSERT` en `storage.buckets`; políticas deberían seguir en `storage.objects`.                     |
| Error de cifrado / vault                  | §3 — `app_encryption_key` en Vault.                                                                     |
| Subidas Storage / avatar / chat adjuntos  | `SUPABASE_SERVICE_ROLE_KEY` en Vercel (rutas `/api/*` que suben con service role) **y** migración `0077_*` aplicada si el chat falla solo con usuario sin ficha.                                                                                                                                            |
| Webhook Stripe 400 firma                  | `STRIPE_WEBHOOK_SECRET` del endpoint **correcto** (test vs live) y URL `…/functions/v1/stripe-webhook`. |

---

*Última revisión alineada con el repo (Next.js + Supabase Edge, migraciones y Storage).*
