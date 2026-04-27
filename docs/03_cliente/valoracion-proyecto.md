# Valoración del proyecto — Plataforma Digital Clínica Almudena Marchesi

> **Documento confidencial**
> **Fecha:** 27 de abril de 2026
> **Elaborado por:** Álvaro Gómez Ruiz, Developed Freelance
> **Destinatario:** Almudena Marchesi Fernández

---

## 1. Qué se ha construido

No se ha construido "una página web". Se ha desarrollado una **plataforma clínica digital
completa** con tres módulos integrados:

### Módulo público (tu escaparate)

Tu presencia online profesional: páginas de inicio, enfoque terapéutico, servicios,
sobre ti, contacto y toda la parte legal (aviso legal, política de privacidad, cookies).
Optimizada para que Google te posicione en búsquedas como "psicóloga Moncloa",
"psicóloga Chamberí", "terapia individual Madrid". Incluye datos estructurados que
los buscadores entienden directamente (horarios, dirección, especialidad, colegiación).

### Portal del paciente (su espacio privado)

Cada paciente tiene su propio espacio seguro donde puede:

- **Reservar citas** viendo tus huecos reales y pagando online
- **Pagar y gestionar bonos** con tarjeta, Apple Pay, Google Pay o Klarna
- **Escribirte mensajes** en tiempo real (como un WhatsApp privado y seguro)
- **Acceder a recursos** que tú le asignes (PDFs, audios, vídeos)
- **Descargar facturas** en PDF de cada pago
- **Cancelar citas** con las reglas que tú has decidido (más de 48h de antelación)
- **Gestionar sus preferencias** de notificaciones y privacidad

### Panel de administración (tu centro de control)

Tu herramienta de trabajo diaria:

- **Agenda semanal** con bloqueos horarios y plantillas
- **Ficha clínica completa** por paciente (diagnósticos, medicación, notas de sesión)
- **Facturación** con indicadores de negocio, exportación a CSV, asignación manual de bonos
- **Mensajería** con todos tus pacientes desde una sola bandeja
- **Recursos** para subir y asignar material terapéutico
- **Configuración** de seguridad (verificación en dos pasos) y perfil profesional

---

## 2. Lo que no se ve pero es lo más valioso

### Cifrado de datos clínicos (nivel hospitalario)

Todos los datos sensibles de tus pacientes — DNI, nombre completo, teléfono, dirección,
notas de sesión, diagnósticos, medicación — están **cifrados con AES-256**, el mismo
estándar que usan los bancos y los hospitales. Esto significa que aunque alguien accediera
a la base de datos, vería solo texto cifrado ilegible.

### Cumplimiento RGPD (obligatorio para datos de salud)

La plataforma cumple con el Reglamento General de Protección de Datos:

- Consentimiento explícito en el registro
- Derecho al olvido (borrado técnico)
- Exportación de datos del paciente
- Registro inmutable de quién accede a qué dato y cuándo
- Los datos están en **Alemania (UE)**, no en EEUU

### Pagos seguros (PCI-compliant)

Los datos de tarjeta de tus pacientes **nunca pasan por tu servidor**. Stripe
(la misma empresa que usan Booking, Amazon, Shopify) gestiona todo el flujo de pago.
Tú solo recibes la confirmación.

### Restricción geográfica

La plataforma solo es accesible desde España, Portugal y Andorra. Todo el tráfico
del resto del mundo se bloquea automáticamente. Esto protege contra ataques y
asegura el rendimiento.

### Auditoría tamper-evident

Cada acción sensible (abrir una ficha, revelar un DNI, editar un diagnóstico) queda
registrada con una cadena de hashes que hace **imposible alterar el registro** sin
que se detecte. Si algún día tienes una inspección de la AEPD, puedes demostrar
exactamente quién vio qué y cuándo.

---

## 3. Comparativa de mercado

¿Cuánto cuesta un sistema así en el mercado español en 2026?

### Presupuestos de referencia (fuentes: Clutch, Sortlist, tarifas publicadas)

| Proveedor                            | Rango de precio         | Plazo estimado    |
|--------------------------------------|-------------------------|-------------------|
| Freelance senior especializado       | €15.000 – €25.000       | 2–3 meses         |
| Agencia digital pequeña (Madrid)     | €20.000 – €35.000       | 3–4 meses         |
| Agencia digital mediana              | €35.000 – €55.000       | 4–6 meses         |
| Consultora tecnológica grande        | €50.000 – €100.000+     | 6–12 meses        |

### ¿Por qué estos precios?

