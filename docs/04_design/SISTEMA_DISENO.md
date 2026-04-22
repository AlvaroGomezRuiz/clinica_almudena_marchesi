# Sistema de Diseno — Clinica Almudena

> Fuente de verdad del lenguaje visual. Una unica identidad cubre web publica, portal paciente y admin.

---

## 1. Filosofia

**Santuario editorial.** No es un SaaS generico, no es una clinica corporativa. La plataforma transmite:

- **Calma**: mucho espacio negativo, tipografia generosa, motion contenido.
- **Autoridad**: serifas, proporciones editoriales, jerarquia clara.
- **Tecnologia invisible**: las transiciones y micro-interacciones existen pero nunca distraen.
- **Privacidad como estetica**: nada chilla, nada llama la atencion mas de lo necesario.

## 2. Tokens de color

### Paleta base (light)
| Rol             | Token            | Hex      | Uso                                    |
|-----------------|------------------|----------|----------------------------------------|
| Fondo principal | `canvas`         | `#F7F4EE` | body, layouts                         |
| Fondo alternativo | `parchment`    | `#EFE9DC` | superficies secundarias               |
| Tinta           | `ink`            | `#1B1E17` | titulares + texto largo               |
| Tinta suave     | `ink-soft`       | `#4B4F45` | subtitulos, metadata                  |
| Primario        | `primary`        | `#5C6B4E` | CTAs, focus, acentos                  |
| Primario suave  | `primary-soft`   | `#A5B590` | hover, backgrounds de realce          |
| Exito           | `success`        | `#6C8D62` | pagos ok, confirmaciones              |
| Aviso           | `warning`        | `#C79952` | alertas no destructivas               |
| Error           | `error`          | `#B14A3A` | fallos, validacion                    |
| Info            | `info`           | `#6A7F94` | tips, info contextual                 |

### Paleta oscura (portal night mode)
- `canvas-dark`: `#14171A`
- `parchment-dark`: `#1D2125`
- `ink-dark`: `#ECE7DC`
- Resto derivado manteniendo ratio >= 4.5:1.

### Reglas
- **Nunca** color puro `#000` o `#FFF`. Siempre con temperatura.
- Cualquier texto sobre superficie respeta WCAG AA (ratio ≥ 4.5:1 normal, ≥ 3:1 titulares ≥ 24px).
- Focus visible: `primary` outline 3px offset 2px.

## 3. Tipografia

### Familias
- **Display**: `Fraunces` (serif editorial, opcional sin Google Fonts licence — hoy via `@import`; TODO: migrar a `next/font`).
- **Texto**: `Inter` (humanist sans, 400/500/600).
- **Monospace**: `JetBrains Mono` (solo debug + IDs).

### Escala modular 1.25
| Token    | Tamano        | Uso                            |
|----------|---------------|--------------------------------|
| `xs`     | 12px          | metadata, timestamps           |
| `sm`     | 14px          | labels, chips                  |
| `base`   | 16px          | texto largo                    |
| `lg`     | 20px          | subtitulos                     |
| `xl`     | 24px          | titulares seccion              |
| `2xl`    | 32px          | titulares destacados           |
| `3xl`    | 48px          | hero secundario                |
| `4xl`    | 72px          | hero principal                 |

### Reglas editoriales
- `max-width: 65ch` en parrafos largos (anti 6 lineas wrap).
- Tracking `-0.02em` en display, `0` en texto, `+0.02em` en mayusculas.
- Line height: 1.2 display, 1.5 texto largo, 1.4 UI.

## 4. Espaciado

Escala geometrica base 4px: `4, 8, 12, 16, 20, 24, 32, 40, 56, 80, 120, 200`.

### Ritmos canonicos
- **Stack vertical en pagina publica**: `120-200px` entre secciones macro.
- **Stack en portal**: `32-48px` entre bloques.
- **Stack en formularios**: `16-20px` entre campos.
- **Inline gap**: `8-12px` entre icono y texto.

Regla: **nunca usar espacios intermedios aleatorios**. Si no esta en la escala, no existe.

## 5. Layout

### Grids
- **Publico**: 12 columnas, gutter 24px, margenes fluidos 24-120px.
- **Portal/Admin**: 8 columnas + sidebar 280px (collapsa <1024px).
- **Bento grids**: gap `0` (pegado) o gap `8px` (sutil), nunca mas.

### Breakpoints
- `sm` 640px · `md` 768px · `lg` 1024px · `xl` 1280px · `2xl` 1536px.
- Mobile-first. Desktop como enriquecimiento.

