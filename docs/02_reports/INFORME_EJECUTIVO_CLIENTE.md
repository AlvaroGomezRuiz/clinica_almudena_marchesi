# Informe Ejecutivo para la Clinica

> **Destinatario**: Almudena Marchesi Fernandez (cliente)
> **Autor**: equipo de ingenieria
> **Fecha**: 21 de abril de 2026
> **Proposito**: explicar, en terminos comprensibles, el estado del sistema digital de la clinica y las garantias de seguridad con las que cuenta.

---

## 1. Que tienes hoy

Una **plataforma profesional completa** con tres piezas:

1. **Web publica** — para que cualquier persona te descubra y pida cita.
2. **Portal del paciente** — donde el paciente reserva, paga, lee sus recursos y se comunica contigo.
3. **Portal de administracion** — tu panel privado con agenda, fichas, facturacion, chat y configuracion.

Todo conectado entre si y alojado en infraestructura **de grado bancario** (Vercel + Supabase), replicada automaticamente en Europa (Frankfurt, Alemania) — cumpliendo la normativa europea.

---

## 2. Que puede hacer tu paciente

| Accion                                     | Como                                                |
|--------------------------------------------|-----------------------------------------------------|
| Buscar informacion sobre tu enfoque        | Web publica (home, enfoque, servicios, sobre mi, contacto) |
| Registrarse con email + contrasena segura  | `Registro paciente` con aceptacion de RGPD + firma   |
| Reservar una cita                          | Calendario con huecos reales de tu agenda            |
| Pagar una cita o comprar un bono           | Stripe directo en la pagina (Apple Pay, tarjeta, Bizum, Klarna) |
| Ver su historial y sus notas personales    | Portal paciente → Citas                              |
| Leer recursos que le has asignado          | Portal paciente → Recursos                           |
| Chatear contigo en tiempo real             | Portal paciente → Mensajes (con adjuntos y audio)    |
| Editar su perfil, tema claro/oscuro        | Portal paciente → Ajustes                            |
| Solicitar derecho RGPD (export / borrado)  | Portal paciente → Ajustes → RGPD                     |
| Recibir recordatorios automaticos          | Email 24h antes (si opt-in)                          |

---

## 3. Que puedes hacer tu

| Accion                                      | Como                                                    |
|---------------------------------------------|---------------------------------------------------------|
| Ver agenda semanal, diaria, mensual         | Panel `/admin/agenda`                                   |
| Crear plantillas de horario                 | `/admin/agenda` → Plantillas                            |
| Bloquear dias (vacaciones, enfermedad)      | `/admin/agenda` → Bloqueos con color + nota             |
| Dar de alta pacientes manualmente           | `/admin/pacientes/alta`                                 |
| Consultar ficha clinica cifrada             | `/admin/pacientes/[id]` (con trazabilidad del acceso)  |
| Anadir diagnosticos y medicacion cifrada    | Dentro de la ficha del paciente                         |
| Exportar historial (PDF / JSON)             | Boton en la ficha                                       |
| Revisar bonos activos                       | `/admin/pacientes/[id]` → Bonos                         |
| Gestionar todos los pagos                   | `/admin/facturacion` con export CSV                     |
| Emitir facturas con tu NIF + COPM + REGCESS | Automaticas tras cada pago + PDF descargable            |
| Responder mensajes de pacientes             | `/admin/mensajes` con panel ficha lateral               |
| Subir recursos (PDF, audio)                 | `/admin/recursos`                                       |
| Asignar recursos a pacientes concretos      | Boton en cada recurso                                   |
| Activar MFA (autenticador movil)            | `/admin/configuracion`                                  |
| Consultar logs de accesos                   | `/admin/configuracion` → Logs                           |

---

## 4. Como protegemos los datos del paciente

La normativa en Espana te obliga, como psicologa, a proteger los datos clinicos con **medidas apropiadas al nivel maximo** (RGPD Art. 32, Ley 41/2002). Esto es lo que hay:

### Capa 1: la conversacion es secreta
Todo el trafico entre el navegador del paciente y nuestros servidores viaja **cifrado** con el mismo protocolo que usa tu banco (TLS 1.3). Un atacante que intercepte la red **no vera nada**.

### Capa 2: el navegador esta blindado
El navegador recibe instrucciones estrictas: no puede abrir tu web dentro de otra pagina falsa, no puede ejecutar codigo inyectado por intrusos, no puede pedir permisos de camara o microfono por sorpresa.

### Capa 3: cada persona ve solo lo suyo
Cuando un paciente entra, el sistema verifica en milisegundos:
- **Quien eres** (autenticacion con contrasena robusta y, opcionalmente, MFA).
- **Que puedes ver** (Row Level Security: el paciente A no puede, por diseno, ver nada del paciente B — ni aunque modifique la URL manualmente).

### Capa 4: los datos sensibles estan cifrados en la propia base de datos
Nombres, DNI, telefonos, direcciones, diagnosticos, notas clinicas: **se guardan cifrados** con AES-256 (mismo estandar que usan gobiernos y bancos). Sin la clave maestra, la base de datos es un fichero de ruido ilegible.

La clave maestra vive en una "caja fuerte" (Supabase Vault), nunca en un archivo del codigo, nunca en un email, nunca en un post-it.

### Capa 5: todo acceso queda grabado
Cada vez que alguien (incluida tu) consulta un dato sensible, se registra:
- Quien ha sido.
- Cuando.
- Que campo.
- Desde donde.

Este registro se guarda en formato **tamper-evident** (si alguien intentase modificarlo a posteriori, se detectaria al instante por una huella digital encadenada).

---

## 5. Cumplimiento normativo

| Norma                                        | Estado                                 |
|----------------------------------------------|----------------------------------------|
| **RGPD** (Reglamento Europeo)                | Tecnico: cubierto. Legal: pendiente DPIA formal |
| **LOPDGDD** (Ley Organica Espana)            | Tecnico: cubierto                      |
| **Ley 41/2002** (Autonomia del paciente e historia clinica) | Tecnico: cubierto (Art. 15, 16, 17, 18) |
| **Ley 34/2002** (LSSI - comercio electronico) | Paginas legales creadas como plantilla |

**Importante**: tu abogada debe revisar los textos legales (`/aviso-legal`, `/privacidad`, `/cookies`) antes de publicar. Son plantillas base que deben adaptarse a tu caso concreto (NIF real, direccion fiscal real, responsable del tratamiento, etc.).

---

## 6. Que pasa si algo falla

### Si se cae un servicio externo
- **Vercel cae** (el hosting de la web): muy improbable, 99.99% uptime. Si ocurre, se recupera automaticamente en minutos.
- **Supabase cae** (la base de datos): tambien 99.99% uptime. En caso extremo, restauramos desde backup automatico (se hace cada 24h).
- **Stripe cae** (los pagos): el paciente vera un error claro y podra reintentar. Las reservas se marcan como "pago pendiente" sin confirmar la cita.

### Si alguien intenta atacar
- Los intentos de fuerza bruta al login estan limitados (rate limiting).
- Las contrasenas se almacenan cifradas con bcrypt (no podemos verlas ni nosotros).
- Los pagos nunca tocan nuestros servidores: van directos a Stripe (PCI-DSS).
- Un ataque XSS/SQL injection no tiene efecto gracias a las capas 2 y 3.

### Si un paciente pierde su contrasena
- Se envia un enlace de recuperacion a su email (valido 1 hora).
- Si activa MFA, necesitara su codigo de recuperacion adicional.

### Si tu pierdes tu contrasena
- Lo mismo que un paciente + recuperacion por telefono (via mail a clinica.almudena.marchesi@outlook.com).
- Si ademas pierdes tu MFA: hay que restaurar con codigo de recuperacion (el que copiaste al activarla). Guardalo en Bitwarden.

