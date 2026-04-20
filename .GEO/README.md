# GEO Toolkit (local)

Objetivo: ejecutar auditorías GEO (Generative Engine Optimization) **sin tocar runtime** y sin afectar Lighthouse.

## Requisitos
- Windows + PowerShell
- Python 3.9+

## Uso
Desde la raíz del repo:

```powershell
.\GEO\run-geo-audit.ps1
```

El script pedirá una URL:
- URL de página: `https://example.com/`
- URL de sitemap: `https://example.com/sitemap.xml`

Genera reportes en `GEO/reports/` (HTML + JSON).

## Notas
- La instalación se realiza en `GEO/.venv` (aislada).
- El reporte es reproducible y no requiere modificar el proyecto.

