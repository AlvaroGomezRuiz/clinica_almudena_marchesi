# LANDING_IMPACTO_TOTAL — Obsidian Assembly (Plan de estructura + motion)

## Objetivo (1 frase)

Reconstruir `FRONTEND/src/app/page.tsx` como una **pieza de arte digital utilitaria** (Awwwards/Obsidian Assembly) con scroll inmersivo, glassmorphism extremo y motion coherente, sin degradar accesibilidad ni performance.

## Restricciones no negociables

- **No romper** contratos API/seguridad/tipado ya consolidados (Fase 2).
- **Animar solo `transform` + `opacity`** (cero `top/left/width/height`) para evitar jank/CLS.
- **Respetar `prefers-reduced-motion`** con degradación clara (sin motion “decorativo”).
- **CTA único** por viewport (el resto es subordinado).

## Stack de motion (dependencias)

Dependencias recomendadas (mínimo viable “wow”):

- `framer-motion`: core motion (entrada por viewport, staggers, springs, layout).
- `lenis` (+ opcional `@studio-freight/react-lenis`): scroll suave premium.

Nota: `lucide-react`, `clsx`, `tailwind-merge` ya están presentes en el repo (no reinstalar).

## Lenguaje visual (tokens)

### Paleta (Obsidian Assembly, “clínica de vanguardia”)

