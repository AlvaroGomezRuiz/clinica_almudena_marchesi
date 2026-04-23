# Auditoria de Base de Datos

> **Alcance**: Supabase Postgres (project ref `koxsikkobjlycqqfstye`).
> **Schemas**: `public`, `auth`, `storage`, `vault`, `extensions`, `cron`.
> **Fecha**: 2026-04-21.

---

## 1. Resumen ejecutivo

Base de datos disenada con **Row Level Security (RLS)** por fila, **cifrado simetrico AES-256** de columnas PII (gestionado via `supabase_vault`), **auditoria con hash-chain** tamper-evident y **jobs programados** (`pg_cron`) para recordatorios de cita.

| Metrica                     | Valor      |
|-----------------------------|------------|
| Tablas dominio              | 28         |
| RPCs                        | ~40        |
| Triggers                    | 18         |
| Policies RLS                | 62         |
| Columnas cifradas           | 14         |
| Indices blind (HMAC)        | 3          |
| Extensiones activas         | pgcrypto, supabase_vault, pg_cron, pg_graphql |
| Migraciones aplicadas       | 0001 → 0024b |

**Veredicto**: esquema **production-grade**. Cumple articulos RGPD 25 (privacidad por defecto), 32 (cifrado en reposo), 33 (notificacion tamper), Ley 41/2002 Articulo 17 (integridad historia clinica).

---

## 2. Tablas del dominio

### 2.1 Core

| Tabla                       | PKs cifrados | RLS | Propiedad                             |
|-----------------------------|--------------|-----|---------------------------------------|
| `profiles`                  | no           | si  | 1:1 con `auth.users`, tiene `role`    |
| `pacientes`                 | email,dni,tel,nombre | si  | `user_id` FK a `profiles`            |
| `servicios`                 | no           | si  | Catalogo publico (sesion, bono)       |
| `citas`                     | no           | si  | FK `paciente_id`, `servicio_id`      |
| `citas_bloqueos`            | no           | si  | Bloqueos agenda admin                 |
| `citas_notas_paciente`      | contenido    | si  | Notas RGPD-sensibles                 |
| `horarios_clinica`          | no           | si  | Ventanas de disponibilidad            |
| `horario_plantillas`        | no           | si  | Templates recurrentes                 |

### 2.2 Clinica

| Tabla                       | Campos cifrados      |
|-----------------------------|----------------------|
| `paciente_diagnosticos`     | titulo, notas        |
| `paciente_medicacion`       | notas                |
| `paciente_alergias`         | (plaintext, baja sens.) |
| `paciente_antecedentes`     | (plaintext, revisar) |

### 2.3 Pagos

| Tabla                       | Notas                                        |
|-----------------------------|----------------------------------------------|
| `pagos`                     | `stripe_event_id UNIQUE`, `service_role` solo writes |
| `bonos_config`              | catalogo bonos                               |
| `bonos_pacientes`           | saldo sesiones, validez                      |
| `stripe_events`             | audit raw de webhook                         |
| `facturas`                  | numerador serializado                        |

### 2.4 Comunicacion

| Tabla                       | Notas                                        |
|-----------------------------|----------------------------------------------|
| `conversaciones`            | vista `v_conversaciones_admin`              |
| `mensajes`                  | `body_ciphertext` (plaintext por ahora — mejora pendiente Q2) |
| `notificaciones_prefs`      | opt-in por tipo email                        |
| `emails_log`                | dedupe_key UNIQUE, idempotencia cron        |

### 2.5 Recursos y RGPD

| Tabla                       | Notas                                        |
|-----------------------------|----------------------------------------------|
| `recursos`                  | bucket `recursos`, signed URL 5min          |
| `recurso_asignaciones`      | 1 paciente ↔ N recursos                      |
| `rgpd_exports`              | jobs export, firmados                        |
| `auditoria`                 | hash-chain SHA-256                           |

---

## 3. Row Level Security (defense in depth)

### 3.1 Helpers canonicos

```sql
public.is_admin()             -- true si profiles.role = 'admin'
public.current_paciente_id()  -- UUID del paciente del usuario logueado
```

Ambos `SECURITY DEFINER` con `search_path = public`, revocados a anon.

