# Base de datos — Migraciones y esquema

> Última actualización: 2026-04-27

## Motor

PostgreSQL 17 en Supabase (`eu-central-1`). Extensions: `pgcrypto`, `supabase_vault`, `pg_cron`.

## Migraciones

| #         | Nombre                           | Descripción                                    |
|-----------|----------------------------------|------------------------------------------------|
| 0001      | `init`                           | Enums, tablas, triggers, índices               |
| 0002      | `rls`                            | Políticas Row Level Security                   |
| 0003      | `storage`                        | Buckets + policies                             |
| 0004      | `realtime`                       | Publication + replica identity                 |
| 0005      | `seed_servicios`                 | Catálogo base                                  |
| 0006      | `chat`                           | Vista admin + RPCs mensajería                  |
| 0007      | `disponibilidad`                 | Horarios + RPCs reserva                        |
| 0009      | `email`                          | Logs, preferencias, crons                      |
| 0010      | `stripe`                         | Bonos, stripe_events, RPCs pago                |
| 0011      | `cancelacion_asignacion`         | Auditoría hash-chain                           |
| 0012–0020 | Ficha, facturas, RGPD            | Módulos clínicos y legales                     |
| 0021      | `security_lints_fix`             | `security_invoker` + `search_path`             |
| 0022–0024 | Cifrado F5                       | pgcrypto + vault + RPCs + triggers             |
| 0026      | `performance_indexes`            | 8 índices compuestos + ANALYZE                 |
| 0028      | `retirar_seed_demo`              | Purga idempotente datos demo                   |
| 0029      | `paciente_autoregistro`          | RPC cifrada auto-registro                      |
| 0030–0036 | Fixes post-E2E                   | Correcciones ambigüedad, leaks, upserts        |
| 0037      | `chat_cifrado`                   | Cifrado mensajes + vista descifrada            |
| 0044–0066 | Iteraciones producto             | Cancelación 48h, horarios, slots, perfil       |

## Tablas principales

| Tabla                  | Propósito                           | RLS          |
|------------------------|-------------------------------------|--------------|
| `profiles`             | Usuarios (admin/paciente)           | Self + admin |
| `pacientes`            | Ficha clínica (PII cifrada)         | Self + admin |
| `citas`                | Reservas y bloqueos                 | Self + admin |
| `servicios`            | Catálogo de terapias                | Auth read    |
| `pagos`                | Registro pagos Stripe               | Self read    |
| `bonos_pacientes`      | Bonos activos                       | Self read    |
| `conversaciones`       | Hilos de chat                       | Participante |
| `mensajes`             | Mensajes cifrados                   | Participante |
| `auditoria`            | Hash-chain tamper-evident           | Admin read   |
| `stripe_events`        | Audit trail webhooks                | Admin read   |
| `emails_log`           | Registro envíos + dedup             | Admin read   |

## Aplicar migraciones

```bash
supabase db push
```
