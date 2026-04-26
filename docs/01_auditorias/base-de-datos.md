# Auditoría de base de datos (PostgreSQL / Supabase)

> **Fecha:** 2026-04-26 · **Motor:** PostgreSQL 17 (según `supabase/config.toml` · verificar con `SHOW server_version` en remoto).  
> **Fuente de verdad:** `supabase/migrations/*.sql` (orden alfabético = orden de aplicación CLI).

---

## 1. Resumen ejecutivo

| Métrica | Valor aproximado (repo) | Nota |
|--------|--------------------------|------|
| Ficheros de migración `.sql` | 50+ | Puede existir doble ruta o stubs de reconciliación; listar con `Get-ChildItem` |
| Extensiones clave | `pgcrypto`, `pg_cron`, (opcional) `pg_graphql` en función del proyecto | Ver migraciones iniciales y de seguridad `0021` |
| Cifrado en repòsito | PGCrypto + clave vía `supabase_vault` (columnas cifradas) | Fases `0022`–`0024` + ajustes posteriores |
| Chat | `body_ciphertext` + vistas `v_mensajes_chat` (0037 + 0053) | UIs consumen RPC/vistas, no texto plano de tabla en queries directas |
| RLS | Habilitado en tablas de dominio; políticas por `profiles.role` y relaciones | Revisar cada nueva tabla o vista `security_invoker` |

**Veredicto:** esquema alineado con requisitos de **clínica privada en UE**: confidencialidad, trazas de acceso, e integridad (auditoría hash, numeración de factura).

---

## 2. Catálogo de migraciones (1 fichero = 1 fila)

Leyenda: los nombres son **exactamente** los del repositorio a 2026-04-26.

| Fichero | Tema |
|---------|------|
| `0001_init.sql` | Esquema base, funciones de trigger, usuarios |
| `0002_rls.sql` | Políticas RLS iniciales, helpers |
| `0003_storage.sql` | Buckets y policies de storage |
| `0004_realtime.sql` | Publicación realtime |
| `0005_seed_servicios.sql` | Semilla de servicios (histórica) |
| `0006_chat.sql` | Conversaciones y mensajes |
| `0007_disponibilidad.sql` | Reglas de huecos, RPC disponibilidad |
| `0008_seed_demo.sql` | Demo (a retirar pre-prod con `0028` cuando toque) |
| `0009_email.sql` | `emails_log`, prefs, cron básico |
| `0010_stripe.sql` | Bonos, eventos Stripe, pago |
| `0011_cancelacion_asignacion.sql` | Cancelación y asignación |
| `0012_auditoria_ficha_clinica.sql` | Auditoría de ficha |
| `0013_chat_rgpd_preferencias.sql` | Prefs y RGPD de mensajería |
| `0014_horario_plantillas.sql` | Plantillas y horario |
| `0015_agenda_bloqueos_metadata.sql` | Bloqueos de agenda |
| `0016_ficha_mvp_plaintext.sql` / `0017_citas_notas_plaintext_mvp.sql` | Etapas MVP ficha (luego cifrado) |
| `0018_recursos_publico.sql` | Recursos |
| `0019_facturas.sql` | Facturación correlativa |
| `0020_rgpd_exports.sql` | Export RGPD y bucket asociado |
| `0021_security_lints_fix.sql` | Endurecimiento lints, `search_path` |
| `0022_cifrado_setup.sql` | Vault, funciones cifrado |
| `0023_cifrado_rpcs_crud.sql` | CRUD cifrado paciente/ficha |
| `0024_auto_encrypt_triggers.sql` | `BEFORE` triggers auto-cifrado |
| `0026_performance_indexes.sql` | Índices compuestos |
| `0027_ficha_bulk_descifrar.sql` | Carga ficha en bloque |
| `0028_retirar_seed_demo.sql` | Limpieza de demo (go-live) |
| `0029_paciente_autoregistro.sql` | Registro cifrado |
| `0030`–`0033` | Fixes ambigüedad RPC, `admin_lookups`, clínico |
| `0034`–`0036` | Fugas RGPD, notas, bulk DX/med |
| `0037_chat_cifrado.sql` | Cifrado mensajes + `v_mensajes_chat` |
| `0038`–`0040` | RLS prefs/avatars, catálogo pareja, bono manual |
| `0044`–`0046` | Sesión/pareja, conflictos chat, **cancelación paciente >48h** |
| `0047`–`0052` | Ambigüedad PLpgSQL, facturación, correo servicio/mail |
| `0053` | Vista chat `security_invoker` + descifrado |
| `0054` | Citas paciente + adjuntos (display crypto) |
| `0055_realtime_mensajes_adjuntos.sql` | Realtime de adjuntos |
| `0056_disponibilidad_solo_confirmadas.sql` | Regla de confirmación y huecos |
| `0057_bono_manual_metodos_tarjeta_klarna.sql` | Método Klarna en bono manual |
| `0058_servicios_tarifas_55_90_limpiar_catalogo.sql` | Ajuste catálogo y tarifas 55/90 € |
| `0060_recordatorios_24h_y_48h_separados.sql` + `0061_citas_pendientes_recordatorio_48h.sql` | 0060: enum/columna + RPC 24h; 0061: RPC 48h (transacción aparte, evita PG 55P04 con enum nuevo) |

