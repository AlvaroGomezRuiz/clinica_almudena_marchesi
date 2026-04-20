---
fecha: 2026-04-14
fase: 2
proyecto: clinica_almudena
objetivo: "Núcleo operativo de citas (modelos + cifrado + contratos + endpoints + puente TS)"
---

## Objetivo (1 frase)

Implementar el **núcleo de Citas** end-to-end con **modelos SQLAlchemy 2.0 tipados**, **cifrado Fernet obligatorio en campos sensibles**, **contratos Pydantic v2 estrictos**, **router FastAPI para slots + reserva autenticada**, y **contratos TypeScript equivalentes** en el frontend.

## Estado actual (evidencia)

- **Modelos ya existen** en `BACKEND/models/base.py`:
  - `Paciente` y `Cita` ya están definidos, pero en estilo SQLAlchemy “legacy” (`Column(...)`) y sin cifrado transparente a nivel de modelo.
- **Router de citas ya existe**, pero vive en `BACKEND/services/citas.py` (no en `BACKEND/api/v1/citas.py` como requiere esta Fase 2).
  - Incluye endpoints `POST /`, `GET /`, variantes admin, semana/mes/día y bloqueos.
- **Cifrado Fernet** está disponible en `BACKEND/utils/security.py` (`encrypt_data`, `decrypt_data`), pero:
  - `decrypt_data()` devuelve el string `"[DATOS CORRUPTOS O LLAVE INVÁLIDA]"` en vez de fallar (peligroso para datos clínicos).
- **Esquema Pydantic** de citas existente: `BACKEND/schemas/citas_schema.py` (`CitaCreate`, `CitaResponse`).
- **DB session**: `BACKEND/db/session.py` usa `declarative_base()` (legacy), no `DeclarativeBase`/`Mapped`.
- **Alembic**: `BACKEND/alembic/env.py` importa `Paciente`, `Servicio`, `Cita`, etc.

## Decisiones de arquitectura (Nivel Dios)

### A) SQLAlchemy 2.0 tipado sin reventar el sistema

**En vez de** intentar migrar todos los modelos a la vez (alto riesgo), la Fase 2 se centra en:

- Migrar **solo** `Paciente` y `Cita` a estilo SQLAlchemy 2.0 tipado (`Mapped`, `mapped_column`).
- Mantener temporalmente el resto de modelos en legacy si es necesario para no romper endpoints existentes.

**Estrategia recomendada**:
- Crear una base 2.0 (`class Base(DeclarativeBase)`) y unificar gradualmente.
- Si un “big bang” es inevitable, se ejecuta migración completa de `models/base.py` + `db/session.py` + imports de Alembic.

### B) Cifrado obligatorio y transparente (Fernet)

Los campos clínicos/sensibles **no se guardan jamás en claro**. Para evitar errores humanos:

- Implementar un **tipo SQLAlchemy** `EncryptedText` / `EncryptedString` (TypeDecorator) que:
  - En `process_bind_param`: cifra con `encrypt_data()`.
  - En `process_result_value`: descifra con `decrypt_data()`.
  - **Fail-fast** si la key es inválida o el ciphertext está corrupto (no devolver “texto mágico” silencioso).

**Campos candidatos a cifrado mínimo en Fase 2**:
- En `Paciente`: `dni_nie`, `nombre_completo`, `telefono`, `motivo_consulta_inicial`, `motivo_consulta`.
- En `Cita`: en principio no contiene clínica, pero si se añade “observaciones” o “motivo” debe cifrarse.

### C) Índices de búsqueda (blind index)

Ya existen columnas `*_bidx` en `Paciente`:
- `dni_nie_bidx`, `nombre_completo_bidx`, `telefono_bidx`.

Plan:
- Rellenar/actualizar estos índices mediante HMAC (con `SECRET_KEY`) en hooks `before_insert/before_update`.
- El valor en claro **nunca** se usa para búsquedas: se busca por `*_bidx`.

### D) Reservas sin solapamientos (anti race-condition)

MySQL no soporta “exclusion constraints” tipo Postgres. La reserva debe ser segura:

Opciones:
- **Opción 1 (recomendada)**: transacción + `SELECT ... FOR UPDATE` sobre citas potencialmente solapadas + re-check antes de insertar.
- Opción 2: lock por “day bucket” (tabla lock por día) y serializar reservas por día.

En ambos casos:
- Reglas de solape: \((new.start < existing.end) \land (new.end > existing.start)\)
- Bloqueos (`AgendaBloqueo`) cuentan como no-disponible.

## Contratos (Pydantic v2) — sin `Any`

Se definen 2 familias:

1) **Slots libres (GET)**
- `FreeSlotsQuery`: `from_iso`, `to_iso`, `duracion_min`, `servicio_id?`
- `FreeSlotItem`: `inicio_iso`, `fin_iso`
- `FreeSlotsResponse`: `items: list[FreeSlotItem]`

