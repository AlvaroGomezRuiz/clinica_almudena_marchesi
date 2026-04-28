# Informe ejecutivo — Plataforma digital Clínica Almudena Marchesi

> **Para:** Almudena Marchesi Fernández, titular de la clínica
> **Fecha:** 28 de abril de 2026
> **Web:** [https://ampsicologia.es](https://ampsicologia.es)
> **Correo público:** contacto@ampsicologia.es

Este informe resume **qué tenéis hoy en internet**, **qué puede hacer un paciente**, **qué podéis hacer vosotros desde el panel de gestión** y **qué responsabilidades siguen siendo de la clínica** (textos legales, relación terapéutica, asesoramiento jurídico cuando toque).

Si necesitáis **más detalle, captítulos largos y tablas paso a paso**, abrid el archivo **`manual-plataforma-cliente.md`** en la misma carpeta `03_cliente/`: es el documento de referencia diaria.

---

## 1. Qué es el sistema (en una frase)

Es **una sola web** con tres “modos”: la parte **pública** (cualquiera puede leerla), el **portal del paciente** (cada persona ve solo lo suyo) y **vuestro panel de administración** (solo la cuenta de dirección que se haya definido como administradora).

### Las tres zonas y sus direcciones

| Zona                     | Dirección típica                    | Para qué sirve |
|--------------------------|-------------------------------------|----------------|
| Web pública              | `https://ampsicologia.es/`          | Informar, dar confianza, contacto, registro y legales |
| Portal del paciente      | `https://ampsicologia.es/portal`    | Citas, pagos, mensajes, recursos, facturas, ajustes |
| Panel de administración  | `https://ampsicologia.es/admin`     | Agenda, pacientes, ficha, facturación, mensajes, recursos, configuración |

### Un detalle importante: solo ciertos países

Por seguridad y estabilidad, la web **solo acepta conexiones desde España, Portugal y Andorra**. Si un paciente está de viaje en otro continente, es posible que **no pueda entrar** en el portal hasta volver o hasta conectarse desde una red en zona permitida. Conviene **avisar de esto** cuando expliquéis cómo usar la plataforma.

### Dónde “vive” físicamente la información

| Pieza                         | Proveedor (nombre comercial) | Región aproximada |
|-------------------------------|------------------------------|-------------------|
| Lo que se ve en el navegador  | Vercel                       | Unión Europea     |
| Datos, cuentas y archivos     | Supabase                     | Frankfurt (UE)    |
| Cobros con tarjeta            | Stripe                       | Cumplimiento internacional PCI |
| Correos automáticos           | Resend                       | Configuración UE típica |

---

## 2. Qué puede hacer un paciente (lista clara)

| Puede hacer…                    | En la práctica significa… |
|---------------------------------|---------------------------|
| Leer la web sin registrarse     | Conocer servicios, legales, contacto |
| Registrarse como paciente     | Formulario + código al correo + contraseña (mínimo **12 caracteres**) |
| Entrar y recuperar contraseña | Páginas de login y “olvidé mi contraseña” |
| Reservar cita                 | Ve huecos **reales**; paga en la web o usa un **bono** si le corresponde |
| Pagar con tarjeta u otros medios | Depende de lo activado en la cuenta Stripe (Apple Pay, Google Pay, etc.) |
| Ver y cancelar citas          | La cancelación con margen de **más de 48 horas** está pensada para proteger vuestra agenda |
| Escribiros mensajes           | Chat privado con la clínica, con archivos cuando la pantalla lo permita |
| Ver material que le enviéis   | PDFs, audios, vídeos o enlaces que asignéis desde el panel |
| Descargar facturas           | PDF asociado a un pago ya completado |
| Cambiar preferencias          | Tema claro/oscuro, avisos, y trámites de privacidad (RGPD) desde Ajustes |
| Seguir la “bienvenida”        | Hasta que haya **pago**, **bono con sesiones** o **cita confirmada**, la web puede guiarle por un primer paso obligatorio |

Lo que **no** puede: entrar en el panel de administración, ver datos de otro paciente ni saltarse las reglas de pago o cancelación (las comprueba el servidor, no solo la pantalla).

---

## 3. Qué podéis hacer vosotros desde el panel (titular / admin)

| Podéis…                    | En la práctica… |
|----------------------------|-----------------|
| Ver la agenda semanal      | Huecos libres y ocupados, citas y bloqueos (vacaciones, cierres) |
| Gestionar pacientes        | Lista, búsqueda, abrir la ficha de cada persona |
| Documentar la terapia    | Diagnósticos, medicación, notas de sesión (guardados de forma protegida) |
| Ver facturación y exportar | Números resumidos y exportación para gestoría si la usáis |
| Enviar y leer mensajes     | Misma conversación que ve el paciente, desde vuestra bandeja |
| Subir y asignar recursos   | Material terapéutico por paciente |
| Configurar la cuenta       | Foto, nombre público, datos de colegiación, y **doble verificación** de seguridad |

Cada vez que se consulta información especialmente sensible, el sistema puede **dejar constancia** para cumplimiento y transparencia.

---

## 4. Cómo se protege la información (sin jerga innecesaria)

| Capa de protección              | Qué aporta en la vida real |
|---------------------------------|----------------------------|
| Conexión cifrada (candado del navegador) | Lo que se envía por internet va codificado |
| Cuenta con contraseña fuerte    | Menos robos de sesión por prueba y error |
| Separación estricta por paciente | En la base de datos, las reglas impiden mezclar unos con otros |
| Cifrado de lo más sensible      | Aunque alguien obtuviera una copia cruda de “tablas”, lo crítico no se lee sin más |
| Registro de accesos importantes | Se puede demostrar quién consultó qué y cuándo |
| Cobros con Stripe               | Los datos de tarjeta los trata Stripe, no un Excel vuestro |

**Importante:** la plataforma aplica **medidas técnicas y de organización**. La clínica sigue siendo la **responsable del tratamiento** frente al paciente: textos legales al día, tiempo de conservación de datos y, si hace falta, **asesoramiento de un abogado o delegado de protección de datos** externo.

---

## 5. Correos automáticos que recibirán pacientes y vosotros

| Tipo de correo (resumen) | Cuándo se envía |
|--------------------------|-----------------|
| Confirmación de cita     | Cuando la reserva queda firmada (tras pago o bono, según el caso) |
| Recordatorio (unos días antes) | Programación automática antes de la cita |
| Recordatorio (víspera) | Igual, más cerca de la hora |
| Cancelación              | Cuando se anula una cita (desde paciente o desde admin) |
| Bienvenida               | Cuando se completa un alta nueva |
| Compra de bono           | Cuando se paga un paquete de sesiones |
| Nuevo material asignado  | Cuando desde el panel le enviáis un recurso |

Los proveedores de correo y la configuración de dominio los lleva quien mantenga el proyecto; lo relevante para la clínica es saber **que existen** y **qué esperan los pacientes**.

---

## 6. Costes mensuales o anuales (orientativo, no factura)

|             Concepto             |                       Comentario para la clínica                 |
|----------------------------------|------------------------------------------------------------------|
| Alojamiento web y base de datos  | Suelen tener **plan gratuito o de pago** según tráfico y espacio |
| Sentry (registro de errores)     | Ayuda a que un técnico vea fallos antes que los pacientes        |
| Resend (correos transaccionales) | Depende del volumen de emails                                    |
| Stripe                           | Normalmente **comisión por cobro**, no cuota fija por usarlo     |
| Dominio `ampsicologia.es`        | Renovación anual típica de dominio                               |

Los importes exactos cambian cada año y según el uso; el informe de gestión o quien mantenga el proyecto puede daros una **captura de panel** sin mostrar secretos.

---

## 7. Preguntas que suelen hacer al principio

|                     Pregunta                  |                                       Respuesta breve                                   |
|-----------------------------------------------|-----------------------------------------------------------------------------------------|
| ¿Los datos están fuera de Estados Unidos?     | La base principal está referenciada como **Frankfurt (UE)** en la documentación técnica |
| ¿Un paciente puede ver a otro?                | **No**, está impedido por diseño en base de datos                                       |
| ¿Quién puede cambiar el “código” de la web?   | Quien tenga acceso al repositorio privado acordado                                      |
| ¿Qué hago si la web da error?                 | Anotar hora y pantalla (sin datos clínicos visibles) y contactar con soporte técnico    |
| ¿Dónde está el manual largo?                  | `docs/03_cliente/manual-plataforma-cliente.md`                                          |

---

## 8. Continuidad y contacto

Para **cambios de texto**, **nuevas secciones públicas**, **normativa nueva** o **dudas de uso**, coordinad con **quien mantenga el producto**. Para **temas legales puros** (contratos con pacientes, bases de legitimación, plazos de conservación), con vuestro **asesor jurídico** o DPD.