## 6. Motion

### Principios
- Solo `transform` + `opacity`. **Nunca** animar `top/left/width/height`.
- `prefers-reduced-motion: reduce` ⇒ todas las animaciones decorativas se desactivan.
- Duraciones: 200ms UI · 400ms transiciones · 800ms hero entry · 1200ms scroll reveal.
- Easings: `cubic-bezier(0.2, 0.8, 0.2, 1)` por defecto (calido natural).

### Librerias
- **Framer Motion** para entradas, staggers, layout animations.
- **Lenis** scroll suave (solo landing + portal publico).
- **CSS transitions** para hovers (mas barato que JS).

### Ejemplos canonicos
| Accion                    | Motion                                              |
|----------------------------|-----------------------------------------------------|
| Entrada hero               | `opacity: 0 → 1`, `y: 20 → 0`, 800ms, ease-out     |
| Scroll reveal seccion      | `viewport once`, `y: 40 → 0`, 600ms                 |
| Click boton                | `scale: 0.97` 120ms                                 |
| Open drawer                | `x: 100% → 0`, 320ms, ease-out                      |
| Success toast              | `scale: 0.9 → 1 + opacity`, 240ms spring            |

## 7. Componentes base

| Componente        | Notas clave                                            |
|-------------------|--------------------------------------------------------|
| `SurfaceCard`     | Superficie con borde hairline + sombra editorial       |
| `Button`          | 3 variantes: primary / ghost / link. Focus visible WCAG |
| `Chip`            | Tonos: neutral/info/success/warning/error             |
| `Input`           | Label flotante opcional, error con `aria-describedby` |
| `PortalShell`     | Navegacion lateral + topbar + main                     |
| `ChatPanel`       | Realtime, optimistic, ficha lateral opcional           |
| `SlotPicker`      | Calendario mensual + slots, skeleton durante load      |
| `PaymentElementDrawer` | Bottom sheet con Stripe Element, theme-aware     |
| `SensitiveField`  | Campo cifrado con revelar + auditoria                  |

## 8. Accesibilidad (WCAG 2.2 AA)

- Contraste normal >= 4.5:1, titulares >= 3:1.
- Focus visible siempre (`:focus-visible` con outline primary).
- Navegacion por teclado 100% (tab logico, Esc en modales, Enter/Space en botones).
- `aria-label` en iconos solo-icono.
- `aria-live="polite"` en toasts, `aria-live="assertive"` en errores criticos.
- `prefers-reduced-motion` respetado.
- Alt text en imagenes; `aria-hidden` en decorativas.
- Form labels asociados con `htmlFor` + `id`.

## 9. Iconografia

- **Libreria unica**: `lucide-react` (1.5px stroke, coherente con la tipografia fina).
- Tamanos estandar: 16/20/24px.
- Nunca mezclar icon sets.

## 10. Imagenes

- Formato: AVIF + WebP fallback via `next/image`.
- Ratios canonicos: 1:1 (retrato), 4:5 (editorial), 16:9 (landscape), 3:4 (mobile hero).
- Fotografia: luz natural calida, paleta tierra/verde, sin stock generico.
- Placeholder: `blurDataURL` o color solido `parchment`.

## 11. Tono y copy

- Tratamiento: `tu` (cercania profesional).
- Sin marketing agresivo, sin jerga tecnica, sin tecnicismos innecesarios.
- Errores: explican que paso + que hacer ("No pudimos confirmar tu pago. Reintentalo o contacta" > "Error 500").
- Botones: verbos accion ("Reservar", "Guardar", "Cancelar cita"). Nunca genericos ("OK", "Enviar").

## 12. Dark mode

- Activado en portal paciente via toggle en `/portal/ajustes`.
- Admin y landing permanecen en light mode por defecto (cambio opcional futuro).
- Preferencia persistida en `profiles.tema_preferido`.
- Respeta `prefers-color-scheme` si no hay preferencia explicita.

## 13. Checklist pre-commit visual

- [ ] Contraste verificado (Stark o similar).
- [ ] Focus visible en todo elemento interactivo.
- [ ] Navegacion teclado completa.
- [ ] Motion respeta `prefers-reduced-motion`.
- [ ] Mobile 375px sin scroll horizontal.
- [ ] Dark mode (si aplica) con mismo pulido.
- [ ] Assets optimizados (<200 KB por imagen fullscreen).
- [ ] Sin console warnings.
