# Estrategia GEO + SEO técnico (referencia interna)

**Última revisión del código y documentación:** 23 de abril de 2026 · dominio canónico **https://ampsicologia.es**

Este documento describe cómo está implementada la **visibilidad geográfica (GEO)** y la **optimización para buscadores (SEO)** en el frontend Next.js. No sustituye asesoramiento jurídico ni de marketing externo.

---

## 1. Principios

| Pilar | Implementación |
|-------|----------------|
| **Un solo dominio canónico** | `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_APP_URL` alineados con DNS y Supabase `FRONTEND_URL`. Sin mezcla de hosts en metadata. |
| **GEO verificable** | JSON-LD `GeoCoordinates` + dirección postal completa + `areaServed` (Madrid / Comunidad de Madrid). |
| **Discoverability técnica** | `robots.ts` permite bots de citación donde procede; `sitemap.xml` con `lastModified` diferenciado para páginas legales tras revisiones. |
| **Snippet control** | `robots.googleBot` con límites de snippet/imagen/video en página de inicio (App Router metadata). |

---

## 2. Structured data (Schema.org)

- **Home** (`src/app/(public)/page.tsx`): grafo `@graph` con **WebSite** (`#website`) + **LocalBusiness + MedicalBusiness** (`#localbusiness`), enlazados por `@id`.
- Campos destacables: `address` (Meléndez Valdés 22, CP 28015), `geo` (lat/long), `hasMap` (Google Maps), `medicalSpecialty` enlazado a vocabulario estándar, `areaServed`, `knowsAbout`.
- **Páginas legales**: **WebPage** + `dateModified` ISO desde `LEGAL_LAST_UPDATED_ISO` (`src/lib/seo/legal-version.ts`).

Validación recomendada en despliegue: [Rich Results Test](https://search.google.com/test/rich-results) sobre la URL de producción.

---

## 2.1 Toolkit GEO local (repositorio)

Carpeta **`.GEO/`** en la raíz del monorepo:

- Script **`run-geo-audit.ps1`** (PowerShell): crea y reutiliza el venv en `.GEO/.venv`, instala dependencias desde `.GEO/requirements.txt` y ejecuta la CLI `geo` contra una **URL de página** o un **`sitemap.xml`** (hasta 25 URLs en modo sitemap).
- Salida: informes **HTML + JSON** en `.GEO/reports/` (no toca el runtime de Next.js ni Lighthouse).

Instrucciones: `.GEO/README.md`.

---

## 3. Metadata y plantillas

- **`buildPublicPageMetadata`** (`src/lib/seo/build-public-page-metadata.ts`): canonical absoluta, `alternates.languages['es-ES']`, Open Graph, Twitter Card, robots indexables coherentes.
- **Títulos**: páginas públicas usan `title.absolute` para no duplicar el sufijo del layout raíz.
- **Root layout**: `applicationName`, `alternates.languages`, keywords GEO (Moncloa, Chamberí, Meléndez Valdés).

---

## 4. GEO local (negocio físico + captación)

- Keywords en castellano con **barrio + calle + ciudad** donde el contenido es veraz.
- La ficha debe coincidir con Google Business Profile si existe (nombre, categoría sanitaria, número, horario): cualquier discrepancia penaliza conversión local.
- No se inventan distinciones («mejor psicóloga España»): el tono editorial del sitio ya evita superlativos huecos.

---

## 5. Herramientas posteriores al código

1. **Google Search Console**: propiedad de dominio o prefijo URL `https://ampsicologia.es`.
2. **Informe de experiencia en páginas** + Core Web Vitals ya monitorizados vía Vercel Analytics / Speed Insights.
3. Enlaces externos de calidad (directorios colegiales, salud reputables) — fuera del alcance del repositorio.

---

## 6. Mantenimiento

Al publicar nueva versión legal: editar **`LEGAL_*` en `legal-version.ts`**, redesplegar, volver a enviar URLs clave en Search Console si hay cambios sustantivos.
