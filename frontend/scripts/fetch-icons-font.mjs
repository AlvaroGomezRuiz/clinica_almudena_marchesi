/**
 * fetch-icons-font.mjs
 *
 * Descarga desde Google Fonts un subset woff2 que contiene SOLO los iconos
 * que usamos en el código fuente (extraídos por extract-icons.mjs). Guarda
 * la font y el CSS en public/fonts/ para auto-hosting.
 *
 * Uso:
 *   node scripts/fetch-icons-font.mjs
 *
 * Resultado:
 *   public/fonts/material-symbols-subset.woff2   (≈5-20 KB)
 *   src/styles/material-symbols.css              (@font-face con ruta local)
 */
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const ICON_EXTRACTOR = 'scripts/extract-icons.mjs';
const PUBLIC_FONTS_DIR = 'public/fonts';
const STYLES_DIR = 'src/styles';
const FONT_FILE = 'material-symbols-subset.woff2';
const CSS_FILE = 'material-symbols.css';

const GOOGLE_FONTS_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

/* 1. Obtener la lista de iconos del script extractor. */
const listOutput = execSync(`node ${ICON_EXTRACTOR}`, { encoding: 'utf8' }).trim();
const iconNames = listOutput.split('\n').pop();
if (!iconNames || !iconNames.includes(',')) {
  console.error('No se pudo extraer la lista de iconos.');
  process.exit(1);
}
const iconList = iconNames.split(',').filter(Boolean);
console.log(`Iconos únicos detectados: ${iconList.length}`);

/* 2. Pedir el CSS de Google Fonts con subset inline por icon_names. */
const cssUrl = new URL('https://fonts.googleapis.com/css2');
cssUrl.searchParams.set(
  'family',
  'Material Symbols Outlined:opsz,wght,FILL,GRAD@24,300,0,0',
);
cssUrl.searchParams.set('icon_names', iconList.join(','));
cssUrl.searchParams.set('display', 'swap');

console.log(`Pidiendo CSS a Google Fonts…`);
const cssRes = await fetch(cssUrl.toString(), {
  headers: { 'User-Agent': GOOGLE_FONTS_USER_AGENT },
});
if (!cssRes.ok) {
  console.error(`Google Fonts respondió ${cssRes.status}`);
  process.exit(1);
}
const cssSrc = await cssRes.text();

/* 3. Extraer la URL del font blob (puede ser /s/.../file.woff2 o /l/font?kit=...).
   Google Fonts genera una URL dinámica por subset que NO necesariamente termina en .woff2. */
const woffMatch = cssSrc.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/);
if (!woffMatch) {
  console.error('No se encontró URL font en el CSS recibido.');
  console.error(cssSrc.slice(0, 400));
  process.exit(1);
}
const woffUrl = woffMatch[1];

/* 4. Descargar la woff2. */
console.log(`Descargando woff2: ${woffUrl}`);
const woffRes = await fetch(woffUrl);
if (!woffRes.ok) {
  console.error(`No se pudo descargar la font (${woffRes.status})`);
  process.exit(1);
}
const woffBuf = Buffer.from(await woffRes.arrayBuffer());

/* 5. Guardar en public/fonts/ y emitir CSS local. */
mkdirSync(PUBLIC_FONTS_DIR, { recursive: true });
mkdirSync(STYLES_DIR, { recursive: true });
writeFileSync(join(PUBLIC_FONTS_DIR, FONT_FILE), woffBuf);

const localCss = `/*
 * Material Symbols Outlined — subset auto-hospedado.
 * Generado por scripts/fetch-icons-font.mjs a partir de ${iconList.length} iconos realmente usados.
 * Si añades un icono nuevo en el código, re-ejecuta: node scripts/fetch-icons-font.mjs
 *
 * Total iconos: ${iconList.length}
 * Font size  : ${(woffBuf.length / 1024).toFixed(1)} KB
 */

@font-face {
  font-family: 'Material Symbols Outlined';
  font-style: normal;
  font-weight: 100 700;
  font-display: swap;
  src: url('/fonts/${FONT_FILE}') format('woff2');
}

.material-symbols-outlined {
  font-family: 'Material Symbols Outlined';
  font-weight: normal;
  font-style: normal;
  font-size: 24px;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-block;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  -webkit-font-feature-settings: 'liga';
  -webkit-font-smoothing: antialiased;
  font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24;
  vertical-align: middle;
}
`;

writeFileSync(join(STYLES_DIR, CSS_FILE), localCss);

console.log(`✓ Font guardada en ${PUBLIC_FONTS_DIR}/${FONT_FILE} (${(woffBuf.length / 1024).toFixed(1)} KB)`);
console.log(`✓ CSS guardado en ${STYLES_DIR}/${CSS_FILE}`);
