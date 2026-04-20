# DISEÑO_HERO_OBSIDIAN — Informe de avance (iteración actual)

## Alcance de esta iteración (lo que SÍ se ha implementado)

- **Landing**: reemplazo de la home para mostrar **solo** la base “Obsidian Assembly” (Hero fullscreen + motion inicial).
- **Header**: `PublicHeader` refactorizado a **pill flotante glass** (Obsidian), manteniendo accesibilidad base (skip-link + focus-visible).
- **Scroll**: integración de **Lenis** (smooth scroll) a nivel raíz del componente de landing.
- **Motion**: primera animación de entrada **fade + scale** al cargar la página (Framer Motion).

Directiva cumplida: **no se ha construido toda la landing**; solo **Hero + Header** para previsualizar el “Wow Factor”.

## Archivos tocados / creados

- **MODIFICADO**: `FRONTEND/src/app/page.tsx`
  - Ahora renderiza `LandingObsidian` como experiencia base.
- **CREADO**: `FRONTEND/src/components/landing/LandingObsidian.tsx`
  - Hero fullscreen, mesh gradient animado, noise, CTA jewel, Lenis root, motion inicial.
- **MODIFICADO**: `FRONTEND/src/components/PublicHeader.tsx`
  - Header flotante tipo “pill glass” con blur + CTA jewel.
- **MODIFICADO**: `FRONTEND/src/services/citas.ts`
  - Ajuste de tipado (querystring) para que `next build` compile sin errores de types.

## Dependencias instaladas (motion/scroll)

En `FRONTEND/package.json` se añadieron:

- `framer-motion`
- `lenis`
- `@studio-freight/react-lenis`

Nota: npm muestra warnings deprecados porque `@studio-freight/react-lenis` está renombrado en upstream; se mantiene **por estabilidad** en esta iteración (funciona).

## Especificación visual aplicada (Obsidian Assembly)

### Fondo / atmósfera

- **Base**: negro profundo.
- **Mesh gradient**: 3 radios con cian/teal/índigo a baja opacidad, **animados** de forma lenta (no mareante).
- **Noise overlay**: textura ligera para evitar banding en gradientes.
- **Vignette**: degradado vertical para concentrar la atención en el copy/CTA.

### Tipografía / jerarquía

- H1: `text-8xl` (desktop), `font-light`, tracking negativo suave.
- Subcopy: blanco a opacidad (~70%) para jerarquía sin grises “sucios”.

### CTA “joya” (glow perimetral)

- Botón primario: superficie blanca (alto contraste) con **halo** (blur) al hover.
- Botón secundario: glass (`bg-white/5`) + borde hairline.
- Ambos con `focus-visible` (ring) y altura usable (≥48px en hero).

### Glassmorphism (header pill)

- Header: `bg-black/25` + `backdrop-blur-2xl` + borde `white/10`.
- Sombra larga, transparente (profundidad sin “shadow agresiva”).

## Especificación de motion aplicada (MVP)

### Entrada de página (fade + scale)

- `opacity: 0 → 1`
- `scale: 0.985 → 1`
- ease: curva tipo “expo out” (suave y premium).

### Mesh animation

- Movimiento lento en X/Y con loop largo (≈18s) para que se perciba “vivo” sin distraer.

## Accesibilidad (baseline)

- **Skip-link** mantenido: “Saltar al contenido principal” → `#main`.
- **Focus-visible** aplicado en links y CTAs del header/hero (ring visible).
- Nota pendiente: **reduced-motion** (degradación) aún no se ha cableado en el Hero; se hará en la siguiente iteración para cumplir WCAG 2.2 al 100% (desactivar mesh/lenis/tilt cuando corresponda).

## Copy (estado actual y bloqueo)

Requisito: “Extraer fielmente textos de `code.html` del prototipo”.

Situación real:
- **No existe `code.html` dentro del workspace** (no se encontró ningún HTML del prototipo).
- Por lo tanto, el subcopy del Hero se ha tomado **temporalmente** de `DOCS/DISEÑO_LANDING.md` + el titular obligatorio:
  - H1: **“Reconecta con tu paz interior”**
  - Subcopy provisional: “Tu bienestar mental es nuestra prioridad…” (hasta que se aporte `code.html`)

Acción necesaria para cerrar fidelidad: añadir `code.html` (o pegar el contenido) y se sustituye el copy sin tocar layout/motion.

## Cómo previsualizar (dev)

- Frontend corriendo en: **`http://localhost:3000`**

## Incidencias resueltas durante la iteración

- **Next dev 500** por caché corrupta: `Cannot find module './948.js'` bajo `FRONTEND/.next/...`
  - Fix: borrado de `FRONTEND/.next` y relanzado dev server.
- **Puerto 3000 ocupado** en un arranque previo:
  - Estado actual: **3000 operativo** y Next en `Ready`.

## Qué NO se ha implementado todavía (a propósito)

- Storytelling (Actos 1–3), grid glass, tilt, FAQ, CTA final.
- Inicialización/uso de shadcn en la landing (se aplicará cuando se confirme el estilo final o el preset).
- JSON-LD/metadata SEO de alto detalle para la nueva estética (se hace al cerrar copy final del prototipo).

## Próxima iteración (solo después de tu review visual)

- Ajuste fino de:
  - Mesh (intensidad/colores),
  - CTA jewel (glow + microinteracción),
  - Header pill (densidad/espaciado).
- Añadir **reduced-motion** y degradación de Lenis.
- Integrar copy exacto desde `code.html`.