Un proyecto con estas características incluye normalmente:

| Componente                                | Coste típico aislado   |
|-------------------------------------------|------------------------|
| Web pública con SEO profesional           | €3.000 – €6.000        |
| Portal de pacientes con reservas          | €5.000 – €10.000       |
| Panel de administración clínico           | €5.000 – €12.000       |
| Integración de pagos Stripe               | €2.000 – €5.000        |
| Chat en tiempo real                       | €3.000 – €6.000        |
| Cifrado de datos clínicos (AES-256)       | €4.000 – €8.000        |
| Cumplimiento RGPD para datos de salud     | €3.000 – €7.000        |
| Sistema de emails transaccionales         | €2.000 – €4.000        |
| Facturación y generación de PDF           | €1.500 – €3.000        |
| Auditoría de seguridad y hardening        | €2.000 – €5.000        |
| **Total sumando componentes**             | **€30.500 – €66.000**  |

El precio final de un proyecto integrado suele ser menor que la suma de componentes
porque se comparten infraestructura y código. Pero la referencia da idea del **valor
real** de lo que se ha entregado.

---

## 4. Datos del desarrollo

| Concepto                                 | Dato                                                        |
|------------------------------------------|-------------------------------------------------------------|
| Fecha de inicio                          | 7 de abril de 2026                                          |
| Fecha de finalización                    | 27 de abril de 2026                                         |
| Días de desarrollo                       | 21 días consecutivos                                        |
| Jornada media diaria                     | 13 horas (sábados y domingos incluidos)                     |
| Total de horas invertidas                | ~273 horas                                                  |
| Migraciones de base de datos             | 66                                                          |
| Páginas y rutas de la aplicación         | 50+                                                         |
| Funciones Edge desplegadas               | 8 (pagos, email, RGPD, facturas, salud)                     |
| Herramientas de desarrollo utilizadas    | Cursor Pro (IA), Supabase, Vercel, Stripe, Sentry, Resend   |

---

## 5. Valor de reposición

**¿Cuánto costaría rehacer este proyecto desde cero contratando a un tercero?**

Basándome en las tarifas del mercado español y el alcance real del proyecto:

- **Banda baja (freelance con IA):** €12.000 – €18.000
- **Banda media (agencia pequeña):** €20.000 – €35.000
- **Banda alta (consultora):** €40.000 – €60.000

Este cálculo no incluye el tiempo de comprensión del dominio clínico, las decisiones
de arquitectura de seguridad, ni las iteraciones con la titular para ajustar el producto.

---

## 6. Propuesta de precio

### Precio del proyecto: €5.000

Este precio refleja:

- Una **tarifa reducida** respecto al valor de mercado, en reconocimiento a la
  relación profesional existente
- Las 273 horas de trabajo especializado invertidas
- El valor real de una plataforma que en el mercado costaría entre €20.000 y €40.000
- La entrega de un producto **completo y listo para producción**, no un prototipo

### Forma de pago propuesta

Compensación mediante sesiones de terapia a la tarifa actual (€55/sesión):

| Concepto                    | Cálculo                         |
|-----------------------------|---------------------------------|
| Precio del proyecto         | €5.000                          |
| Ya abonado                  | – €20                           |
| Pendiente                   | €4.980                          |
| Equivalencia en sesiones    | €4.980 ÷ €55 = **~91 sesiones** |

Esto equivale aproximadamente a **1 año y 9 meses de terapia semanal**.

### Lo que incluye este precio

- Plataforma completa desplegada y funcionando
- Código fuente en repositorio privado (propiedad de la titular)
- Documentación técnica y de producto
- Soporte y mantenimiento sin coste adicional
- Actualizaciones de seguridad incluidas

### Lo que NO incluye

- Costes de terceros (Supabase, Vercel, Stripe, dominio) — la titular los paga
  directamente según uso
- Desarrollo de funcionalidades nuevas no contempladas en el alcance actual
- Formación presencial (si se necesita, se acuerda aparte)

---

## 7. Resumen

| Concepto                                     | Valor                  |
|----------------------------------------------|------------------------|
| Valor de mercado del proyecto                | €20.000 – €40.000      |
| Valor de reposición (rehacer desde cero)     | €12.000 – €35.000      |
| **Precio acordado**                          | **€5.000**             |
| Ahorro respecto al mercado                   | 75% – 87%              |
| Forma de pago                                | ~91 sesiones a €55     |
| Mantenimiento incluido                       | Sí, sin coste extra    |

---

*Documento generado como referencia de valoración. No constituye factura ni contrato.*
