# Bootstrap — Clínica Almudena (Supabase)

Procedimiento **único** para arrancar el sistema en producción o en un entorno limpio.

---

## 1. Crear proyecto Supabase

Opción A (recomendada): desde la dashboard `https://supabase.com/dashboard`.
Opción B: desde Supabase CLI (`supabase projects create clinica-almudena`).

Anota:
- **Project URL** → `https://<ref>.supabase.co`
- **anon key** (para `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- **service_role key** (para el backend FastAPI — NUNCA en frontend)

---

## 2. Aplicar migraciones

```bash
# Instalar CLI (una sola vez)
npm install -g supabase

# Linkar el proyecto local con el remoto
cd c:/dev/almudena
supabase link --project-ref <ref>

# Aplicar migraciones (orden garantizado por prefijo numérico)
supabase db push
```

Esto ejecuta en orden:
1. `0001_init.sql` — esquema completo
2. `0002_rls.sql` — políticas RLS
3. `0003_storage.sql` — buckets
4. `0004_realtime.sql` — publicaciones
5. `0005_seed_servicios.sql` — catálogo inicial

---

## 3. Crear el admin Almudena

**Paso 3.1 — Crear auth.user desde la Dashboard:**
`Authentication → Users → Add user → Create new user`
- Email: `almudena@clinicaalmudena.es` (el real)
- Password: generada segura (mín 12 chars)
- Auto Confirm User: ✅

**Paso 3.2 — Promover a admin.**
Ejecuta el siguiente SQL en `SQL Editor` de la dashboard:

```sql
-- Reemplaza el email por el real:
update public.profiles
   set role             = 'admin',
       display_name     = 'Almudena Marchesi Fernández',
       numero_colegiada = 'M-XXXXX'
 where email = 'almudena@clinicaalmudena.es';

-- Verifica:
select id, email, role, numero_colegiada
  from public.profiles
 where role = 'admin';
```

**Paso 3.3 — Enrolar MFA (primera vez):**
Al hacer login la primera vez, el admin será redirigido a `/admin/configuracion`
donde encontrará el flujo de enrolamiento TOTP (QR + verificación). Obligatorio.

---

## 4. Configurar el frontend

```bash
cd FRONTEND
cp .env.example .env.local
# Edita .env.local con las keys anotadas en el paso 1
```

---

## 5. Configurar el backend (service_role)

```bash
cd BACKEND
# Crear .env con:
#   SUPABASE_URL=https://<ref>.supabase.co
#   SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
#   DATABASE_URL=postgresql://postgres:<db_password>@db.<ref>.supabase.co:5432/postgres
#   STRIPE_SECRET_KEY=sk_test_xxx
#   STRIPE_WEBHOOK_SECRET=whsec_xxx
#   PII_ENCRYPTION_KEY=<base64 32 bytes>   # clave AES-256-GCM para cifrar PII
```

Generar clave de cifrado PII:
```python
import secrets, base64
print(base64.b64encode(secrets.token_bytes(32)).decode())
```

---

## 6. Primer arranque

```bash
# Terminal 1 — backend
cd BACKEND && .\venv\Scripts\activate && uvicorn main:app --reload

# Terminal 2 — frontend
cd FRONTEND && npm run dev
```

Visita `http://localhost:3000/login`, entra con Almudena, enrola MFA y listo.

---

## Troubleshooting

- **Error `relation public.profiles does not exist`** → olvidaste `supabase db push`.
- **RLS bloquea queries** → revisa que el JWT tenga el `role` correcto en `profiles`.
- **CSP bloquea Supabase** → verifica que `NEXT_PUBLIC_SUPABASE_URL` esté en `.env.local` antes de arrancar Next.js.