- Fondo: **negro obsidiana** con matiz frío (no #000 puro).
- Superficies: **glass** (blanco/azul muy bajo) con `backdrop-blur-2xl` y borde hairline.
- Texto: blanco roto + grises fríos (jerarquía por opacidad, no por color chillón).
- Acento: **halo** (teal/blue) muy contenido para el CTA y highlights.

### Tipografía

- Cuerpo: **Manrope** (ya es parte del sistema previsto).
- Titular Hero: `text-7xl`/`text-8xl`, `font-light`, tracking ligeramente negativo en desktop.
- Longitud de línea: 60–75 chars desktop; 35–60 mobile.

### Materialidad / Depth

- Capas:
  - **Capa 0**: background mesh + noise sutil (sin banding).
  - **Capa 1**: brillos suaves (radial gradients) con parallax mínimo.
  - **Capa 2**: cards glass (blur) + borde 1px semitransparente.
  - **Capa 3**: CTA jewel (glow perimetral) + micro-elevación.

## Sistema de animación (Motion Spec)

### Motion tokens (global)

- Duraciones:
  - Micro: 160–220ms
  - Sección (entrada): 280–420ms
- Easing:
  - Entradas: `easeOut` o spring suave
  - Salidas: más rápidas (≈ 60–70% de la entrada)
- Stagger:
  - 30–50ms por ítem en listas/grids
- Intensidad:
  - **1–2 elementos animados** por sección (resto estático) para no “quemar” al usuario.

### Patrón: “Fade + Scale” al hacer scroll (secciones)

Para cada sección:

- Trigger: `whileInView` (viewport) con margen negativo (entra “antes” de que el usuario lo pida).
- Animación: `opacity: 0 → 1`, `scale: 0.98 → 1`, `y: 12 → 0`.
- Stagger interno para títulos → body → elementos.

### Hero: background “Mesh Gradient” animado (sutil)

Objetivo: “vivo” sin marear.

- Implementación conceptual:
  - Múltiples blobs radiales (4–6) animando **posición** y **opacidad** lentamente.
  - Overlay de noise (muy bajo) para evitar banding.
- Movimiento:
  - Periodos largos (10–22s), loops no síncronos.
- Degradación:
  - En `prefers-reduced-motion`: mesh estático.

### Glow perimetral (CTA jewel)

- Composición:
  - Borde hairline + pseudo-elemento con blur para halo.
  - Hover/focus: incremento de halo + micro-translateY (-1px) + shadow.
- Accesibilidad:
  - `:focus-visible` con ring consistente y contraste AA.
  - Target size ≥ 44px (ideal, aunque WCAG 2.2 AA pide ≥ 24px).

### Glassmorphism extremo (cards de “servicios” narrados)

Objetivo: cards como “cristal técnico”.

- Fondo: `bg-white/5` a `bg-white/8`
- Borde: `border-white/10`
- Blur: `backdrop-blur-2xl`
- Sombra: grande pero muy transparente (sin “shadow agresiva”).

### Hover “Tilt” (tarjetas)

Recomendación: tilt **ligero** para evitar gimmick.

- Tilting:
  - rotación ±3–5°
  - translateZ “simulado” (shadow/gradient), no 3D pesado.
- Seguridad/performance:
  - Solo en dispositivos con puntero fino (`(hover:hover) and (pointer:fine)`).
  - En touch: **sin tilt**.
- Accesibilidad:
  - Tilt nunca debe ser el único indicador interactivo; mantener estados hover/focus equivalentes.

## Arquitectura de componentes (propuesta)

`page.tsx` debe orquestar, no contener toda la lógica.

Componentes propuestos:

- `LandingHeroObsidian`
  - Titular + subcopy + CTA jewel + mesh background
- `LandingStoryAct`
  - Secciones “storytelling” (3 actos) con cards glass + stagger
- `LandingServiceGlassGrid`
  - Grid de soluciones (no “lista de servicios”), con tilt en hover
- `LandingProof`
  - Señales de confianza (microcopy, credenciales, sin “logos wall” barata)
- `LandingFAQ`
  - Accordion shadcn, animación contenida
- `LandingFinalCTA`
  - Repetición del CTA en cierre con enfoque calmado

## Contenido (mapeo desde prototipo)

Directiva: mantener el mensaje del prototipo, pero reexpresado.

- Acto 1 (Ruido): síntomas/estado actual del paciente (sin dramatismo barato).
- Acto 2 (Proceso): método/acompañamiento/estructura (serio, clínico, humano).
- Acto 3 (Cambio): resultados esperables (sin promesas absolutas).

## Accesibilidad (WCAG 2.2) — checklist mínimo de motion + glass

- `prefers-reduced-motion`:
  - Desactivar: parallax, loops largos, tilt, smooth scroll.
  - Mantener: transiciones mínimas (opcional) o nada.
- Focus:
  - Todos los CTAs y cards interactivos con `:focus-visible` claro.
  - Evitar que sticky/header tape el foco (scroll-margin).
- Contraste:
  - Texto sobre glass con AA (4.5:1 en body).
  - Bordes hairline no deben ser el único separador.
- Teclado:
  - Si una card es clicable: debe ser `<a>`/`<button>` real, no `div` con onClick.

## Performance budgets (para que “flipar” no sea “lag”)

- No animar más de ~6–10 elementos simultáneos en viewport.
- Evitar filtros pesados apilados: `backdrop-blur-2xl` solo en superficies clave, no en toda la página.
- Reservar espacio (nada de CLS): alturas y paddings deterministas.
- Scroll smoothing:
  - Activar solo si no hay reduced-motion y si el device no va justo de FPS.

## Plan de implementación (orden)

1. **Instalar dependencias** (`framer-motion`, `lenis`).
2. Construir **sistema de motion tokens** (variants reutilizables: `sectionReveal`, `staggerChildren`, `glowCTA`).
3. Implementar **Hero** (mesh + CTA jewel + heading) y verificar reduced-motion.
4. Implementar **storytelling** (3 actos) con `whileInView` y cards glass.
5. Implementar **tilt** condicionado por pointer fine + hover.
6. Añadir FAQ (shadcn Accordion) y final CTA.
7. Barrido final: a11y (teclado + reduced-motion) + perf (scroll jank) + mobile.

## Criterios de aceptación (Definition of Done)

- La landing se percibe **premium** (depth + tipografía + motion) sin saturación.
- Scroll reveal “fade + scale” consistente en todas las secciones.
- Hero: mesh animado sutil + CTA con glow real (hover/focus) y accesible.
- Cards glass: legibles, con contraste AA, y tilt solo donde procede.
- Reduced-motion: experiencia limpia, sin motion forzado.