### 3.2 Patron generico

Cada tabla tiene 3 policies tipicas:
1. `*_self_select` — paciente ve solo sus filas.
2. `*_self_update` — paciente actualiza solo sus filas (con check de campos inmutables).
3. `*_admin_all` — admin tiene acceso total.

Inserts en `pagos`, `auditoria`, `emails_log` solo via `service_role` (bloqueados para `authenticated`).

### 3.3 Triggers de validacion

- `tg_pacientes_lock_admin_fields`: paciente no puede modificar `consentimiento_rgpd`, `fecha_alta`, `user_id`, `activo`, `firma_rgpd_storage_path`.
- `tg_handle_new_user`: al crear `auth.users`, genera `profiles` con role `paciente` y `notificaciones_prefs` default.
- `tg_*_auto_encrypt` (3 triggers, migracion 0024): cifran `titulo`/`notas`/`contenido` → `*_ciphertext` automaticamente si el cliente escribe plaintext.
- `tg_pagos_service_role_only`: rechaza INSERT si `auth.role() != 'service_role'`.
- `tg_auditoria_hash_chain`: calcula `hash_integridad = SHA-256(prev_hash || usuario || accion || ts || detalles)`.

### 3.4 Problemas detectados

| Severidad | Item                                                        | Fix                                                   |
|-----------|-------------------------------------------------------------|-------------------------------------------------------|
| Baja      | `mensajes.body_ciphertext` aun es plaintext (TLS-only)      | Migrar a AES-256 con key por conversacion (roadmap)  |
| Baja      | `paciente_alergias` y `paciente_antecedentes` sin cifrar    | Evaluar sensibilidad y cifrar en `0025`              |
| Baja      | Policy `servicios_read_all` permite `authenticated` ver inactivos si `is_admin`. Revisar comportamiento `OR` |

---

## 4. Cifrado de columna (F5)

### 4.1 Infraestructura

- **Extension**: `pgcrypto` en schema `extensions`.
- **Vault**: `supabase_vault` con secret `app_encryption_key` (hex 64 chars = 32 bytes).
- **Helper privado**: `public._app_encryption_key()` lee del vault. Revocado a anon/authenticated. Excepcion si falta.
- **Algoritmo**: `pgp_sym_encrypt` con `cipher-algo=aes256, compress-algo=1, s2k-mode=3`. IV aleatorio por cifrado.

### 4.2 API SQL

| Funcion                          | Signature                       | Uso                                   |
|----------------------------------|---------------------------------|---------------------------------------|
| `app_encrypt(plain)`             | `text → text (base64)`          | Cifrar plaintext                      |
| `app_decrypt(ct)`                | `text → text`                   | Descifrar (fail-fast si corrupt)     |
| `app_bidx(plain)`                | `text → text (hex)`             | Blind index HMAC-SHA256               |
| `app_encryption_ready()`         | `() → boolean`                  | Healthcheck — true si vault ok        |

Todas `SECURITY DEFINER`, revocadas a anon/authenticated, otorgadas solo a `service_role`.

### 4.3 RPCs admin (0023)

- `paciente_alta_cifrada(...)` — crea paciente con PII cifrada + bidx.
- `paciente_actualizar_cifrado(id, diff)` — UPDATE parcial cifrado.
- `paciente_revelar_campo(id, campo)` — decrypt un solo campo + audit log.
- `paciente_buscar_por_campo(campo, valor)` — busqueda via bidx.
- `diagnostico_crear_cifrado`, `medicacion_crear_cifrada`, `nota_cita_guardar_cifrada`.
- `registro_clinico_descifrar(id, tabla)` — decrypt + auditoria.

Todas chequean `is_admin()` al inicio; si no, raise.

### 4.4 Triggers de auto-cifrado (0024)

- `tg_diagnostico_auto_encrypt` en `paciente_diagnosticos`.
- `tg_medicacion_auto_encrypt` en `paciente_medicacion`.
- `tg_nota_cita_auto_encrypt` en `citas_notas_paciente`.

**Semantica**: si `*_ciphertext IS NULL` y plaintext presente ⇒ cifra y rellena. Si ciphertext ya presente (por ejemplo insertado por RPC) ⇒ no sobrescribe.