---

## 7. Coste operativo estimado

| Servicio                      | Plan actual | Coste mensual | Que cubre                         |
|-------------------------------|-------------|---------------|-----------------------------------|
| Vercel                        | Free        | 0 EUR          | Hosting web, hasta 100k visitas/mes |
| Supabase                      | Free        | 0 EUR          | Base de datos, auth, edge, 500MB  |
| Stripe                        | N/A        | comision 1,5% + 0,25 EUR por cobro | Pagos con tarjeta                 |
| Resend                        | Free        | 0 EUR          | 3.000 emails/mes                  |
| Dominio (ej. clinicamarchesi.es) | -         | ~12 EUR/ano    | Registro con tu proveedor        |
| Sentry                        | Free        | 0 EUR          | 5k errores/mes monitorizados      |

**Total fijo mensual**: **~1 EUR/mes** (domino prorateado) + **comision pagos Stripe**.

Escalable si un dia superas los limites gratuitos:
- Supabase Pro: 25 USD/mes (8 GB DB, PITR 7 dias, HIBP password check).
- Vercel Pro: 20 USD/mes (analytics avanzado).
- Resend Pro: 20 USD/mes (50.000 emails/mes).

---

## 8. Roadmap proximo

### Inmediato (antes de go-live, requiere tu input)
1. Decidir dominio definitivo (te pedi opciones en lista).
2. Darnos tu NIF, numero colegiada COPM, numero REGCESS, titulacion sanitaria.
3. Rotar todas las contrasenas y API keys tecnicas (hay checklist en el repo).
4. Revision legal de politica de privacidad y aviso legal por tu abogada.

### Semana 1 tras go-live
5. Pentest externo basico (puedo contratar o hacer auditoria adicional).
6. Configurar alertas de pago fallido en tu email.
7. Campana educacion pacientes (comunicar el portal).

### Mes 1-3
8. Cifrado de mensajes chat end-to-end (mejora opcional).
9. Notificaciones push navegador (PWA).
10. Drag & drop en agenda admin (mejora UX).

### Trimestral
11. Auditoria interna: revisar accesos sensibles (auditoria).
12. Test de restauracion de backup.
13. Rotacion de credenciales (obligatorio cada 90 dias).

---

## 9. Preguntas frecuentes

**¿Los datos salen de Europa?**
No. Supabase region `eu-central-1` (Frankfurt). Stripe procesa en Irlanda/UK (dentro de transferencia con garantias).

**¿Puedo recuperar mis datos si cambio de proveedor?**
Si. Portabilidad total: `pg_dump` en Postgres estandar exporta todo (salvo cifrado, que requiere la clave maestra).

**¿Necesito un Delegado de Proteccion de Datos (DPO)?**
No por ley si operas sola y no superas 5000 pacientes con tratamiento regular. Recomendable si escalas.

**¿Puedo acceder al codigo fuente?**
Si. Esta en GitHub bajo tu cuenta (tras transferencia). Licencia propietaria.

**¿Quien tiene acceso a la base de datos por linea de comandos?**
Solo tu y el equipo de ingenieria autorizado. El servicio Supabase tiene sus propios empleados con acceso restringido segun su DPA.

**¿Que pasa con los pacientes de mas de 5 anos de baja?**
Se anonimizan automaticamente (nombre, email, DNI borrados; estadisticas clinicas preservadas sin identificar).

---

## 10. Contacto tecnico

Cualquier duda, incidencia o solicitud de cambio: equipo de ingenieria.

Para emergencias (caida total, brecha de seguridad, perdida datos): contacto directo. Tiempo de respuesta objetivo: 2h laborables, 24h fines de semana.

---

*Este informe se actualiza con cada hito tecnico. Ultima version: 21 abril 2026.*
