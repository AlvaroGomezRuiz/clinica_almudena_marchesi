# Arquitectura y seguridad — Explicado por capas

**Web:** [https://ampsicologia.es](https://ampsicologia.es)
**Última revisión:** 28 de abril de 2026

Este documento describe **cómo está protegida la web** y **cómo se cuida que Google muestre lo público y no lo privado**. Está escrito para que la **titular** o un **asesor** entiendan el conjunto sin leer código.

Para uso cotidiano (menús, citas, pagos) usad **`docs/03_cliente/manual-plataforma-cliente.md`**.

---

## Dibujo sencillo del conjunto

```
┌──────────────┐    conexión segura    ┌──────────────────────┐    reglas internas    ┌───────────────────────┐
│  Persona     │ ────────────────────▶ │  Web alojada en UE   │ ─────────────────────▶ │  Datos en Alemania    │
│  (navegador) │ ◀──────────────────── │  (pantallas)         │ ◀───────────────────── │  (cuentas y tablas)   │
└──────────────┘    cookies protegidas └──────────────────────┘    avisos en tiempo real └───────────────────────┘
                                                ▲
                         avisos de cobro seguros │
                         (Stripe → servidor)     │
```

---

## Capa 1 — Lo que ocurre antes de entrar en la web (perímetro)

|       Control pensado para…          |                          Qué significa para la clínica                               |
|--------------------------------------|--------------------------------------------------------------------------------------|
| Conexión cifrada (HTTPS)             | El candado del navegador; lo que se envía va codificado                              |
| Política de “solo algunos países”    | Solo **España, Portugal y Andorra**; reduce ataques masivos desde el resto del mundo |
| Cabeceras de seguridad del navegador | Dificultan que metan la web dentro de otra falsa o roben sesión por ciertos trucos   |
| Política de contenidos (CSP)         | Limita de dónde puede cargar scripts la página; menos riesgo de infecciones          |

---

## Capa 2 — Inicio de sesión y sesión

|               Control                 |                        Beneficio práctico                             |
|---------------------------------------|-----------------------------------------------------------------------|
| Contraseña exigente en el alta        | Menos cuentas robadas por listas de contraseñas triviales             |
| Segundo factor (recomendado en admin) | Aunque filtren la contraseña, hace falta el móvil o la app de códigos |
| Cookies bien configuradas             | Menos robos de sesión desde navegadores compartidos mal cerrados      |
| Comprobación en cada zona             | Un paciente no abre el panel de administración ni al revés            |

---

## Capa 3 — Reglas dentro de la base de datos (RLS)

Aquí “RLS” solo significa: **cada consulta lleva implícito “solo lo tuyo”**.

|                   Pregunta               |                        Respuesta técnica en una frase                           |
|------------------------------------------|---------------------------------------------------------------------------------|
| ¿Puede un paciente listar a otros?       | Las reglas de la base lo impiden aunque alguien intente “engañar” a la pantalla |
| ¿Puede la administración ver lo clínico? | Sí, según el diseño del producto, porque es quien da la asistencia              |

---

## Capa 4 — Cifrado de lo más delicado

|              Idea            |                                     Explicación                                            |
|------------------------------|--------------------------------------------------------------------------------------------|
| Cifrado en reposo            | Aunque alguien robara una copia “fría” de tablas, lo más sensible no se lee sin más piezas |
| Índices ciegos para búsqueda | Permiten buscar por ejemplo por documento **sin guardar el documento en claro** repetido   |
| Chat cifrado                 | El contenido del mensaje no viaja como una postal legible por cualquiera en la base        |

---

## Capa 5 — Auditoría (quién tocó qué)

|                           Elemento                |    Para qué sirve en un conflicto o inspección    |
|---------------------------------------------------|---------------------------------------------------|
| Cadena de registros difícil de borrar en silencio | Demostrar que no se “editó el pasado” cómodamente |
| Registro de consultas muy sensibles               | Saber qué profesional abrió qué dato y cuándo     |

---

## Capa 6 — Defensas del día a día (spam, archivos, exportaciones)

|              Riesgo que se quiere evitar                       |                  Medida (nombre técnico breve)                   |
|----------------------------------------------------------------|------------------------------------------------------------------|
| Adivinar contraseñas a prueba                                  | Límite de intentos repartido (servicio de límites de peticiones) |
| Subir un archivo que en realidad es virus disfrazado           | Comprobación del **tipo real** del fichero                       |
| Nombres de archivo tramposos                                   | Sanitización de rutas                                            |
| Abrir un Excel de exportación y ejecutar una fórmula maliciosa | Prefijos de seguridad en celdas exportadas                       |

---

## Capa 7 — Rapidez con muchas citas y mensajes

“Índices” en la base de datos son **índices de libro**: permiten saltar directo a la página sin leer todo el libro cada vez. Mejoran la **fluidez** cuando el número de pacientes crece.

---

## Visibilidad en Google y buscadores (SEO y GEO)

|                  Elemento                 |                      Qué aporta a la clínica                           |
|-------------------------------------------|------------------------------------------------------------------------|
| Datos estructurados                       | Google entiende que sois un negocio con horario y zona                 |
| Mapa del sitio (sitemap)                  | Lista de páginas públicas para que las rastreen bien                   |
| Archivo robots                            | Indica qué **no** debe indexarse (portal, administración)              |
| Metadatos de región                       | Refuerzan búsquedas locales (“psicología en…”)                         |
| Zonas privadas marcadas como “no guardar” | Menos riesgo de que un buscador guarde copia de una página de paciente |

---

## Observabilidad (saber si “algo se rompió”)

|             Herramienta           |                         Utilidad para vosotros                                  |
|-----------------------------------|---------------------------------------------------------------------------------|
| Registro centralizado de errores  | El técnico ve **trazas** sin que el paciente tenga que copiar pantallazos raros |
| Comprobación de salud del sistema | Aviso si la base o el cifrado no responden                                      |
| Registro de eventos de cobro      | Reconstruir un pago que “faltó” por un aviso perdido                            |

---

## Dos caminos distintos de correo (para no confundirse)

|           Tipo de correo       |              Ejemplos              |              Quién lo manda (simplificado)            |
|--------------------------------|------------------------------------|-------------------------------------------------------|
| Correo de “entrar a la cuenta” | Restablecer contraseña, magic link | Sistema de cuentas (Supabase) usando SMTP configurado |
| Correo de “negocio”            | Confirmación de cita, recordatorio | Programa en servidor (Edge) usando API de Resend      |

---

*Las medidas concretas evolucionan con el tiempo; siempre que haya duda, la persona técnica contrasta este texto con el repositorio desplegado.*
