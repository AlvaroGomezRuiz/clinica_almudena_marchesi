# Informe ejecutivo — Plataforma Digital Clínica Almudena Marchesi

> **Destinatario:** Almudena Marchesi Fernández, titular de la clínica
> **Fecha:** 27 de abril de 2026
> **Propósito:** describir con exactitud qué hay en la plataforma, qué puede hacer cada rol,
> y qué responsabilidades legales/organizativas siguen siendo de la titular.

---

## 1. Qué es el sistema

Una **aplicación web a medida** con tres áreas:

| Área                  | Acceso                    | Funcionalidad principal                                      |
|-----------------------|---------------------------|--------------------------------------------------------------|
| **Web pública**       | España, Portugal, Andorra | Información de la clínica, servicios, registro de pacientes  |
| **Portal paciente**   | Pacientes registrados     | Reservar citas, pagar, mensajería, recursos, facturas PDF    |
| **Panel admin**       | Almudena                  | Agenda, ficha clínica cifrada, facturación, mensajes         |

> **Restricción geográfica:** La plataforma solo es accesible desde **España, Portugal y Andorra**.
> El tráfico desde cualquier otro país se bloquea automáticamente en el perímetro (Edge),
> como medida de seguridad contra ataques y para garantizar el rendimiento óptimo del servicio.

**Dominio:** `https://ampsicologia.es`
**Contacto:** `contacto@ampsicologia.es`
**Alojamiento:** Vercel (UE, Frankfurt) + Supabase (UE, Alemania)

---

## 2. Qué puede hacer el paciente

| Acción                | Descripción                                                         |
|-----------------------|---------------------------------------------------------------------|
| Informarse            | Páginas públicas: inicio, enfoque, servicios, sobre mí, contacto    |
| Registrarse           | Con verificación de email y aceptación de política de privacidad    |
| Reservar cita         | Huecos reales, pago online o consumo de bono                        |
| Pagar                 | Tarjeta, Apple/Google Pay, Klarna (sin datos de tarjeta en servidor)|
| Gestionar citas       | Ver, cancelar (con más de 48h de antelación)                        |
| Mensajería            | Chat en tiempo real con adjuntos                                    |
| Recursos              | Material terapéutico asignado (PDF, audio, vídeo)                   |
| Ajustes               | Tema visual, notificaciones, solicitudes RGPD                       |
| Facturas              | Descargar PDF de cada pago realizado                                |

---

## 3. Qué puede hacer el profesional (Almudena)

| Acción                | Descripción                                                       |
|-----------------------|-------------------------------------------------------------------|
| Agenda                | Vista semanal, bloqueos horarios, plantillas                      |
| Pacientes             | Ficha clínica completa con datos cifrados                         |
| Notas de sesión       | Escribir y editar notas cifradas por cada cita                    |
| Diagnósticos          | Registrar diagnósticos cifrados                                   |
| Medicación            | Registrar medicación cifrada                                      |
| Facturación           | KPIs, exportar CSV, asignar bonos manuales                        |
| Mensajes              | Bandeja de conversaciones con pacientes                           |
| Recursos              | Subir material y asignarlo a pacientes                            |
| Configuración         | MFA, preferencias, perfil profesional público                     |

---

## 4. Cómo se protege la información

| Capa                       | Qué hace                                                      |
|----------------------------|---------------------------------------------------------------|
| **Acceso geográfico**      | Solo España, Portugal y Andorra pueden acceder                |
| **Transporte**             | Toda la comunicación va cifrada (HTTPS/TLS)                   |
| **Cuenta**                 | Contraseña segura + verificación MFA posible en admin         |
| **Base de datos**          | Cada paciente solo ve sus propios datos (Row Level Security)  |
| **Cifrado**                | DNI, nombre, teléfono y notas clínicas cifrados con AES-256   |
| **Auditoría**              | Registro inmutable de quién accede a qué dato y cuándo        |
| **Pagos**                  | Datos de tarjeta nunca pasan por nuestros servidores (Stripe) |

> **Importante:** La clínica debe mantener revisión legal de avisos y políticas, DPIA si el
> asesor/DPD lo requiere, y un proceso para atender derechos (exportación, supresión)
> aunque la plataforma ya tiene la infraestructura técnica.

---

## 5. Emails automáticos

| Email                 | Cuándo se envía                                                    |
|-----------------------|--------------------------------------------------------------------|
| Confirmación de cita  | Inmediatamente al confirmar reserva                                |
| Recordatorio 48h      | Dos días antes de la cita                                          |
| Recordatorio 24h      | Un día antes de la cita                                            |
| Cancelación           | Al cancelar una cita (admin o paciente)                            |
| Bienvenida            | Al registrarse un paciente nuevo                                   |
| Bono comprado         | Al completar la compra de un bono                                  |

---

## 6. Coste operativo orientativo

| Partida                                  | Comentario                                   |
|------------------------------------------|----------------------------------------------|
| Vercel, Supabase, Sentry, Resend         | Planes gratuitos mientras se respeten cuotas |
| Stripe                                   | Comisiones por cobro (sin coste fijo)        |
| Dominio y correo                         | Renovación anual                             |
| Crecimiento                              | Plan Pro necesario al subir tráfico/datos    |

---

## 7. Preguntas frecuentes

| Pregunta                              | Respuesta                                                 |
|---------------------------------------|-----------------------------------------------------------|
| ¿Dónde están mis datos?              | En Supabase, región Alemania (UE)                          |
| ¿Puedo cambiar de proveedor?         | Sí, los datos son exportables (con planificación)          |
| ¿Quién toca el código?               | Ingeniería, bajo repositorio privado                       |
| ¿Qué pasa si se cae el sistema?     | Sentry alerta automáticamente + monitor de uptime           |
| ¿Los pacientes ven datos de otros?   | No. Row Level Security lo impide a nivel de base de datos  |
| ¿Se pueden imprimir datos clínicos?  | Bloqueado por CSS. Solo admin puede ver la ficha           |

---

## 8. Contacto y continuidad

Cualquier incidencia de producto, cambio de normativa, o ajuste de clínica → coordinación
con el **equipo de ingeniería** y, donde corresponda, con el **asesor legal** o **DPD** externo.
