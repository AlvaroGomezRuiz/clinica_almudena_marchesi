# Producto — Qué incluye la plataforma (inventario)

**Web:** [https://ampsicologia.es](https://ampsicologia.es)
**Correo:** contacto@ampsicologia.es
**Última revisión:** 28 de abril de 2026

Este archivo es el **inventario detallado** de pantallas y procesos tal como están en el proyecto. Sirve para **formación interna**, **auditorías** o para que un técnico nuevo se ubique rápido.

Si lo que buscáis es **lenguaje sencillo solo para la clínica**, abrid primero **`docs/03_cliente/manual-plataforma-cliente.md`**.

---

## Qué es el producto (una frase y cuatro cifras conceptuales)

|        Pregunta         |                               Respuesta corta                                    |
|-------------------------|----------------------------------------------------------------------------------|
| ¿Qué es?                | Una web única con parte pública, portal de paciente y panel de gestión           |
| ¿Para quién?            | Una consulta con una administración central y muchos pacientes con cuenta propia |
| ¿Dónde se ve?           | En el navegador; en móvil u ordenador                                            |
| ¿Dónde están los datos? | En servidores en la Unión Europea (ver documentación de operaciones)             |

---

## Tecnologías (tabla de “con qué está hecho”)

| Capa visible o invisible  | Tecnología (nombre) |             Para qué sirve en la práctica          |
|---------------------------|---------------------|----------------------------------------------------|
| Pantallas y formularios   | Next.js 14          | Web moderna, rápida, buena para SEO                |
| Datos y cuentas           | Supabase (Postgres) | Tablas, permisos, archivos, chat en vivo           |
| Cobros                    | Stripe              | Tarjeta y métodos digitales con seguridad bancaria |
| Correos de negocio        | Resend              | Confirmaciones y recordatorios                     |
| Errores                   | Sentry              | Que un técnico vea fallos sin adivinar             |

---

## Parte pública — páginas que ve cualquier visitante

| Dirección (ruta)        |                Contenido que suele haber                   |
|-------------------------|------------------------------------------------------------|
| `/`                     | Portada: mensaje principal, enlaces a servicios y registro |
| `/enfoque`              | Texto sobre cómo trabajáis                                 |
| `/servicios`            | Listado de tipos de sesión y precios                       |
| `/sobre-mi`             | Perfil profesional                                         |
| `/contacto`             | Formulario o datos de contacto                             |
| `/login`                | Entrada de paciente o de administración                    |
| `/login/mfa`            | Segundo código de seguridad                                |
| `/registro-paciente`    | Alta nueva con verificación por correo                     |
| `/privacidad`           | Política de privacidad                                     |
| `/cookies`              | Política de cookies                                        |
| `/aviso-legal`          | Aviso legal                                                |
| `/pagos`                | Entrada que puede redirigir según el estado de la sesión   |
| `/auth/forgot-password` | Pedir enlace para nueva contraseña                         |
| `/auth/reset`           | Poner nueva contraseña tras el enlace                      |
| `/auth/callback`        | Vuelta automática tras identificación por enlace           |

### Países desde los que se puede abrir la web

| Zona permitida            |                           Motivo resumido                           |
|---------------------------|---------------------------------------------------------------------|
| España, Portugal, Andorra | Menos ataques masivos desde el extranjero y expectativa de datos UE |

---

## Portal del paciente — menú y páginas extra

### Menú lateral estándar

| Nombre en pantalla |       Ruta         |          Función         |
|--------------------|--------------------|--------------------------|
| Inicio             | `/portal`          | Resumen                  |
| Citas              | `/portal/citas`    | Lista y detalle          |
| Bonos y Pagos      | `/portal/pagos`    | Cobros y facturas        |
| Mensajes           | `/portal/mensajes` | Chat                     |
| Recursos           | `/portal/recursos` | Material asignado        |
| Ajustes            | `/portal/ajustes`  | Tema, avisos, privacidad |

### Otras rutas del portal

| Ruta                       |                       Función                      |
|----------------------------|----------------------------------------------------|
| `/portal/bienvenida`       | Primeros pasos hasta “desbloquear” el uso completo |
| `/portal/citas/reservar`   | Elegir día y hora y pagar o usar bono              |
| `/portal/pagos/success`    | Pantalla de “pago correcto”                        |
| `/portal/pagos/cancel`     | Pantalla de “pago cancelado”                       |
| `/portal/recursos/ver/...` | Ver un recurso concreto                            |

### Reserva de cita (flujo resumido)

| Paso |                       Qué ocurre                        |
|------|---------------------------------------------------------|
| 1    | La web pide al servidor los huecos libres reales        |
| 2    | Si hace falta pago, se abre la ventana segura de Stripe |
| 3    | Cuando el cobro es correcto, la cita pasa a confirmada  |
| 4    | Se puede enviar correo de confirmación                  |

### Contraseña mínima del paciente

| Dato                        |         Valor     |
|-----------------------------|-------------------|
| Longitud mínima en pantalla | **12 caracteres** |

---

## Panel de administración — menú y rutas concretas

### Menú estándar

| Nombre en pantalla |          Ruta          |          Función           |
|--------------------|------------------------|----------------------------|
| Inicio             | `/admin`               | Entrada y resúmenes        |
| Agenda             | `/admin/agenda`        | Calendario de la clínica   |
| Pacientes          | `/admin/pacientes`     | Lista                      |
| Mensajes           | `/admin/mensajes`      | Bandeja                    |
| Facturación        | `/admin/facturacion`   | Cifras y exportación       |
| Recursos           | `/admin/recursos`      | Biblioteca de materiales   |
| Configuración      | `/admin/configuracion` | Seguridad y perfil público |

### Rutas con identificador

|            Ruta              |             Función             |
|------------------------------|---------------------------------|
| `/admin/pacientes/alta`      | Crear paciente desde la clínica |
| `/admin/pacientes/...`       | Ficha individual                |
| `/admin/pacientes/.../print` | Vista para imprimir             |
| `/admin/mensajes/...`        | Una conversación abierta        |
| `/admin/recursos/ver/...`    | Previsualizar un recurso        |

### Dónde se guarda la historia clínica (nombres técnicos útiles para informes)

| Nombre de tabla (sistema) |           Contenido de negocio       |
|---------------------------|--------------------------------------|
| `pacientes`               | Persona atendida, datos base         |
| `paciente_diagnosticos`   | Diagnósticos                         |
| `paciente_medicacion`     | Medicación                           |
| `historial_sesiones`      | Notas de sesión                      |
| `citas_notas_paciente`    | Notas ligadas a citas cuando aplique |
| `paciente_adjuntos`       | Archivos clínicos                    |

---

## Integraciones — Stripe y correo

### Stripe (cobros)

| Pieza              |                          Rol                           |
|--------------------|--------------------------------------------------------|
| Pantalla de pago   | Donde el paciente introduce la tarjeta de forma segura |
| Avisos al servidor | Confirman que el dinero está; actualizan citas y bonos |
| Registro de avisos | Permite al técnico ver si un aviso se perdió           |

### Resend (correo de negocio)

| Uso                             |                      Nota                        |
|---------------------------------|--------------------------------------------------|
| Confirmaciones y recordatorios  | Plantillas gestionadas en el código del servidor |
| Webhooks de entrega (si aplica) | Seguimiento de rebotes o fallos                  |

### Tareas programadas (recordatorios)

| Tarea                 |                       Descripción                        |
|-----------------------|----------------------------------------------------------|
| Recordatorios de cita | Programa automático que envía correos antes de la sesión |

---

## Matriz de correos automáticos (orientativa)

|       Tipo de mensaje      |       Cuándo se dispara    |
|----------------------------|----------------------------|
| Bienvenida                 | Tras completar el registro |
| Cita confirmada            | Tras pago o bono válido    |
| Recordatorio (varios días) | Antes de la cita           |
| Recordatorio (víspera)     | Antes de la cita           |
| Cancelación                | Al cancelar                |
| Nuevo recurso              | Al asignar material        |
| Bono comprado              | Al completar la compra     |

---

## Programas en el servidor (Edge) — lista de referencia

Incluyen, entre otros: envío de correo, webhooks de Stripe, creación de intents de pago, checkout, salud del sistema, peticiones RGPD, PDF de factura, asignación de recursos, cancelación de citas, webhooks de Resend. El listado exacto está en la carpeta `supabase/functions/` del repositorio.

---

## Páginas útiles para buscadores y asistentes (público)

| Recurso       |                   Para qué sirve                      |
|---------------|-------------------------------------------------------|
| `sitemap.xml` | Lista de URLs públicas                                |
| `robots.txt`  | Qué puede rastrear un robot                           |
| `llms.txt`    | Resumen para modelos de lenguaje (sin datos clínicos) |

---

## Verdad final

Si este inventario y el código **no coinciden**, **manda el código**. Actualizad este documento cuando cambien pantallas importantes.
