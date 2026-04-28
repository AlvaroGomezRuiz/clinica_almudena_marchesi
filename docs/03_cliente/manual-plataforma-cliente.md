# Manual de la plataforma — Clínica Almudena Marchesi

**Para quién es este documento:** Para la **titular**, el **personal autorizado** y, si lo deseáis, para **explicar a los pacientes** cómo usar la web sin tener que repetir lo mismo por teléfono cada vez.

**Web oficial:** [https://ampsicologia.es](https://ampsicologia.es)
**Correo de contacto público:** contacto@ampsicologia.es
**Última revisión del manual:** 28 de abril de 2026

---

## Cómo usar este manual

Podéis leerlo **de arriba a abajo** la primera vez, y después usarlo como **consulta**: el índice siguiente enlaza a cada bloque. Las tablas están pensadas para **imprimirlas** o tenerlas en una segunda pantalla mientras probáis la web.

---

## Índice

|                                      Sección                                       |                          Tema                          |
|------------------------------------------------------------------------------------|--------------------------------------------------------|
| [1. Entrar en la web y países permitidos](#1-entrar-en-la-web-y-paises-permitidos) | Dirección única, España/Portugal/Andorra, tres zonas   |
| [2. Web pública (sin iniciar sesión)](#2-web-publica-sin-iniciar-sesion)           | Qué ve un visitante                                    |
| [3. Alta de un paciente nuevo](#3-alta-de-un-paciente-nuevo)                       | Registro, correo con código, contraseña                |
| [4. Portal del paciente](#4-portal-del-paciente)                                   | Menú, citas, pagos, mensajes, recursos, ajustes        |
| [5. Panel de administración](#5-panel-de-administracion)                           | Lo que solo ve la titular o quien administre           |
| [6. Pagos y facturas](#6-pagos-y-facturas)                                         | Tarjeta, bonos, PDF                                    |
| [7. Mensajes con la clínica](#7-mensajes-con-la-clinica)                           | Chat y archivos                                        |
| [8. Correos automáticos](#8-correos-automaticos)                                   | Qué recibe cada persona y cuándo                       |
| [9. Privacidad y derechos](#9-privacidad-y-derechos)                               | Dónde están los datos, RGPD, tranquilidad legal básica |
| [10. Palabras que a veces salen](#10-palabras-que-a-veces-salen)                   | Glosario en castellano                                 |
| [11. Primer día titular](#11-primer-dia-titular)                                   | Checklist                                              |
| [12. Primer día paciente](#12-primer-dia-paciente)                                 | Checklist                                              |
| [13. Preguntas frecuentes](#13-preguntas-frecuentes)                               | Dudas habituales                                       |
| [14. Si algo va mal](#14-si-algo-va-mal)                                           | Antes de llamar a soporte                              |
| [15. Otros documentos en docs](#15-otros-documentos-en-docs)                       | Qué leer según el rol                                  |

---

## 1. Entrar en la web y paises permitidos

### 1.1 Una sola dirección para todo

Todo funciona en **https://ampsicologia.es**. No hace falta recordar otra dirección: la misma sirve para leer artículos, para que un paciente entre en su espacio y para que la titular entre en el panel de gestión.

### 1.2 Por qué a veces “no carga” desde otro país

Por decisión de seguridad, el acceso está limitado a **España, Portugal y Andorra**. No es un fallo del móvil del paciente: es una **pared automática** frente a tráfico masivo desde sitios muy lejanos.

|                   Situación                   |                      Qué podéis decir al paciente                        |
|-----------------------------------------------|--------------------------------------------------------------------------|
| Está de viaje fuera de ES / PT / AD           | Hasta que no use una red en zona permitida, puede que no entre al portal |
| Intenta desde un país no permitido            | No es bloqueo personal; es regla general del sitio                       |

### 1.3 Las tres “puertas” (pública, paciente, administración)

|       Puerta         |       Quién entra        |                             Qué ve                                      |
|----------------------|--------------------------|-------------------------------------------------------------------------|
| Página pública       | Cualquier visitante      | Textos, servicios, contacto, legales, botón de registro                 |
| Portal del paciente  | Persona con su cuenta    | Solo **sus** citas, pagos, mensajes y material                          |
| Panel administración | Cuenta de dirección      | Agenda de la clínica, **todos** los pacientes autorizados, facturación  |

Si alguien intenta entrar en una zona que no le corresponde, la web le **redirige** al sitio correcto o al inicio de sesión.

---

## 2. Web publica sin iniciar sesion

Objetivo: que una persona que **aún no es paciente** entienda **quién sois**, **qué ofrecéis** y **cómo pedir cita o contacto**.

### 2.1 Mapa de páginas (nombre → dirección → para qué sirve)

|     Nombre habitual    | Dirección (añadir después de ampsicologia.es) |                Para qué sirve                  |
|------------------------|-----------------------------------------------|------------------------------------------------|
| Inicio                 | `/`                                           | Presentación, enlaces destacados               |
| Enfoque                | `/enfoque`                                    | Cómo trabajáis, metodología                    |
| Servicios              | `/servicios`                                  | Tipos de sesión, duración, precios publicados  |
| Sobre mí               | `/sobre-mi`                                   | Trayectoria y confianza profesional            |
| Contacto               | `/contacto`                                   | Formulario o datos de contacto                 |
| Registro paciente      | `/registro-paciente`                          | Alta con verificación por correo               |
| Iniciar sesión         | `/login`                                      | Entrada para paciente o para administración    |
| Verificación extra     | `/login/mfa`                                  | Segundo paso de seguridad si está activado     |
| Olvidé contraseña      | `/auth/forgot-password`                       | Pide enlace al correo                          |
| Nueva contraseña       | `/auth/reset`                                 | Tras pinchar el enlace del correo              |
| Privacidad             | `/privacidad`                                 | Política de protección de datos                |
| Cookies                | `/cookies`                                    | Uso de cookies                                 |
| Aviso legal            | `/aviso-legal`                                | Datos mercantiles / responsable                |
| Pagos (entrada antigua)| `/pagos`                                      | Puede redirigir según el estado de la sesión   |

Los **textos legales** los debe revisar vuestra **asesoría jurídica** cuando cambie la ley o el tipo de tratamiento; la web solo **muestra** lo que haya en el proyecto.

### 2.2 Buscar en Google

La web está preparada para que los buscadores indexen la parte pública y **no** indexen el portal ni el panel de gestión. Eso protege la intimidad y evita que aparezcan enlaces raros a zonas privadas.

---

## 3. Alta de un paciente nuevo

### 3.1 Pasos que vive la persona (orden típico)

| Paso  |         Qué hace la persona          |                    Qué hace el sistema                      |
|-------|--------------------------------------|-------------------------------------------------------------|
|  1    | Rellena el formulario de registro    | Comprueba datos mínimos y consentimientos                   |
|  2    | Recibe un correo con un código corto | Comprueba que el correo es suyo                             |
|  3    | Escribe el código y elige contraseña | Exige al menos **12 caracteres**                            |
|  4    | Entra por primera vez                | Crea su ficha de forma protegida y puede enviar bienvenida  |

### 3.2 Qué implica para la clínica

|                 Pregunta                 |                                                        Respuesta                                                                      |
|------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------|
| ¿Queda registrado como “paciente”?       | Sí, con el rol que corresponde a persona atendida                                                                                     |
| ¿Puede entrar al portal sin pagar nunca? | Puede entrar, pero hay una **fase de bienvenida** hasta que exista **cita confirmada**, **pago** o **bono** según las reglas actuales |
| ¿Sin aceptar privacidad?                 | No debería completarse el alta                                                                                                        |

---

## 4. Portal del paciente

Dirección base: **https://ampsicologia.es/portal**

### 4.1 Menú lateral (lo que ve en todas las pantallas del portal)

| Nombre en pantalla | Subpágina (añadir a `/portal…`)  |           Para qué sirve        |
|--------------------|----------------------------------|---------------------------------|
| Inicio             | `/` (o sea `/portal`)            | Resumen y accesos rápidos       |
| Citas              | `/citas`                         | Lista de citas y estados        |
| Bonos y Pagos      | `/pagos`                         | Historial, compras, facturas    |
| Mensajes           | `/mensajes`                      | Conversación con la clínica     |
| Recursos           | `/recursos`                      | Material que le habéis asignado |
| Ajustes            | `/ajustes`                       | Tema visual, avisos, privacidad |

Además suele aparecer un botón fijo de **“Reservar cita”** que lleva a **/portal/citas/reservar**.

### 4.2 Bienvenida y “desbloqueo” del portal

Hasta que no haya al menos **una** de estas situaciones — **un pago completado**, un **bono con sesiones disponibles** o una **cita ya confirmada o pasada** — el sistema puede mostrar una **pantalla de bienvenida** y dejar limitado el resto.

|                           Motivo (en sencillo)                           |                Beneficio para la clínica               |
|--------------------------------------------------------------------------|--------------------------------------------------------|
| Evita que alguien se registre “por curiosidad” y use el chat sin vínculo | Menos mensajes irrelevantes y menos datos innecesarios |

### 4.3 Citas (qué puede hacer el paciente)

|       Acción        |    Dónde suele estar     |                            Detalle útil                             |
|---------------------|--------------------------|---------------------------------------------------------------------|
| Ver sus citas       | Menú **Citas**           | Ve estado: confirmada, cancelada, etc.                              |
| Pedir nueva cita    | **Reservar cita**        | Solo aparecen huecos **reales** según vuestra agenda                |
| Cancelar            | Detalle de la cita       | Suele exigirse **más de 48 horas** de margen                        |
| Pagar la sesión     | Durante la reserva       | Si no aplica un bono, se abre el pago con tarjeta de forma segura   |

### 4.4 Bonos y pagos

| Acción           |        Dónde       |                         Nota                           |
|------------------|--------------------|--------------------------------------------------------|
| Ver lo pagado    | **Bonos y Pagos**  | Lista histórica                                        |
| Comprar un bono  | Misma zona         | Paquete de varias sesiones cuando esté configurado     |
| Bajar factura PDF| Tras pago hecho    | Documento para su contabilidad o la vuestra según caso |

Los métodos de pago (solo tarjeta, también Apple Pay, etc.) dependen de lo que esté activado en la **pasarela de cobros** que usa el proyecto.

### 4.5 Mensajes

|             Característica            |                 Explicación                     |
|---------------------------------------|-------------------------------------------------|
| Un solo hilo por paciente             | La conversación no se “pierde” entre mil grupos |
| Mensajes guardados de forma protegida | No es un WhatsApp informal suelto               |
| Adjuntos y notas de voz               | Si la pantalla lo permite, según lo subido      |

### 4.6 Recursos (material terapéutico)

|        Ruta resumida       |                Uso                 |
|----------------------------|------------------------------------|
| `/portal/recursos`         | Lista de lo asignado               |
| `/portal/recursos/ver/...` | Abre un PDF, audio, vídeo o enlace |

### 4.7 Ajustes

|     Opción típica      |                   Para qué sirve                     |
|------------------------|------------------------------------------------------|
| Tema claro / oscuro    | Comodidad visual                                     |
| Avisos                 | Menos correo o más, según preferencias               |
| Privacidad / RGPD      | Solicitudes de copia o borrado cuando la ley aplique |

---

## 5. Panel de administracion

Dirección base: **https://ampsicologia.es/admin**
Solo entra quien tenga **cuenta de administración** (normalmente la titular).

### 5.1 Menú principal del panel

|  Nombre en pantalla  |                Subpágina            |             Para qué sirve              |
|----------------------|-------------------------------------|-----------------------------------------|
| Inicio               | `/admin`                            | Resumen y accesos                       |
| Agenda               | `/admin/agenda`                     | Semana, bloqueos, plantillas de horario |
| Pacientes            | `/admin/pacientes`                  | Lista y búsqueda                        |
| Alta de paciente     | `/admin/pacientes/alta`             | Dar de alta desde recepción si lo usáis |
| Ficha de una persona | `/admin/pacientes/` + identificador | Historia clínica administrada           |
| Impresión de ficha   | `/admin/pacientes/.../print`        | Vista para imprimir con cuidado         |
| Mensajes             | `/admin/mensajes`                   | Todas las conversaciones                |
| Facturación          | `/admin/facturacion`                | Cifras y exportación                    |
| Recursos             | `/admin/recursos`                   | Subir y asignar archivos                |
| Configuración        | `/admin/configuracion`              | Seguridad, foto, datos públicos         |

### 5.2 Agenda (día a día)

|     Tarea común       |   Dónde se hace   |                  Resultado                 |
|-----------------------|-------------------|--------------------------------------------|
| Bloquear vacaciones   |     Agenda        | Esos días no se ofrecen huecos             |
| Ver huecos libres     |     Agenda        | Sabéis dónde aún cabe cita                 |
| Plantillas de horario |     Agenda        | Ahorra repetir el mismo patrón cada semana |

### 5.3 Ficha del paciente

|       Tipo de información       |     Quién la ve      |            Comentario        |
|---------------------------------|----------------------|------------------------------|
| Datos identificativos sensibles | Personal autorizado  | Mostrada de forma controlada |
| Diagnósticos y medicación       | Personal autorizado  | Parte de la historia clínica |
| Notas de sesión                 | Personal autorizado  | Vinculadas a las citas       |

Cuando se “destapa” un dato muy sensible en pantalla, el sistema puede **dejar constancia** en un registro de auditoría.

### 5.4 Facturación

|     Función           |                              Utilidad                                   |
|-----------------------|-------------------------------------------------------------------------|
| Ver resumen           | Saber cómo van ingresos y pagos                                         |
| Exportar tabla        | Pasar números a gestoría (con precaución de no mezclar datos clínicos)  |
| Asignar bonos a mano  | Casos excepcionales que no pasen por la web                             |

### 5.5 Seguridad de la cuenta de administración

|        Recomendación       |                              Motivo                           |
|----------------------------|---------------------------------------------------------------|
| Activar doble verificación | Aunque alguien robe la contraseña, falta el segundo código    |
| No compartir la cuenta     | Cada persona debería tener la suya si en el futuro hay equipo |

---

## 6. Pagos y facturas

| Paso |                    Qué ocurre (explicación sencilla)                 |
|------|----------------------------------------------------------------------|
| 1    | El paciente elige pagar en la propia web                             |
| 2    | Se abre la ventana segura del proveedor de cobros (Stripe)           |
| 3    | El dinero sigue el circuito bancario habitual de Stripe              |
| 4    | La web recibe un “aviso de pago correcto” y marca la cita o el bono  |
| 5    | Puede generarse la **factura en PDF** para descargar                 |

| Pregunta del paciente  |                       Respuesta que podéis dar                               |
|------------------------|------------------------------------------------------------------------------|
| ¿Guardáis mi tarjeta?  | **No** en el sentido tradicional: la trata el proveedor de pagos certificado |
| ¿Me llegará un correo? | Sí suele haber confirmación según el caso                                    |

---

## 7. Mensajes con la clinica

|       Pregunta                 |                                         Respuesta                                                     |
|--------------------------------|-------------------------------------------------------------------------------------------------------|
| ¿Es como WhatsApp?             | **Parecido en el uso**, pero vive dentro de la web y con las mismas reglas de privacidad del proyecto |
| ¿Sirve para urgencias médicas? | **No.** Para crisis hay que usar los teléfonos de urgencias sanitarias                                |
| ¿Puedo enviar un PDF grande?   | Depende de límites técnicos; si falla, usar correo o entrega en sesión                                |

---

## 8. Correos automaticos

| Tipo (nombre orientativo) |               Momento típico              |
|---------------------------|-------------------------------------------|
| Bienvenida                | Justo después del alta                    |
| Cita confirmada           | Cuando el pago o bono confirma la reserva |
| Recordatorio (varios días)| Automático antes de la cita               |
| Recordatorio (víspera)    | Automático                                |
| Cancelación               | Cuando se anula la cita                   |
| Bono comprado             | Tras completar la compra                  |
| Nuevo recurso             | Cuando le asignáis material               |

---

## 9. Privacidad y derechos

|            Pregunta frecuente                |                                          Respuesta en cristiano                                                  |
|----------------------------------------------|------------------------------------------------------------------------------------------------------------------|
| ¿Dónde están guardados los datos?            | En servidores de la Unión Europea contratados por el proyecto (documentación técnica indica región de Frankfurt) |
| ¿Quién es el “responsable” ante el paciente? | La **clínica** como titular del tratamiento; la web es una herramienta                                           |
| ¿Puede el paciente pedir copia o borrado?    | Sí puede iniciar trámites desde **Ajustes** según lo implementado; casos límite mejor con asesoría               |
| ¿Se mezclan pacientes?                       | **No** por diseño                                                                                                |

---

## 10. Palabras que a veces salen

| Palabra o sigla |                      Significado sencillo                            |
|-----------------|----------------------------------------------------------------------|
| OTP             | Código de un solo uso que llega al correo para demostrar que es suyo |
| Portal          | Zona privada después de iniciar sesión como paciente                 |
| Panel / Admin   | Zona privada de gestión de la clínica                                |
| Bono            | Varios pagos de sesiones por adelantado                              |
| Webhook         | “Aviso automático” de la pasarela de pago al servidor cuando cobra   |
| RGPD            | Normativa europea de protección de datos personales                  |
| MFA / 2 pasos   | Segundo código además de la contraseña                               |

---

## 11. Primer dia titular

| Paso |                               Acción recomendada                                     |
|------|--------------------------------------------------------------------------------------|
| 1    | Entrar en **ampsicologia.es/login** con la cuenta de administración                  |
| 2    | En **Configuración**, activar el **segundo factor de seguridad**                     |
| 3    | Revisar la **Agenda** y poner **vacaciones** como bloqueadas                         |
| 4    | Subir un **recurso** de prueba y asignarlo a un paciente de prueba si existe         |
| 5    | Hacer una **reserva de prueba** en entorno de pruebas si lo gestiona vuestro técnico |

---

## 12. Primer dia paciente

| Paso |                              Acción                           |
|------|---------------------------------------------------------------|
| 1    | Ir a **ampsicologia.es/registro-paciente**                    |
| 2    | Completar datos y aceptar privacidad                          |
| 3    | Mirar el **correo** (y la carpeta de spam) para el código     |
| 4    | Elegir una **contraseña larga** (12 caracteres o más)         |
| 5    | Seguir las pantallas de **bienvenida** hasta reservar o pagar |
| 6    | Revisar **Mensajes** si la clínica escribe                    |

---

## 13. Preguntas frecuentes

|                  Pregunta                    |                                        Respuesta                                               |
|----------------------------------------------|------------------------------------------------------------------------------------------------|
| ¿Puedo usar el móvil?                        | Sí, la web está pensada para navegador en móvil y ordenador                                    |
| ¿Por qué no veo el menú completo del portal? | Hasta cumplir la **bienvenida / primer pago o cita**, algunas partes pueden estar limitadas    |
| ¿Puedo cancelar el mismo día?                | Normalmente **no** si ya pasó el margen de 48 horas; mirad la pantalla de la cita              |
| ¿Los precios los cambio yo desde el panel?   | Los precios de servicios suelen ser **dato técnico**; consultad con quien mantenga el proyecto |

---

## 14. Si algo va mal

|               Síntoma        |                              Qué anotar antes de llamar                                |
|------------------------------|----------------------------------------------------------------------------------------|
| Pantalla en blanco o “error” | Hora aproximada y **qué botón** pinchó                                                 |
| No llega el código al correo | Si probó **spam** y si el correo estaba bien escrito                                   |
| Pagó y no tiene cita         | **Hora del pago** y captura del **justificante del banco** (sin datos sensibles extra) |
| No entra desde el extranjero | País desde el que prueba                                                               |

---

## 15. Otros documentos en docs

| Si sois… |                                Leed también…                              |
|----------|---------------------------------------------------------------------------|
| Titular  | `valoracion-proyecto.md` si os interesa el alcance económico del proyecto |
| Técnico  | `00_producto/producto.md` y `02_operaciones/despliegue-y-operacion.md`    |
| Gestoría | `informe-ejecutivo.md` + sección de facturación de este manual            |

---

*Si alguna pantalla cambia con una actualización futura, lo que mande es la propia web en vivo; este manual se actualiza cuando se acuerde con el equipo técnico.*
