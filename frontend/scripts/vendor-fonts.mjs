/**
 * vendor-fonts.mjs
 *
 * Descarga desde Google Fonts las 3 familias tipográficas que usa la clínica
 * y las guarda en `src/app/fonts/` para self-hosting total. El objetivo es que
 * el runtime, el build y el deploy NUNCA dependan de fonts.googleapis.com ni
 * fonts.gstatic.com.
 *
 * Por qué `src/app/fonts/` y NO `public/fonts/`:
 *   - `next/font/local` solo hashea y hace inline-preload de fuentes que
 *     viven dentro del árbol `src/`. Si las dejas en `public/` Next no las
 *     procesa y pierdes el preload automático en el <head> (peor LCP).
 *   - El subset Material Symbols sí queda en `public/fonts/` porque se
 *     carga con un `@font-face` manual desde `src/styles/material-symbols.css`.
 *
 * Uso:
 *   npm run fonts:vendor
 *
 * Resultado:
 *   src/app/fonts/cormorant-garamond-400-normal.woff2
 *   src/app/fonts/cormorant-garamond-400-italic.woff2
 *   src/app/fonts/cormorant-garamond-500-normal.woff2
 *   src/app/fonts/outfit-variable.woff2          (eje wght 100-900)
 *   src/app/fonts/jetbrains-mono-400-normal.woff2
 *
 * Se usa User-Agent de Chrome moderno para que Google sirva woff2 y variable
 * fonts. Se filtra solo el subset `latin` (U+0000-00FF), que cubre español
 * completo (á é í ó ú ñ, comillas, €, ¿, ¡). latin-ext queda fuera porque
 * no se usa (no hay polaco, checo, húngaro en la UI).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT_DIR = 'src/app/fonts';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

/**
 * Estructura del CSS que devuelve Google Fonts:
 *
 *   /* latin *\/
 *   @font-face {
 *     font-family: 'Outfit';
 *     font-style: normal;
 *     font-weight: 100 900;
 *     font-display: swap;
 *     src: url(https://fonts.gstatic.com/s/outfit/....woff2) format('woff2');
 *     unicode-range: U+0000-00FF, U+0131, U+0152-0153, ...;
 *   }
 *
 * Queremos el bloque cuyo `unicode-range` empiece por `U+0000-00FF` → latin.
 */
function extractLatinBlock(css) {
  const blocks = css.split('@font-face').slice(1);
  for (const raw of blocks) {
    if (raw.includes('U+0000-00FF')) {
      const urlMatch = raw.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/);
      if (urlMatch) return urlMatch[1];
    }
  }
  return null;
}

async function fetchCss(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`CSS fetch failed: ${url} → ${res.status}`);
  return res.text();
}

async function fetchBinary(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`WOFF2 fetch failed: ${url} → ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function vendor(family, axis, outName) {
  const url = new URL('https://fonts.googleapis.com/css2');
  url.searchParams.set('family', `${family}${axis}`);
  url.searchParams.set('display', 'swap');
  const css = await fetchCss(url.toString());
  const woffUrl = extractLatinBlock(css);
  if (!woffUrl) {
    console.error(`No se encontró bloque 'latin' para ${family}`);
    console.error(css.slice(0, 600));
    throw new Error('missing latin block');
  }
  const buf = await fetchBinary(woffUrl);
  const outPath = join(OUT_DIR, outName);
  writeFileSync(outPath, buf);
  console.log(`✓ ${outName.padEnd(36)} ${(buf.length / 1024).toFixed(1).padStart(6)} KB  ←  ${family}`);
}

mkdirSync(OUT_DIR, { recursive: true });

/* ─────────── Outfit — variable wght 100..900, un solo archivo ─────────── */
await vendor('Outfit', ':wght@100..900', 'outfit-variable.woff2');

/* ─────────── Cormorant Garamond — 3 instancias estáticas ─────────── */
await vendor('Cormorant Garamond', ':ital,wght@0,400', 'cormorant-garamond-400-normal.woff2');
await vendor('Cormorant Garamond', ':ital,wght@1,400', 'cormorant-garamond-400-italic.woff2');
await vendor('Cormorant Garamond', ':ital,wght@0,500', 'cormorant-garamond-500-normal.woff2');

/* ─────────── JetBrains Mono — solo peso 400 ─────────── */
await vendor('JetBrains Mono', ':wght@400', 'jetbrains-mono-400-normal.woff2');

console.log('\nListo. Las fuentes ya están self-hosted en src/app/fonts/.');
console.log('No vuelvas a depender de fonts.googleapis.com ni fonts.gstatic.com.');
