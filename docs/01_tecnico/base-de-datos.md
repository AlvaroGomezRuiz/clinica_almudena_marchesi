# Base de datos — Qué información guarda el sistema

**Web del proyecto:** [https://ampsicologia.es](https://ampsicologia.es)
**Última revisión:** 28 de abril de 2026

Este archivo sirve para **entender qué “cajones de información” existen** en la plataforma. No hace falta saber programar: las tablas de abajo ponen el **nombre técnico** (como aparece en los informes de ingeniería) y al lado **qué representa en la vida real de la consulta**.

Si solo queréis saber **cómo usar la web día a día**, leed antes **`docs/03_cliente/manual-plataforma-cliente.md`**.

---

## Dónde vive la base de datos

|       Dato        |                           Valor (referencia)                               |
|-------------------|----------------------------------------------------------------------------|
| Tipo de motor     | PostgreSQL (versión moderna, gestionada por Supabase)                      |
| Región            | Unión Europea — **Frankfurt (Alemania)**                                   |
| Sentido práctico  | Los datos personales quedan en el marco UE más habitual de estos servicios |

---

## Cómo se organizan las actualizaciones (migraciones)

Los cambios en la estructura se guardan como **ficheros numerados** en la carpeta `supabase/migrations/`. No se “reescribe el pasado”: se añaden capítulos nuevos. Eso permite saber **qué se cambió y cuándo**.

| Fase letra | Tramo de números (aprox.)  |                           Tema en palabras sencillas                            |
|------------|----------------------------|---------------------------------------------------------------------------------|
| A          | `0001`                     | Primer diseño: personas, citas, pagos base, reglas para que no se solapen citas |
| B          | `0002` a `0004`            | Permisos por fila, almacenamiento de archivos, avisos en tiempo real            |
| C          | `0005` a `0008`            | Servicios iniciales, chat, horarios de la clínica                               |
| D          | `0009` a `0011`            | Registro de correos enviados, cobros con Stripe, trazas de seguridad            |
| E          | `0012` a `0020`            | Ficha clínica ampliada, facturas, peticiones de derechos RGPD                   |
| F          | `0021` a `0024`            | Endurecimiento de seguridad y **cifrado** de lo más sensible                    |
| G          | `0026` en adelante         | Velocidad, borrado de datos de demostración, registro automático de pacientes   |
| H          | `0030` en adelante         | Ajustes tras pruebas, chat cifrado, reglas de cancelación a 48 h, perfiles      |

El detalle exacto de cada fichero está en el propio repositorio; esta tabla es un **mapa de carreteras**.

---

## Tipos de estado (para leer informes sin perderse)

Son **listas cerradas** de valores permitidos (así no hay estados inventados a mano).

| Nombre técnico del tipo |                 Valores posibles (resumen en castellano)        |
|-------------------------|-----------------------------------------------------------------|
| Rol de usuario          | Administración de la clínica **o** paciente                     |
| Estado de una cita      | Reserva temporal, confirmada, completada, cancelada, no asistió |
| Estado de un pago       | Pendiente, en proceso, completado, fallido, reembolsado         |
| Estado de un bono       | Activo, agotado, caducado, anulado                              |
| Estado de un chat       | Abierto, archivado, bloqueado                                   |
| Tipo de recurso         | PDF, audio, vídeo, imagen, enlace u otro                        |
| Categoría de recurso    | Tarea, lectura, ejercicio, evaluación u otro                    |

---

## Tablas principales — nombre técnico y significado

### Cuentas y perfil

| Nombre en el sistema | Qué representa en la clínica |
|----------------------|------------------------------|
| `auth.users`         | Cuenta de acceso (correo, contraseña gestionada por el proveedor de identidad) |
| `profiles`           | Ficha ligada a la cuenta: nombre visible, rol (paciente o admin), avatar, etc. |

### Pacientes, servicios y agenda

| Nombre en el sistema              | Qué representa |
|-----------------------------------|----------------|
| `pacientes`                       | Una fila por persona atendida: datos identificativos y clínicos base (los más sensibles van protegidos) |
| `servicios`                       | Cada tipo de sesión que vendéis: nombre, duración, precio |
| `citas`                           | Una reserva concreta: quién, cuándo, qué servicio, en qué estado |
| `agenda_bloqueos`                 | Franjas en las que **no** se puede reservar (vacaciones, reuniones, etc.) |
| `agenda_notas_dia`                | Nota interna asociada a un día concreto del calendario |
| `horarios_clinica`                | Patrón de apertura semanal |
| `horario_plantillas`              | Modelos reutilizables de horario |
| `agenda_plantilla_aplicaciones`   | Historial de cuándo se aplicó cada modelo |

### Dinero: bonos, pagos y Stripe

| Nombre en el sistema | Qué representa |
|----------------------|----------------|
| `bonos_config`       | Definición de los paquetes de sesiones que se pueden comprar |
| `bonos_pacientes`    | Cada bono ya comprado: cuántas sesiones quedan |
| `pagos`              | Cada cobro: importe, estado, vínculo con la cita o el bono |
| `stripe_events`      | Registro de **cada aviso** que manda Stripe (auditoría de cobros) |
| `facturacion_nota`   | Una nota interna global opcional para facturación |

### Historia clínica

| Nombre en el sistema      | Qué representa |
|---------------------------|----------------|
| `historial_sesiones`      | Notas de sesión ligadas al paciente (contenido sensible) |
| `paciente_diagnosticos` | Diagnósticos asociados al paciente |
| `paciente_medicacion`   | Medicación registrada |
| `paciente_adjuntos`     | Archivos clínicos adjuntos |
| `citas_notas_paciente`  | Notas relacionadas con la cita visibles o compartibles según diseño |

### Mensajería

| Nombre en el sistema  | Qué representa |
|------------------------|----------------|
| `conversaciones`       | Un hilo por paciente con la clínica |
| `mensajes`             | Cada línea del chat (contenido protegido) |
| `mensajes_adjuntos`    | Archivos enviados dentro del chat |

### Material terapéutico

| Nombre en el sistema    | Qué representa |
|--------------------------|------------------|
| `recursos`               | Un fichero subido o un enlace externo |
| `recurso_asignaciones`   | Qué recurso está asignado a qué paciente |

### Cumplimiento, auditoría y correo

| Nombre en el sistema     | Qué representa |
|--------------------------|----------------|
| `auditoria`              | Historial difícil de manipular: acciones importantes |
| `admin_lookups`          | Registro de cuándo alguien de admin “abre” un dato muy sensible |
| `rgpd_requests`          | Peticiones de derechos (copias, supresiones, etc.) |
| `emails_log`             | Qué correos automáticos se mandaron (y evitar duplicados) |
| `email_webhook_events`   | Avisos del proveedor de correo sobre entregas o rebotes |
| `notificaciones_prefs`   | Preferencias de cada usuario sobre avisos |

---

## Índices (solo concepto)

Son “**atajos internos**” para que la web responda rápido cuando hay muchas citas o muchos mensajes. No cambian lo que veis en pantalla; solo la **velocidad** y el consumo de recursos.

---

## Comando que usa el técnico para aplicar cambios

```bash
supabase db push
```

Eso lo ejecuta quien mantenga el proyecto, **nunca** a ciegas en producción sin copia de seguridad.

---

## Verdad final

Si este documento y el código **no coinciden** en el nombre de una tabla o en una descripción, **manda el código y las migraciones**. Este texto es una **guía humana** para la clínica y el equipo; el repositorio es la **fuente exacta**.