2) **Reserva (POST)**
- `CitaReserveRequest`: `servicio_id`, `inicio_iso` (el backend calcula `fin_iso` con la duración del servicio)
- `CitaReserveResponse`: `cita_id`, `inicio_iso`, `fin_iso`, `estado`

Validaciones:
- `inicio_iso` debe estar dentro de rango permitido (p. ej. no pasado, no más de X meses).
- `duracion_min` debe ser positiva y razonable (p. ej. 15–180).

## Endpoints FastAPI (Fase 2 requerida)

Archivo requerido: `BACKEND/api/v1/citas.py` (nuevo).

Rutas:
- `GET /api/v1/citas/slots`
  - Devuelve huecos libres (no bloqueados y sin citas activas solapadas).
- `POST /api/v1/citas/reservar`
  - Requiere JWT válido (dependencia `get_current_user` desde `BACKEND/utils/security.py`).
  - Identifica al paciente desde el `sub` (email/username) → `Usuario` → `Paciente` (por `email` o por FK si existe).

Nota: hoy existe `BACKEND/services/citas.py` con `router`. En Fase 2 se decide:
- **Opción A (limpia)**: mover/re-exportar la lógica actual desde `services/citas.py` hacia `api/v1/citas.py`, manteniendo compatibilidad.
- **Opción B (incremental)**: crear `api/v1/citas.py` solo para slots+reserva, y dejar `services/citas.py` como “admin/agenda legacy” hasta migración.

Recomendación: **Opción B** para minimizar blast radius, y luego consolidar en Fase 3.

## Puente Frontend (contratos TypeScript)

Crear un módulo de contratos tipados en frontend (nuevo directorio propuesto):

- `FRONTEND/src/contracts/citas.ts`
  - `export interface FreeSlotsQuery { ... }`
  - `export interface FreeSlotItem { ... }`
  - `export interface FreeSlotsResponse { items: FreeSlotItem[] }`
  - `export interface CitaReserveRequest { ... }`
  - `export interface CitaReserveResponse { ... }`

Cliente:
- `FRONTEND/src/services/citas.ts` (nuevo)
  - funciones tipadas `getFreeSlots(query)` y `reserveCita(payload)` usando `fetch` o `api` (axios) con `NEXT_PUBLIC_BACKEND_API_URL`.

Regla: **no `any`, no `unknown` sin type guard**.

## Archivos a tocar (exactos) y acciones

### Backend — Base de datos / modelos
- **MODIFICAR** `BACKEND/db/session.py`
  - Migrar a SQLAlchemy 2.0 typing (o crear base 2.0 paralela si se decide incremental).
- **MODIFICAR** `BACKEND/models/base.py`
  - Migrar `Paciente` y `Cita` a `Mapped[...]`.
  - Añadir cifrado transparente vía TypeDecorator o descriptor.
  - Añadir hooks para blind indexes (`*_bidx`).
- **CREAR** `BACKEND/db/types/encrypted.py`
  - TypeDecorators `EncryptedString`, `EncryptedText`.
- **CREAR** `BACKEND/db/events/paciente_bidx.py`
  - `before_insert/before_update` para `Paciente`.
- **MODIFICAR** `BACKEND/alembic/env.py`
  - Ajustar imports si cambia Base o modelos.

### Backend — contratos (Pydantic)
- **MODIFICAR** `BACKEND/schemas/citas_schema.py`
  - Reemplazar/expandir para `slots` y `reserve` sin `Any`, con `extra="forbid"`.

### Backend — endpoints
- **CREAR** `BACKEND/api/v1/citas.py`
  - `GET slots` + `POST reservar` (JWT obligatorio en POST).
- **MODIFICAR** `BACKEND/main.py`
  - `include_router` del nuevo router en `prefix="/api/v1/citas"`.

### Frontend — contratos + cliente
- **CREAR** `FRONTEND/src/contracts/citas.ts`
- **CREAR** `FRONTEND/src/services/citas.ts`

## Diseño de la tabla de citas (estructura)

Tabla `citas` ya existe con:
- `id`, `paciente_id`, `servicio_id`, `inicio_iso`, `fin_iso`, `estado`, `activo`.

Reforzamiento propuesto:
- Índices:
  - `idx_citas_inicio` (`inicio_iso`)
  - `idx_citas_activo_inicio` (`activo`, `inicio_iso`)
  - `idx_citas_activo_fin` (`activo`, `fin_iso`)
- (Opcional) `created_at`/`updated_at` para trazabilidad.

## Criterios de éxito (para validar tu aprobación del plan)

- Modelos `Paciente`/`Cita` quedan con tipado SQLAlchemy 2.0 y **cifrado automático** en campos definidos.
- No hay `Any` en Pydantic ni en TS.
- `POST /api/v1/citas/reservar` rechaza sin JWT.
- `GET /api/v1/citas/slots` lista huecos válidos respetando bloqueos y colisiones.
- Contratos TS compilan y el cliente consume API sin casts.

---

**Gate**: Plan escrito. Me detengo aquí, sin escribir código de la Fase 2 hasta que valides `DOCS/PLAN_FASE_2.md`.

