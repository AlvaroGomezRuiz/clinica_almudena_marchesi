# Clínica Almudena Marchesi — Plataforma digital

**Web en producción:** [https://ampsicologia.es](https://ampsicologia.es)
**Correo público:** clinica.almudena.marchesi@outlook.com

Aplicación **full-stack** para una consulta de psicología: **web pública** (marketing, legales, registro), **portal del paciente** (citas, pagos con Stripe, mensajes cifrados, material asignado, facturas, ajustes) y **panel de administración** (agenda, pacientes, ficha clínica con datos sensibles protegidos, facturación, mensajes, recursos, configuración). Todo en el mismo dominio, con **Next.js** (App Router), **Supabase** (PostgreSQL, Auth, Storage, Realtime, Edge Functions) y **Stripe** para cobros.

---



## Stack y proveedores

|           Capa       |        Tecnología / servicio       |                                            Nota breve                                                 |
|----------------------|------------------------------------|-------------------------------------------------------------------------------------------------------|
| Frontend             | **Next.js 14**, React 18, Tailwind | Despliegue habitual en **Vercel** (UE)                                                                |
| Backend de datos     | **Supabase**                       | Base en **Frankfurt (UE)**; **RLS** en tablas; parte del contenido clínico **cifrado** en aplicación  |
| Cobros               | **Stripe**                         | PCI delegado; webhooks en **Edge Function**                                                           |
| Correo transaccional | **Resend**                         | Plantillas y envío desde funciones servidor                                                           |
| Errores              | **Sentry**                         | Diagnóstico en **navegador** y en funciones servidor                                                  |
| Límite de abuso      | **Upstash Redis**                  | Rate limiting donde esté cableado                                                                     |

---



## Arquitectura (visión rápida)

```
┌──────────────┐    HTTPS    ┌──────────────────────┐   reglas en base de datos   ┌───────────────────────┐
│  Navegador   │────────────▶│  Vercel (web en UE)  │────────────────────────────▶│  Supabase (UE)        │
│  del usuario │◀────────────│  pantallas + lógica  │◀────────────────────────────│  datos + sesiones     │
└──────────────┘   cookies   └──────────────────────┘    Realtime / Storage       └───────────────────────┘
                                      ▲
                         webhooks Stripe (Edge) │
```

Los pagos los confirma **Stripe** contra una función en **Supabase Edge**; la web no almacena números de tarjeta.

---



## Estructura del repositorio

|      Ruta   |                                                Contenido                                                                |
|-------------|-------------------------------------------------------------------------------------------------------------------------|
| `frontend/` | App Next.js: rutas públicas, `/portal`, `/admin`, integración Supabase/Stripe, tests E2E (Playwright)                   |
| `supabase/` | Migraciones SQL, **Edge Functions** (`send-email`, `stripe-webhook`, cron de recordatorios, etc.), configuración local  |
| Raíz        |`package.json` con utilidades (p. ej. CLI Supabase); este **README**                                                     |

---



## Desarrollo local (técnicos)

```bash
cd frontend
rtk npm install
copy .env.example .env.local
```

Editad `.env.local` con URL y claves de Supabase, Stripe, Sentry, etc. (quien mantenga el proyecto las proporciona).

```bash
rtk npm run dev
```

Otros scripts útiles en `frontend/package.json`: `build`, `lint`, `test:e2e`, `test:e2e:smoke`.

---



## Variables de entorno (nombres habituales)

|           Variable                                                                   |                                 Uso                                  |
|--------------------------------------------------------------------------------------|----------------------------------------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`                                                           | URL del proyecto Supabase                                            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`                                                      | Cliente público; el acceso real lo limita **RLS**                    |
| `SUPABASE_SERVICE_ROLE_KEY`                                                          | Solo servidor/CI; **no** compartir ni commitear                      |
| `NEXT_PUBLIC_APP_URL`                                                                | Base de la app (p. ej. `https://ampsicologia.es`)                    |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` / `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Stripe público, secreto y firma de webhooks                          |
| `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_AUTH_TOKEN`                                       | Trazas de error (según entorno)                                      |
| `RESEND_*` / `CRON_SECRET` / `FRONTEND_URL`                                          | Correo, protección del cron y URLs en plantillas                     |

Cualquier **secreto** filtrado debe **revocarse** y regenerarse en el panel del proveedor.

---



## Seguridad y cumplimiento (resumen)

|     Tema       |                                  Implementación orientativa                                         |
|----------------|-----------------------------------------------------------------------------------------------------|
| Perímetro geo  | Restricción de tráfico a **ES / PT / AD** cuando está activa la variable de entorno correspondiente |
| Sesiones       | Cookies **httpOnly**; refresh con Supabase SSR                                                      |
| Roles          | **Paciente** vs **admin**; rutas y middleware acotan zonas                                          |
| Datos clínicos | Cifrado en capa de aplicación; consultas sensibles auditables                                       |
| Cobros         | Stripe; eventos registrados para conciliación y soporte                                             |

---



## Supabase: migraciones y funciones

- Las **migraciones** versionan el esquema PostgreSQL (`supabase/migrations/`).
- Las **Edge Functions** cubren correo transaccional, webhooks de Stripe, crons (p. ej. recordatorios 24 h / 48 h antes de la cita), PDFs de factura donde aplique, etc. El inventario exacto está en `supabase/functions/`.

---



## Despliegue

```bash
cd frontend
vercel deploy --prod
```

Las funciones Edge de Supabase se despliegan con la CLI de Supabase (`supabase functions deploy …`) cuando cambien.

---



## Licencia

Código propietario. © Clínica Almudena Marchesi Fernández. Todos los derechos reservados.
