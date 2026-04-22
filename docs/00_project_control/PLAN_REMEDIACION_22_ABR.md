# Plan de remediación — 22 abril 2026

> **Contexto**: auditoría de 17 issues reportados por el cliente (Almudena / Álvaro) tras primera pasada manual de QA sobre Vercel Production.  
> **Objetivo**: dejar la plataforma en estado demo-ready y operativa para el primer paciente real.  
> **Principio director**: arreglar backend antes que UI; validar con `tsc` + `build` después de cada fase.

---

## Tabla de issues y diagnóstico (evidencia auditada)

| # | Issue | Root cause | Fix |
|---|-------|------------|-----|
| 1 | `/portal/pagos` → 401 al comprar bono | `stripe-payment-intent` no está declarada en `supabase/config.toml` → gateway rechaza el JWT antes de ejecutar la función | Declarar función + redeploy |
| 2 | Falta sesión individual suelta y bonos/sesiones de pareja | `bonos_config` sólo tiene 3 bonos individuales (3/5/10). No hay sesión suelta comprable ni pareja | Migration 0038: catálogo extendido |
| 3 | Iconos "RADIO_BUTTON_UNV ED" como texto en /portal/recursos | `radio_button_unchecked` no está en el subset de Material Symbols (nombre generado dinámicamente vía variable → extractor no lo detecta) | Añadir a SAFE_LIST + regenerar fuente |
| 4 | No se puede subir foto de perfil | Storage policy `avatares_owner_write` de `0003` usa `split_part(name, '.', 1)` pero el código sube a `{uid}/avatar.ext`. La policy de `0013` arregla esto pero no borra la antigua | Migration 0039: drop policy vieja |
| 5 | No se pueden guardar preferencias de notificaciones (paciente) | `notificaciones_prefs` no tiene política INSERT para el paciente (sólo UPDATE). Si el trigger no creó fila, el UPSERT falla con RLS error | Migration 0040: añadir INSERT policy propietaria |
| 6 | Falta mensajes de audio en chat | Nunca implementado: componentes + MIME allowlist + render de burbuja audio no existen | Implementar MediaRecorder + ampliar `/api/mensajes/attach` |
| 7 | Vista "Bonos y Pagos" confusa | Mezcla sesiones sueltas, bonos, "sesiones disponibles" (cupón). Sin agrupación clara por tipo | Rediseño: secciones "Sesiones sueltas" / "Bonos" / "Mis bonos activos" |
| 8 | Ficha paciente: exceso de botones / UX densa | Doble fila chips+metric pills, ojo+lápiz por cada campo sensible, historial siempre expandido | Modo "solo lectura" con "Editar sección" por bloque; eliminar duplicidad |
| 9 | Buscador pacientes en /admin/mensajes descentrado + error FK | (a) Alineación flex mal calculada. (b) `listarPacientesQuickAction` devuelve `profiles.id` pero `conversaciones.paciente_id` FK a `pacientes.id` | (a) Fix CSS; (b) Server action JOIN pacientes |
| 10 | "Asignar bono" en /admin/facturacion no hace nada | El botón sólo es un `<Link href="/admin/pacientes">`. No hay RPC ni modal | Crear RPC `bono_asignar_manual` + modal con importe / método (efectivo / transferencia / regalo) |
| — | Transferencia bancaria SEPA en Stripe | Código ya usa `automatic_payment_methods: true` → depende de activar SEPA en Stripe Dashboard. No requiere código | Documentar en `docs/05_operations/STRIPE_SEPA.md` |
| 11 | Dark mode: botones ilegibles | `MobileNavDrawer` usa `text-stone-600/700` hardcoded sin variantes `dark:`. CSS `.nav-pill` sin dark | Parche tokens: `text-ink-soft` + `dark:text-white/70` |
| 12 | Cambio de modo oscuro poco visible | Igual que #11, zonas concretas (agenda admin) con `bg-white/70` sin dark variant | Audit + parches selectivos |
| 13 | /auth/reset → 404 | Página no existe. Callback de Supabase redirige aquí tras click en email de recovery | Crear `/auth/reset/page.tsx` con formulario nueva contraseña |
| 14 | Dos CTAs "Crear cuenta" en /login | Uno en `LoginForm` (inline `¿Primera vez? Crear cuenta`) y otro en el footer de la card | Eliminar el inline; dejar sólo el del footer |
| 15 | Menú móvil ilegible en claro y oscuro | `MobileNavDrawer` con `text-stone-*` fijos → contraste roto | Mismo fix que #11 + revisar backdrop |
| 16 | No se puede cambiar tema en móvil | `ThemeToggle` tiene `hidden sm:inline-grid` en la topbar → invisible <640px. Sólo accesible vía ProfileDropdown | Añadir toggle compacto visible en móvil (ajustar breakpoint) |
| 17 | Recursos portal no se parece al prototipo | Layout actual = 2 cols con pills. Prototipo = hero + lectura semana + grid 4 cols + sección "recientes asignados" | Rediseño completo inspirado en `.prototipo/PORTAL PACIENTE/PORTAL PACIENTE - RECURSOS/code.html` |

---

## Fases y orden de ejecución

### FASE 0 — Fixes críticos (stop-the-bleed)

Backend:

- **M0038**: añadir política INSERT sobre `notificaciones_prefs` para usuario propio.
- **M0039**: borrar policy vieja de `avatares` que rompe el path `{uid}/avatar.ext`.
- `supabase/config.toml`: declarar `[functions.stripe-payment-intent]` con `verify_jwt = true`.

Frontend:

- `listarPacientesQuickAction` → devolver `pacientes.id` (no `profiles.id`).
- Crear `/auth/reset/page.tsx` (formulario con `updatePasswordAction`).
- `LoginForm.tsx` → eliminar enlace inline duplicado "Crear cuenta".
- `extract-icons.mjs` → añadir `radio_button_unchecked`, `task_alt` a SAFE_LIST + regenerar.
- Buscador admin mensajes → corregir alineación vertical (flex items-center).

Criterio de aceptación:

- Paciente puede comprar un bono desde /portal/pagos sin 401.
- Paciente puede hacer toggle de notificaciones sin error RLS.
- Paciente puede subir foto de perfil.
- `/auth/reset` devuelve formulario (no 404).
- Admin puede buscar paciente en /admin/mensajes sin error FK.

### FASE 1 — Catálogo y "Asignar bono"

Backend:

- **M0041**: seed catálogo extendido
  - Sesión individual suelta — 55 €
  - Sesión pareja suelta — 75 €
  - Bono 3 individual — 160 € (existe, normalizar)
  - Bono 5 individual — 260 €
  - Bono 10 individual — 510 €
  - Bono 3 pareja — 215 €
  - Bono 5 pareja — 350 €
  - (Primera consulta mantiene precio existente).
- **M0042**: RPC `bono_asignar_manual(p_paciente_id, p_bono_config_id, p_metodo_pago, p_importe_centimos, p_registrar_facturacion)` + enum `metodo_pago` extendido con `efectivo`, `transferencia_manual`, `gratuito`.

Frontend:

- /admin/facturacion → modal `AsignarBonoManualModal` con: selector paciente → bono → método → importe auto-rellenado → checkbox "registrar en facturación" → "Asignar".
- /portal/pagos → sección "Sesiones sueltas" (individual / pareja) separada de "Bonos".

Docs:

- `docs/05_operations/STRIPE_SEPA.md` — checklist para activar SEPA en Dashboard Stripe.

### FASE 2 — Dark mode + móvil

- `MobileNavDrawer.tsx` → reemplazar `text-stone-*` por tokens + variantes `dark:`.
- `PortalShell.tsx` → cambiar `hidden sm:inline-grid` a `inline-grid` en ThemeToggle (o mostrar compact más pequeño en móvil).
- `globals.css` → `.nav-pill` + `.nav-pill-scrolled` con variantes `.dark`.
- Audit adicional de componentes con `bg-white` sin `dark:` en rutas admin.

### FASE 3 — UX rediseños grandes

- **Ficha paciente admin**: patrón "solo lectura + editar sección". Eliminar `MetricPill` duplicada con `HeaderChip`. Colapsar historia clínica (>5 citas paginadas).
- **Portal recursos**: rediseño inspirado en el prototipo (hero destacado + lectura semana + grid denso + sección recientes).
- **Portal pagos**: agrupación clara "Sesiones sueltas" / "Bonos" / "Mis bonos activos".

### FASE 4 — Audio en chat

- `AudioRecorder.tsx` (MediaRecorder, waveform visual, botón grabar/parar/cancelar).
- Extender `ALLOWED` en `/api/mensajes/attach/route.ts` con `audio/webm`, `audio/ogg`, `audio/mpeg`, `audio/mp4`.
- Ampliar `file-validation.ts` con magic bytes de WebM (0x1a45dfa3) y OGG (0x4f676753).
- `ChatPanel.tsx` → montar `AudioRecorder` a la izquierda del `ChatAttachButton`.
- Render de burbuja: si `adjunto.tipo === 'audio'` → `<audio controls>` con signed URL.

### FASE 5 — Validación y cierre

- `tsc --noEmit` limpio.
- `npm run build` limpio.
- Smoke test manual con `TESTING_CHECKLIST.md`.
- Commit + push.

---

## Criterios de cierre definitivos

| Flujo | Criterio |
|-------|----------|
| Compra bono online | Usuario puede introducir tarjeta, Stripe confirma, bono se activa, aparece en /portal/pagos |
| Compra con SEPA | Activado en Dashboard, aparece opción en Payment Element |
| Asignar bono manual | Almudena registra bono efectivo/regalo, paciente lo ve en su portal |
| Chat audio | Paciente graba, admin reproduce, mensaje queda con icono audio |
| Foto perfil | Paciente y admin pueden subir avatar |
| Dark mode | Todos los botones legibles en claro y oscuro |
| Móvil | Menú, tema y navegación funcionan sin zoom manual |
| /auth/reset | Usuario recibe email, hace click, cambia contraseña, entra |

---

**Autor**: Ingeniero Lead (asistente IA)  
**Fecha**: 22 abril 2026  
**Estado**: FASE 0–2 cerradas; **FASE 3–4 (UX + audio) y FASE 5 (tsc + build)** verificados en repo — `docs/00_project_control/VERIFICACION_FASE3_4_6_22_ABR_2026.md`. SEPA dashboard pendiente (operativo, no de código). Smoke E2E manual según `docs/05_operations/TESTING_CHECKLIST.md` al desplegar.
