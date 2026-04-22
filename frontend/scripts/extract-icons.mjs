/**
 * extract-icons.mjs
 *
 * Recorre src/ buscando usos de Material Symbols y emite la lista única de
 * iconos en uso. Sirve para generar un subset woff2 vía Google Fonts API.
 *
 * Captura TODOS los patrones por los que pasamos un icono:
 *   1. <span className="material-symbols-outlined ...">icono</span>
 *      (soporta multilínea: icono puede estar en una línea separada)
 *   2. <span ...>{'icono'}</span>  ó  {"icono"}
 *   3. Ternarios JSX: <span>{flag ? 'iconA' : 'iconB'}</span>
 *   4. icon="icono"       (prop JSX: <Button icon="..." />)
 *   5. icon: 'icono'      (constantes en NavItem[] y similares)
 *   6. data-icon="icono"  (drawer mobile)
 *   7. iconFor(...) / trendIcon / ICON_BY_STATUS / iconGlyph / metodoIcon
 *      devuelven literales 'icono' — los capturamos dentro de expresiones.
 *   8. Cualquier literal string corto que coincida con un nombre canónico
 *      de Material Symbols en un archivo que también contenga la clase
 *      `material-symbols-outlined` (heurística de seguridad).
 *
 * Además incluye una lista de ICONOS SAFE que siempre entran al bundle
 * (evita regresiones si añadimos un icono con un patrón nuevo). Son baratos:
 * solo pesan unos bytes por glyph.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue;
      out.push(...walk(p));
    } else if (/\.(tsx?|jsx?|css|mdx?)$/i.test(entry.name)) {
      out.push(p);
    }
  }
  return out;
}

const files = walk('src');
const icons = new Set();

/* ------------------------------------------------------------------ */
/* Regex para capturar iconos                                          */
/* ------------------------------------------------------------------ */

// Patrón 1: <span className="material-symbols-outlined ...">ICONO</span>
//   - [\s\S]*? permite multilínea entre la clase y el '>'
//   - \s* admite saltos antes y después del nombre
const re1 = /material-symbols-outlined[\s\S]*?>\s*([a-z_][a-z0-9_]*)\s*</g;

