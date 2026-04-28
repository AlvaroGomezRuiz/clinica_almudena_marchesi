# Clínica Almudena Marchesi — Plataforma digital

**Web en producción:** [https://ampsicologia.es](https://ampsicologia.es)
**Correo:** contacto@ampsicologia.es

Tu **página pública**, el **espacio privado de cada paciente** y **tu panel de gestión** conviven en la misma web. Los pacientes pueden reservar, pagar, escribirte, descargar facturas y ver el material que les envíes; tú gestionas agenda, fichas, facturación y mensajes en un solo sitio.

Lo que en informática se resume como “Next.js + Supabase + Stripe” en la práctica significa: web rápida en Europa, datos alojados en la Unión Europea y cobros con la misma tecnología que usan grandes comercios (sin que la tarjeta pase por un servidor tuyo casero).

---

## Para la titular (lectura recomendada)

|                                   Documento                                                    |                          Para qué sirve                                |
|------------------------------------------------------------------------------------------------|------------------------------------------------------------------------|
| [`docs/03_cliente/manual-plataforma-cliente.md`](docs/03_cliente/manual-plataforma-cliente.md) | Manual largo: qué puede hacer cada persona, paso a paso, tablas claras |
| [`docs/03_cliente/informe-ejecutivo.md`](docs/03_cliente/informe-ejecutivo.md)                 | Resumen de pocas páginas                                               |
| [`docs/README.md`](docs/README.md)                                                             | Índice de toda la carpeta `docs/`                                      |

---

## Cómo está montado el sistema (visión sencilla)

```
┌──────────────┐    HTTPS    ┌──────────────────────┐   reglas en base de datos   ┌───────────────────────┐
│  Navegador   │────────────▶│  Vercel (web en UE)  │────────────────────────────▶│  Supabase (UE)        │
│  del usuario │◀────────────│  pantallas + lógica  │◀────────────────────────────│  datos + sesiones     │
└──────────────┘   cookies   └──────────────────────┘    avisos en tiempo real    └───────────────────────┘
                                      ▲
                         avisos de cobro de Stripe │
                         (servidor seguro)         │
```

Cuando alguien paga, **Stripe** avisa a un programa pequeño en el servidor; ese programa marca la cita como pagada y guarda constancia. Tú no tienes que “tocar” la tarjeta ni guardar su número.

---

## Carpetas del proyecto (quién mira qué)

|    Carpeta     |           Qué hay dentro                    | Quién lo usa en el día a día |
|----------------|---------------------------------------------|------------------------------|
| `frontend/`    | Pantallas, formularios, colores, textos     | Ingeniería y diseño          |
| `supabase/`    | Reglas de datos, copias de seguridad SQL    | Ingeniería                   |
| `docs/`        | Manuales, informes, despliegue              | **Tú y el equipo de apoyo**  |
| `README.md`    | Este archivo: arranque técnico + enlaces    | Ingeniería + referencia      |

---

## Puesta en marcha en tu ordenador (solo técnicos)

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Después de copiar `.env.example` a `.env.local` hay que rellenar las direcciones y claves que te dé quien mantenga el proyecto. Sin eso la web no puede hablar con la base de datos ni con los cobros.

---

## Claves y variables (nombres que verás en configuración)

|         Nombre de variable            |       Dónde se usa        |                      Qué es, en cristiano                      |
|---------------------------------------|---------------------------|----------------------------------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`            | Web                       | Dirección del “cajón” donde están los datos                    |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`       | Web                       | Llave pública; igualmente, las reglas impiden ver datos ajenos |
| `SUPABASE_SERVICE_ROLE_KEY`           | Solo servidor             | Llave muy sensible; **nunca** en un email ni captura           |
| `NEXT_PUBLIC_APP_URL`                 | Web                       | Debe ser `https://ampsicologia.es`                             |
| `STRIPE_SECRET_KEY`                   | Servidor / funciones      | Llave de cobros (hay versión de prueba y de real)              |
| `STRIPE_WEBHOOK_SECRET`               | Servidor                  | Comprueba que los avisos de cobro son auténticos               |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`  | Web                       | Llave pública de Stripe; debe emparejar con la secreta         |

> Si **cualquier** secreto se filtra (captura, chat, vídeo), hay que **revocarlo y generar uno nuevo** en el panel correspondiente, sin esperar.

---

## Medidas de seguridad (qué significan para vosotros)

|               Medida                |                         Qué notáis vosotros / los pacientes                             |
|-------------------------------------|-----------------------------------------------------------------------------------------|
| Solo España, Portugal y Andorra     | Desde otro país la web puede no cargar; es intencionado                                 |
| Contraseña y, en admin, doble paso  | Menos riesgo de que entren en vuestra cuenta                                            |
| Datos separados por persona         | Un paciente no ve la ficha de otro                                                      |
| Datos sensibles cifrados            | Si hubiera una fuga de copia de base de datos, lo crítico sigue ilegible sin otra clave |
| Cobros con Stripe                   | La tarjeta no la procesáis vosotros “a mano”                                            |
| Registro de accesos sensibles       | En una inspección o duda grave se puede auditar quién abrió qué                         |

---

## Publicar cambios de código (técnicos)

```bash
cd frontend
vercel deploy --prod
```

Según cómo esté conectado el repositorio, a veces basta con subir cambios a la rama correcta y Vercel publica solo.

---

## Documentación en `docs/` (tabla completa)

|                           Ruta del archivo               |                                    Contenido                                        |
|----------------------------------------------------------|-------------------------------------------------------------------------------------|
| `docs/README.md`                                         | Índice: por dónde empezar según si eres titular, técnico o administración           |
| `docs/03_cliente/manual-plataforma-cliente.md`           | **Manual principal** para la clínica y pacientes                                    |
| `docs/03_cliente/informe-ejecutivo.md`                   | Resumen ejecutivo                                                                   |
| `docs/03_cliente/valoracion-proyecto.md`                 | Valor del trabajo y por qué se tomaron decisiones                                   |
| `docs/00_producto/producto.md`                           | Lista detallada de pantallas y flujos (también útil para formación interna)         |
| `docs/01_tecnico/arquitectura-y-seguridad.md`            | Seguridad y visibilidad en Google, explicado por capas                              |
| `docs/01_tecnico/base-de-datos.md`                       | Qué “cajones de información” existen en el sistema (nombres técnicos + explicación) |
| `docs/02_operaciones/despliegue-y-operacion.md`          | Proveedores, checklist antes de salir a producción, secretos                        |

---

## Licencia

Código propietario. © Clínica Almudena Marchesi Fernández. Todos los derechos reservados.
