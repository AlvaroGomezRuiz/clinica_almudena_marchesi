/**
 * extract-icons.mjs
 *
 * Recorre src/ buscando usos de Material Symbols y emite la lista única de
 * iconos en uso. Sirve para generar un subset woff2 vía Google Fonts API.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (/\.(tsx?|jsx?|css)$/i.test(entry.name)) out.push(p);
  }
  return out;
}

const files = walk('src');
const icons = new Set();

/* Patron 1: <span className="material-symbols-outlined ...">ICON</span> */
const re1 = /material-symbols-outlined[^>]*>\s*([a-z_0-9]+)\s*</g;

for (const f of files) {
  const content = readFileSync(f, 'utf8');
  let m;
  while ((m = re1.exec(content))) {
    icons.add(m[1]);
  }
}

const arr = [...icons].sort();
console.log(arr.join(','));
console.error(`total: ${arr.length}`);