// Patrón 2: <span ...>{'icono'}</span>
const re2 = /material-symbols-outlined[\s\S]*?>\s*\{\s*['"]([a-z_][a-z0-9_]+)['"]\s*\}\s*</g;

// Patrón 3: Ternarios JSX — captura AMBOS iconos
//   <span>{cond ? 'iconA' : 'iconB'}</span>
const re3 = /material-symbols-outlined[\s\S]*?>\s*\{[^{}]*\?\s*['"]([a-z_][a-z0-9_]+)['"][^{}]*:\s*['"]([a-z_][a-z0-9_]+)['"][^{}]*\}\s*</g;

// Patrón 4: icon="nombre" o icon='nombre'   (props JSX)
const re4 = /\bicon\s*=\s*["']([a-z_][a-z0-9_]+)["']/g;

// Patrón 5: icon: "nombre" / icon: 'nombre'   (objetos)
const re5 = /\bicon\s*:\s*["']([a-z_][a-z0-9_]+)["']/g;

// Patrón 6: data-icon="nombre"
const re6 = /\bdata-icon\s*=\s*["']([a-z_][a-z0-9_]+)["']/g;

// Patrón 7: funciones/constantes conocidas que devuelven literales
const re7 = /(?:trendIcon|iconFor|ICON_BY_STATUS|iconGlyph|metodoIcon|statusIcon|pillar\.icon|cred\.icon|action\.icon|item\.icon)[\s\S]*?['"]([a-z_][a-z0-9_]{1,40})['"]/g;

// Patrón 8: `return 'icono'` cuando la función está tipada como icono
//   - captura casos como `return 'check_circle';` dentro de helpers
//   - sólo aplicamos si el archivo contiene `material-symbols-outlined`
const re8 = /\breturn\s+['"]([a-z_][a-z0-9_]+)['"]/g;

for (const f of files) {
  const content = readFileSync(f, 'utf8');
  const hasMaterial = content.includes('material-symbols-outlined');

  // Regex 1-7 aplican siempre
  for (const re of [re1, re2, re4, re5, re6, re7]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(content))) {
      icons.add(m[1]);
    }
  }

  // Regex 3 captura 2 grupos (ternarios)
  re3.lastIndex = 0;
  let m3;
  while ((m3 = re3.exec(content))) {
    icons.add(m3[1]);
    icons.add(m3[2]);
  }

  // Regex 8 solo en archivos que ya usan material-symbols
  if (hasMaterial) {
    re8.lastIndex = 0;
    let m8;
    while ((m8 = re8.exec(content))) {
      icons.add(m8[1]);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Lista SAFE (glyph names garantizados — se mantienen en el subset)   */
/* ------------------------------------------------------------------ */
const SAFE = [
  // Navegación principal
  'home', 'dashboard', 'event', 'schedule', 'calendar_month', 'calendar_today',
  'chat', 'chat_bubble', 'forum', 'mail', 'inbox', 'send', 'reply', 'mark_chat_unread', 'mark_email_unread',
  'folder', 'folder_open', 'folder_shared', 'description', 'article', 'sticky_note_2',
  'group', 'people', 'person', 'person_add', 'account_circle', 'badge', 'group_add',
  'menu_book', 'auto_stories', 'school',
  'settings', 'tune', 'manage_accounts', 'admin_panel_settings',
  'menu', 'close', 'arrow_back', 'arrow_forward', 'arrow_upward', 'arrow_downward',
  'arrow_outward', 'chevron_left', 'chevron_right',
  'expand_more', 'expand_less', 'more_horiz', 'more_vert',
  'search', 'filter_alt', 'sort', 'visibility', 'visibility_off',
  'add', 'add_notes', 'remove', 'edit', 'edit_square', 'delete', 'archive', 'undo',
  'check', 'check_circle', 'done', 'done_all', 'clear',
  'download', 'upload', 'upload_file', 'file_upload', 'file_download', 'attach_file',
  'image', 'photo_camera', 'mic', 'play_arrow', 'pause', 'stop',
  'link', 'content_copy', 'open_in_new', 'share', 'ios_share',
  'info', 'help', 'warning', 'error', 'priority_high', 'task_alt', 'block',
  'lock', 'lock_open', 'password', 'key', 'shield', 'shield_lock',
  'verified', 'verified_user', 'security', 'encrypted', 'fingerprint', 'privacy_tip', 'policy',
  'logout', 'login',
  'notifications', 'notifications_active', 'notifications_off',
  'volume_up', 'volume_off',
  // Tema / modo visual
  'dark_mode', 'light_mode', 'computer', 'palette',
  // Salud / clínica
  'medical_services', 'medical_information', 'local_hospital', 'health_and_safety',
  'monitor_heart', 'psychology', 'psychology_alt', 'self_improvement', 'neurology',
  'medication', 'pill', 'vaccines', 'science', 'volunteer_activism', 'hearing',
  'assignment', 'assignment_ind', 'assignment_turned_in', 'add_notes',
  // Pagos
  'credit_card', 'payments', 'euro', 'receipt', 'receipt_long', 'price_check',
  'card_membership', 'confirmation_number', 'account_balance_wallet', 'savings',
  'shopping_bag',
  // Agenda / citas
  'event_available', 'event_busy', 'event_note', 'event_upcoming', 'event_repeat',
  'schedule_send', 'today', 'update', 'sync', 'sync_alt', 'autorenew', 'progress_activity',
  'hourglass_empty', 'hourglass_top',
  // Contacto / ubicación
  'phone', 'call', 'emergency', 'location_on', 'place', 'public', 'language',
  // Feedback
  'favorite', 'favorite_border', 'star', 'thumb_up', 'thumb_down',
  'sentiment_satisfied', 'mood', 'neutral',
  // Estados / tendencias
  'trending_up', 'trending_down', 'trending_flat',
  // Layout / estructura
  'view_week', 'grid_view', 'diversity_3', 'auto_awesome', 'auto_awesome_motion',
  'picture_as_pdf',
];
for (const g of SAFE) icons.add(g);

/* ------------------------------------------------------------------ */
/* Filtro final: descartamos tokens que NO son iconos Material Symbols */
/* (palabras reservadas que el regex capturó como falsos positivos)    */
/* ------------------------------------------------------------------ */
const BLACKLIST = new Set([
  /* Palabras reservadas / JS tokens */
  'true', 'false', 'null', 'undefined', 'void', 'return', 'const', 'let', 'var',
  'function', 'class', 'async', 'await', 'yield', 'throw', 'new', 'this',
  'super', 'import', 'export', 'default', 'as', 'from',
  'string', 'number', 'boolean', 'object', 'symbol', 'any', 'unknown',
  /* Direcciones genéricas (no son glyphs) */
  'dark', 'light', 'up', 'down', 'left', 'right', 'audio',
  /* Falsos positivos frecuentes del regex (no son iconos reales de
     Material Symbols; Google Fonts los descartaría silenciosamente y,
     en el peor caso, corrompe el subset). */
  '_blank', 'button', 'submit', 'apple',
  'completado', 'critical', 'neutral', 'positive', 'warm',
  'dni_nie', 'efectivo', 'telefono',
  'google_fill',
]);
for (const b of BLACKLIST) icons.delete(b);

const arr = [...icons].sort();
console.log(arr.join(','));
console.error(`total: ${arr.length}`);
