# Documentación — Clínica Almudena Marchesi

**Web:** [https://ampsicologia.es](https://ampsicologia.es)
**Correo público:** contacto@ampsicologia.es

En la carpeta `docs/` está **toda la documentación escrita** del proyecto: lo que hace la web para **pacientes** y para **la titular**, cómo se protegen los datos, y qué hay que tener en cuenta cuando alguien técnico despliega o revisa el sistema.

No hace falta leerlo todo de una sentada. Abajo tenéis **tablas** que indican **qué archivo abrir** según lo que necesitéis.

---

## Las cuatro carpetas numeradas (00 a 03)

| Carpeta          | Código |                                       Contiene                                                 |
|------------------|--------|------------------------------------------------------------------------------------------------|
| `00_producto/`   | **00** | Descripción de **qué hace** la aplicación: páginas, menús, flujos de reserva y correos         |
| `01_tecnico/`    | **01** | **Cómo está protegida** la información y cómo se organizan los datos “por dentro”              |
| `02_operaciones/`| **02** | **Proveedores** (dónde está alojada la web), checklist antes de “salir a producción”, secretos |
| `03_cliente/`    | **03** | Textos pensados sobre todo para **la titular**: manual largo, informe breve, valoración        |

---

## Qué leer primero (titular de la clínica)

| Orden |                       Archivo                          |                                 Por qué empezar por aquí                             |
|-------|--------------------------------------------------------|--------------------------------------------------------------------------------------|
| 1     | `03_cliente/manual-plataforma-cliente.md`              | Es el **manual completo**: menús, citas, pagos, mensajes, RGPD, preguntas frecuentes |
| 2     | `03_cliente/informe-ejecutivo.md`                      | **Resumen corto** si solo tenéis diez minutos                                        |
| 3     | `03_cliente/valoracion-proyecto.md`                    | **Alcance y valor** del proyecto, con explicación del “por qué” de cada bloque       |

---

## Qué leer primero (persona técnica o auditoría)

| Orden |                  Archivo                   |
|-------|--------------------------------------------|
| 1     | `00_producto/producto.md`                  |
| 2     | `01_tecnico/arquitectura-y-seguridad.md`   |
| 3     | `01_tecnico/base-de-datos.md`              |
| 4     | `02_operaciones/despliegue-y-operacion.md` |

---

## Qué leer primero (día del “puesta en marcha” o cambio de servidor)

| Orden |                                Archivo                                  |
|-------|-------------------------------------------------------------------------|
| 1     | `02_operaciones/despliegue-y-operacion.md`                              |
| 2     | `supabase/BOOTSTRAP.md` (dentro de la carpeta `supabase/` del proyecto) |

---

## Lista de archivos (índice rápido)

|                   Ruta relativa                         |                    Descripción breve                   |
|---------------------------------------------------------|--------------------------------------------------------|
| `00_producto/producto.md`                               | Inventario de pantallas y procesos                     |
| `01_tecnico/arquitectura-y-seguridad.md`                | Seguridad por capas y visibilidad en buscadores        |
| `01_tecnico/base-de-datos.md`                           | Tablas de información: nombre técnico + qué representa |
| `02_operaciones/despliegue-y-operacion.md`              | Infraestructura, variables, checklist                  |
| `03_cliente/manual-plataforma-cliente.md`               | Manual detallado para clínica y pacientes              |
| `03_cliente/informe-ejecutivo.md`                       | Informe ejecutivo                                      |
| `03_cliente/valoracion-proyecto.md`                     | Valoración y justificación                             |

---

## Reglas que seguimos al escribir esta documentación

|                           Regla                            |                         Motivo                         |
|------------------------------------------------------------|--------------------------------------------------------|
| Si el texto y el programa discrepan, **manda el programa** | Así no quedan promesas que el código no cumpla         |
| Tablas alineadas y legibles                                | Que se puedan imprimir o leer en el móvil sin perderse |
| Nombres de archivo en español, con guiones                 | Convención del repositorio                             |
| Nunca poner **contraseñas ni claves** dentro de los .md    | Seguridad                                              |

---

## README de la raíz del proyecto

El archivo `README.md` que está **fuera** de `docs/` (en la raíz del proyecto) mezcla **instrucciones para programadores** (instalar, arrancar) con **enlaces** a esta carpeta para que la clínica encuentre el manual en un solo clic.