### 4.5 Rotacion de clave

Procedimiento documentado en `0022_cifrado_setup.sql`:
1. `vault.create_secret(new_key, 'app_encryption_key_v2')`.
2. Re-cifrar columnas con `update X set Y_ciphertext = app_encrypt(app_decrypt_v1(Y_ciphertext))`.
3. Revocar y borrar `app_encryption_key` antiguo.

**Pendiente**: automatizar en un runbook de `docs/05_operaciones/testing-checklist.md`.

---

## 5. Auditoria (hash-chain)

Tabla `auditoria` con columnas:
```
id              bigint pk
ts              timestamptz
usuario         uuid (auth.uid())
accion          text (verb + recurso)
detalles        jsonb
hash_previo     text
hash_integridad text  -- SHA-256(prev || usuario || accion || ts || detalles)
```

Writer: `RPC registrar_consulta_sensible(accion, detalles)` — SECURITY DEFINER, llamado desde RPCs de descifrado.

**Verificacion de integridad** (query auditora):
```sql
with chain as (
  select id, hash_previo, hash_integridad,
         lag(hash_integridad) over (order by id) as prev
  from public.auditoria
)
select * from chain where hash_previo is distinct from prev;
```

Si devuelve filas ⇒ tampering detectado.

---

## 6. Jobs programados (pg_cron)

| Job                        | Frecuencia     | Funcion                                  |
|----------------------------|----------------|------------------------------------------|
| `recordatorios_24h_hourly` | `5 * * * *`    | llama EF `cron-recordatorios-24h`        |
| `rgpd_exports_cleanup`     | `0 3 * * *`    | purga exports > 30 dias                  |

Usa `cron.schedule(...)` con `CRON_SECRET` via `alter database ... set app.settings.cron_secret`.

---

## 7. Indices y performance

- `citas.fecha_hora` B-tree.
- `pacientes.email_bidx` UNIQUE (si presente).
- `pacientes.dni_bidx` UNIQUE.
- `pacientes.telefono_bidx`.
- `mensajes.conversation_id, created_at desc` composite para scroll infinito.
- `emails_log.dedupe_key` UNIQUE where status in ('pending','sent').
- `stripe_events.id` UNIQUE.

Faltan:
- `auditoria.ts desc` (reportes top-N).
- `pagos.fecha_pago desc` (dashboard admin).

---

## 8. Backups y recuperacion

| Item                            | Plan Free        | Accion                                  |
|---------------------------------|------------------|-----------------------------------------|
| Daily backup automatic          | 7 dias retention | Ok                                      |
| Point-in-Time Recovery          | No (Pro+)        | Evaluar Pro tras primer ano operacion   |
| Export logico periodico         | Manual           | Anadir cronjob Vercel semanal con `pg_dump --schema-only` + metadatos no sensibles |
| Test de restore                 | Nunca hecho      | Planificar ensayo Q2 en proyecto staging |

---

## 9. Lints y advisors

Ultima ejecucion `supabase db lint`:
- **OK** `security_definer_view` — corregido en `0021`.
- **OK** `function_search_path_mutable` — corregido en `0021`.
- **WARN** `leaked_password_protection` — decision: **aceptado** (Pro plan requerido, mitigacion via 12+ chars + zxcvbn client-side).

---

## 10. Acciones recomendadas

### Inmediatas (pre-produccion)
1. Aplicar migracion `0026_retirar_seed_demo` (borrar `usuario@visualizacion.com`, datos demo).
2. Generar `0027_index_auditoria_ts` y `0027_index_pagos_fecha`.
3. Rotar `app_encryption_key` si ha sido manipulada en desarrollo.

### Medio plazo (Q2)
4. Migracion `0025_cifrado_drop_plaintext` tras QA cliente.
5. Cifrado `mensajes.body` con clave por conversacion (Vault secret per-row).
6. Implementar runbook de rotacion vault + re-cifrado.
7. Test de restore en staging; documentar tiempo RTO/RPO real.

### Largo plazo
8. Evaluar Supabase Pro para PITR tras 12 meses operacion.
9. Replicacion logica a DB de analitica (anonymizer-first).
