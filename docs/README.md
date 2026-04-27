# Documentación — Clínica Almudena Marchesi

Documentación de producto, técnica y operativa de la plataforma digital.

## Estructura

| Carpeta            | Contenido                                                       |
|--------------------|-----------------------------------------------------------------|
| `00_producto/`     | Qué entrega el sistema, módulos, funcionalidades                |
| `01_tecnico/`      | Arquitectura, seguridad, base de datos, SEO/GEO                |
| `02_operaciones/`  | Despliegue, Stripe, emails, checklist go-live                   |
| `03_cliente/`      | Documento ejecutivo para la titular de la clínica               |

## Orden de lectura

| #  | Documento                                    | Para quién             |
|----|----------------------------------------------|------------------------|
| 1  | `03_cliente/informe-ejecutivo.md`            | Titular de la clínica  |
| 2  | `00_producto/producto.md`                    | Cualquiera             |
| 3  | `01_tecnico/arquitectura-y-seguridad.md`     | Técnico / auditor      |
| 4  | `01_tecnico/base-de-datos.md`                | Técnico / DBA          |
| 5  | `02_operaciones/despliegue-y-operacion.md`   | DevOps / titular       |

## Criterio editorial

- Si algo contradice al código o a Supabase, gana el repositorio.
- Tablas alineadas visualmente, una sola fuente de verdad por concepto.
- Nombres de fichero: kebab-case en español.
- Sin secretos en claro en ningún documento.
