# Informe ejecutivo para la clínica (producto y garantías)

> **Destinatario:** responsable de la clínica. **Fecha:** 2026-04-26. **Autor:** ingeniería.  
> **Propósito:** describir con precisión qué hay en producción (o pre-producción), qué puede hacer cada rol, y qué responsabilidades legales/organizativas siguen siendo de la titular (DPIA, textos legales, DPO si aplica).  
> **Detalle técnico profundo:** `docs/01_auditorias/seguridad-rgpd.md` y las auditorías por capa en el mismo directorio `01_auditorias/`.

---

## 1. Qué es el sistema hoy (en una frase)

Una **aplicación web a medida** con **web pública**, **portal del paciente** (citas, pagos, recursos, mensajería, ajustes) y **panel de administración** (agenda, ficha clínica cifrada, facturación, recursos, mensajes, configuración), alojada en **Vercel** (UE) y con datos en **Supabase** (región **eu-central-1**, Alemania) y pagos a través de **Stripe** (infraestructura con compliance PCI; el flujo de tarjeta no pasa por servidores propios en claro).

**Dominio canónico** documentado en el repositorio: `https://ampsicologia.es` y contacto `contacto@ampsicologia.es` (cualquier dominio adicional debe quedar alineado en DNS, Vercel, Supabase y Resend).

---

## 2. Qué puede hacer el paciente (producto)

| Acción | Dónde / cómo (alto nivel) |
|--------|---------------------------|
| Informarse | Páginas públicas: inicio, enfoque, servicios, sobre mí, contacto, legales |
| Registrarse | `/registro-paciente` con aceptación de política y flujo de verificación de email (Supabase Auth) |
| Reservar cita | `/portal/citas/reservar` con huecos reales, pago o bono según reglas de negocio |
| Pagar o bonos | `/portal/pagos` (Stripe, métodos según dashboard: tarjeta, carteras, Klarna, SEPA si se activa) |
| Gestionar citas | `/portal/citas` (incl. cancelación según ventana de **>48h** hacia el futuro, sin reembolso automático forzado a Stripe en el flujo del paciente — ver `0046` en comentario operativo) |
| Mensajería | Chat en tiempo real con posibilidad de adjuntos y notas de voz según límites de la API |
| Recursos asignados | Listado, pestañas, visor de PDF o audio, enlaces a **ver** recurso concreto |
| Ajustes | Tema, notificaciones, **derechos RGPD** (solicitudes) |
| Bienvenida / onboarding | Gate de bienvenida según lógica de `portal-gate` hasta cita o pago |

*Si el flujo concreto difiere de lo anterior por cambio de negocio, la fuente de verdad es el código y las migraciones, no solo este documento.*

---

## 3. Qué puede hacer el profesional / admin

| Acción | Dónde / cómo |
|--------|--------------|
| Ver y gestionar agenda | Vistas en `/admin/agenda` (incl. bloqueos, plantillas según estén configuradas) |
| Pacientes y ficha clínica | Ficha cifrada, secciones editables, notas, diagnósticos, medicación, **imprimir** |
| Listado y contacto | Revelación controlada de contacto, avatares coherentes con portal |
| Facturación y exportaciones | `/admin/facturacion` con KPI, CSV, **asignar bono manual** (método tarjeta / transferencia / regalo / Klarna según migración `0057`) |
| Recursos | Subir, asignar, enlace a visor en admin y portal |
| Mensajes | Bandeja, conversación con misma lógica de cifrado que el paciente |
| Configuración | MFA, preferencias, logs de accesos según lo implementado |

---

## 4. Cómo se protege la información (resumen, no asesoría legal)

| Capa | Explicación breve |
|------|-------------------|
| **Transporte** | HTTPS (TLS) entre el navegador y Vercel/Supabase. |
| **Aplicación** | Cabeceras (CSP, HSTS, etc.) según `next.config.js` — reducen riesgo de inyección y *clickjacking* en el margen de lo razonable en la web. |
| **Cuenta** | Autenticación con contraseña, MFA posible en admin, sesión en cookies httpOnly. |
| **Autorización en base de datos** | Políticas por fila (el paciente A no obtiene filas del paciente B, aunque se invente un ID en la consola). |
| **Cifrado en almacenamiento** | PII y datos clínicos relevantes cifrados en columna; chat en cifrado en reposo; clave vía *vault* (no en el repositorio). |
| **Auditoría** | Trazas de apertura de campos y acciones sensibles, diseño *tamper-evident* en pasos de auditoría. |

**Importante (organizacional):** la clínica debe mantener **revisión legal** de avisos y políticas, **DPIA** si el abogado/DPD lo requiere, y un **proceso** para atender derechos (export, supresión) aunque la plataforma ya tenga trámites técnicos.

**Norma ↔ implementación (tabla de alto nivel):** ver `seguridad-rgpd.md` (capa verde/ámbar/pendiente).

---

## 5. Coste operativo orientativo (no oferta comercial de terceros)

| Partida | Comentario |
|---------|------------|
| Vercel, Supabase, Sentry, Resend (planes gratuitos o bajos) | Suelen empezar en 0€ fijo mientras se respeten cuotas. |
| Stripe | Comisiones por cobro (no almacenamento de PAN en tu servidor). |
| Dominio y correo | Renovación anual del dominio; DNS correctamente enlazado. |
| Crecimiento | Puede ser necesario Supabase Pro / Vercel Pro al subir tráfico o almacenamiento. |

*Cifras puntuales de €/mes: ver `docs/00_proyecto/costes-herramientas.md` (Cursor, dominio, etc.).*

---

## 6. Valor del software (ingeniería)

Criterios, LOC y bandas de **reposición** (rehacer el alcance con un tercero): `docs/02_informes/valor-reposicion-software.md`. **No** es valoración de negocio, marca ni facturación futura.

---

## 7. Preguntas frecuentes (breves)

| Pregunta | Respuesta corta |
|----------|------------------|
| ¿Dónde están mis datos? | En la región de Supabase configurada (almacenamiento de base bajo su DPA; Stripe/Resend con su propio DPA). |
| ¿Puedo cambiar de proveedor? | Los datos de Postgres son exportables (con planificación de **clave de cifrado** y de migración; no es “cambio de host en 1 clíc” sin riesgo). |
| ¿Quién toca el código? | Ingeniería bajo repositorio privado; la titular de la cuenta GitHub/Supabase es la *propietaria* del despliegue. |

---

## 8. Contacto y continuidad

Cualquier incidencia de producto, cambio de normativa, o ajuste de clínica → coordinación con **equipo de ingeniería** y, donde corresponda, con **asesor legal** o **DPD** externo.

*Última revisión sustancial del producto: ver `docs/00_proyecto/cronologia.md` (hitos) y el checklist único de operación `docs/05_operaciones/checklist-produccion.md`.*
