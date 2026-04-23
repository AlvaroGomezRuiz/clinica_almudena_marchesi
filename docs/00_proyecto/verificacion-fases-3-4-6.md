# Verificación FASE 3 · 4 · 6 — 22 abril 2026

> Registro de comprobaciones automáticas y auditoría de código tras los rediseños UI, audio en chat y cierre de calidad.  
> **SEPA bancario en Stripe**: no activado en panel del usuario; la app ya soporta `automatic_payment_methods`; ver `docs/05_operaciones/activar-sepa-stripe.md` o equivalente en `docs/05_operaciones/`.

## 1) Comprobaciones ejecutadas (frontend)

| Comando | Resultado | Fecha |
|---------|-----------|--------|
| `npx tsc --noEmit` (carpeta `frontend/`) | **OK** (exit 0) | 2026-04-22 |
| `npm run build` (Next.js 14) | **OK** — compila, lint+types, 43 rutas | 2026-04-22 |

**Nota de lint en build:** advertencia preexistente `@next/next/no-img-element` en `ChatPanel.tsx` (línea ~470) — no introducida por FASE 4; mejora futura: `next/image` donde aplique a URLs firmadas o dominios permitidos.

## 2) Ámbito funcional verificado (código)

### FASE 3 — Rediseños

- **Ficha admin (`/admin/pacientes/[id]`)**  
  - Patrón **solo lectura + edición por sección**: `FichaSectionEditProvider` + `FichaSectionEditGate`; `EditableSensitiveField` consumía `useFichaSectionEdit()` pero faltaba desestructurar `showFieldEditButtons` — **corregido** (evitaba compilar y dejaba lápiz siempre visibles de forma errónea).  
  - Historial de citas con lista cliente y “Ver más” / paginación.  
- **Portal pagos (`/portal/pagos`)**  
  - Secciones: sesión suelta (individual/pareja), bonos, activos; `servicio_id` en `bonos_config` donde aplica.  
- **Portal recursos (`/portal/recursos`)**  
  - Hero/region “Lectura recomendada” + grid de tarjetas asignados; sin romper estructura de `SurfaceCard` y descargas vía ruta API existente.

### FASE 4 — Audio en chat

- `frontend/src/lib/security/file-validation.ts`: firmas WebM, Ogg, MP3 (ID3v2 + sync), M4A/ISOBMFF con discriminación de `ftyp` por marca (HEIC/AVIF vs audio). **Cruce MIME ↔ bytes** en `POST /api/mensajes/attach`.  
- `attach/route.ts`: allowlist de MIME, `MAX_AUDIO_BYTES` 8 MB para audio, rate limit 20/min por usuario, auth obligatoria.  
- UI: `AudioRecorderButton` con fallback `new MediaRecorder(stream)` si el codec declarado no es aceptado.  
- `ChatPanel`: burbuja `adjunto.tipo === 'audio'` con `<audio controls>` (sin `autoplay`).

### FASE 6 — Calidad

- Typecheck y build: ver §1.  
- Smoke manual: usar `docs/05_operaciones/testing-checklist.md` en el entorno deseado (preview/producción).

## 3) Auditoría breve (seguridad y rendimiento)

| Tema | Evaluación |
|------|------------|
| **Adjuntos** | Tipo validado por magic bytes + MIME; no confiar en extensión; límites de tamaño; rate limit. |
| **Audio** | Menor límite de bytes que genérico 25 MB; no ejecutable como imagen en `<img>`. |
| **PII** | No registrar contenido de audio ni rutas con datos clínicos en logs de esta ronda. |
| **Cifrado ficha** | Flujo existente vía `actualizarPacienteSensiblesAction`; edición acotada a sección abierta. |
| **Rendimiento** | Sin dependencias nuevas pesadas; componentes client acotados; build sin errores. |
| **Móvil** | MediaRecorder: fallback sin `mimeType` evita throw en UAs caprichosos. |

**Heurística M4A (`ftyp` + `mp42`):** `mp42` es contenedor ISOBMFF genérico; el endpoint solo admite `audio/*` declarados; archivos con MIME de vídeo no pasan. Riesgo residual: aceptar contenedor con pistas mixtas; uso previsto = grabación y adjuntos de chat de confianza.

## 4) Archivos principales tocados (referencia de revisión)

- Admin ficha: `FichaSectionEditContext.tsx`, `FichaSectionEditGate.tsx`, `EditableSensitiveField.tsx`, `admin/pacientes/[id]/page.tsx`, `HistorialCitasAdminLista.tsx` (u equivalente de lista).  
- Portal: `portal/pagos/page.tsx`, componentes bajo `components/portal/pagos/`, `portal/recursos/page.tsx`.  
- Chat: `AudioRecorderButton.tsx`, `ChatPanel.tsx`, `ChatAttachButton.tsx`, `api/mensajes/attach/route.ts`, `lib/security/file-validation.ts`.

## 5) Pendiente operativo (no bloquea código)

- Activar SEPA y verificar en Stripe Dashboard (usuario).  
- Re-ejecutar smoke E2E cuando haya despliegue a preview/producción.

---

**Mantenimiento:** al cerrar otra fase, añadir fila a la tabla de §1 y enlazar PR o commit.