*Si añadís un fichero nuevo, insertad una fila en esta tabla en el mismo PR (política editorial de este repo).*

---

## 3. RPCs reflejadas en TypeScript (extracto de `types.ts`)

Las **firmas** bajo `Database['public']['Functions']` del cliente incluyen, entre otras (lista no exhaustiva de todo el SQL generado, pero sí de lo *tipado* en front):

| RPC | Uso de producto |
|-----|-----------------|
| `is_admin` / `current_paciente_id` | Lógica condicional y RLS |
| `obtener_disponibilidad` / `reservar_cita` | Reservas y conflicto de huecos |
| `chat_*` (mi conversación, enviar, marcar leídos, descifrar) | Chat |
| `registrar_consulta_sensible` | Auditoría de apertura de dato clínico |
| `paciente_alta_cifrada` / `paciente_autoregistro_cifrada` / `paciente_actualizar_cifrado` | Ficha cifrada |
| `paciente_revelar_campo` / `paciente_buscar_por_campo` | Búsqueda ciega (HMAC) + revelado |
| `diagnostico_*` / `medicacion_*` / `nota_cita_guardar_cifrada` | Ficha y sesiones |
| `registro_clinico_descifrar` / `paciente_dx_med_bulk_descifrar` | Lectura masiva segura |
| `bono_asignar_manual` | Administración y facturación |
| `append_auditoria` | Trazas |

**Cualquier RPC añadida** debe actualizarse en `types.ts` (o regenerar tipos) para no romper el contrato TypeScript del workspace.

---

## 4. Buckets (conceptual)

| Bucket lógico | Uso | Notas |
|---------------|-----|-------|
| `avatares` | Imagen de perfil | Política por propietario |
| `recursos` | Ficheros clínicos educativos | Público vs asignado |
| `chat-adjuntos` / `paciente-adjuntos` | Archivos bajo RLS y firmas temporales | Rate limit y MIME en la API de Next |
| `rgpd-exports` o equivalente | Export JSON firmado | Validez temporal, ver Edge `rgpd-request` |
| `firmas-rgpd` | Consentimientos (privado) | Revisar migraciones `0003+` y `0013+` |

---

## 5. Verificación operativa (sin SQL en este doc)

- **Backup y PITR:** dependen del plan Supabase (tema operativo, no de aplicación).  
- **Limpieza de demo:** ejecutar o verificar `0028` en ventana de mantenimiento.  
- **Reconciliación remoto/local:** Hito 17 de `cronologia.md`.  

**Checklist largo de QA:** un solo documento, `docs/05_operaciones/checklist-produccion.md` (Parte B y C).

---

*No sustituye al DPO, DPIA, ni a la revisión legal: ver `seguridad-rgpd.md` para el marco normativo.*
