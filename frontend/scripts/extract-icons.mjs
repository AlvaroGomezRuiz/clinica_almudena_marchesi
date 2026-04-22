/**
 * extract-icons.mjs
 *
 * Recorre src/ buscando usos de Material Symbols y emite la lista única de
 * iconos en uso. Sirve para generar un subset woff2 vía Google Fonts API.
 *
 * Captura TODOS los patrones por los que pasamos un icono:
 *   1. <span className="material-symbols-outlined ...">icono</span>
 *   2. <span className="material-symbols-outlined ...">{'icono'}</span>
 *   3. icon="icono"       (prop del <Button />, <StatCard />, <EmptyState />…)
 *   4. icon: 'icono'      (constantes en NavItem[] y similares)
 *   5. data-icon="icono"  (usado en algún drawer mobile)
 *   6. iconFor(...) -> 'dark_mode' | 'light_mode' | 'computer' (ThemeToggle)
 *
 * Además incluye una lista de ICONOS SAFE que siempre entran al bundle
 * (evita regresiones si añadimos un icono con un patrón nuevo y se nos
 * olvida regenerar). Son baratos: solo pesan unos bytes por glyph.
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

// Patrón 1: <span className="material-symbols-outlined ...">ICONO</span>
//           soporta \n entre > y nombre
const re1 = /material-symbols-outlined[^>]*>\s*([a-z][a-z0-9_]*)\s*</g;

// Patrón 2: <span ...>{'icono'}</span> dentro de un span material-symbols.
//           Menos común, pero lo cubrimos con un regex complementario.
const re2 = /material-symbols-outlined[^>]*>\s*\{\s*['"]([a-z][a-z0-9_]*)['"]\s*\}\s*</g;

// Patrón 3: icon="nombre" o icon='nombre'   (props JSX)
const re3 = /\bicon\s*=\s*["']([a-z][a-z0-9_]*)["']/g;

// Patrón 4: icon="nombre" dentro de objetos (icon: "nombre" o icon: 'nombre')
const re4 = /\bicon\s*:\s*["']([a-z][a-z0-9_]*)["']/g;

// Patrón 5: data-icon="nombre"   (drawer mobile)
const re5 = /\bdata-icon\s*=\s*["']([a-z][a-z0-9_]*)["']/g;

// Patrón 6: trendIcon / iconFor → 'nombre'
//           Simple, captura cadenas literales dentro de returns/ternarios
//           detrás de 'trendIcon' o 'iconFor' (contextos del ThemeToggle/StatCard).
const re6 = /(?:trendIcon|iconFor|ICON_BY_STATUS|iconGlyph)\s*[:=]?[^;]*?['"]([a-z][a-z0-9_]{1,40})['"]/g;

for (const f of files) {
  const content = readFileSync(f, 'utf8');
  for (const re of [re1, re2, re3, re4, re5, re6]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(content))) {
      icons.add(m[1]);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Lista SAFE (glyph names garantizados — se mantienen en el subset)   */
/* ------------------------------------------------------------------ */
// Navegación + UI genérica
const SAFE = [
  // Navegación principal
  'home', 'dashboard', 'event', 'schedule', 'calendar_month', 'calendar_today',
  'chat', 'chat_bubble', 'forum', 'mail', 'inbox',
  'folder', 'folder_open', 'description', 'article',
  'group', 'people', 'person', 'person_add', 'account_circle',
  'menu_book', 'auto_stories',
  'settings', 'tune', 'manage_accounts', 'admin_panel_settings',
  'menu', 'close', 'arrow_back', 'arrow_forward', 'chevron_left', 'chevron_right',
  'expand_more', 'expand_less', 'more_horiz', 'more_vert',
  'search', 'filter_alt', 'sort', 'visibility', 'visibility_off',
  'add', 'remove', 'edit', 'edit_square', 'delete', 'check', 'check_circle', 'clear',
  'download', 'upload', 'upload_file', 'file_upload', 'file_download', 'attach_file',
  'image', 'photo_camera', 'mic', 'play_arrow', 'pause', 'stop',
  'link', 'content_copy', 'open_in_new', 'share', 'ios_share',
  'info', 'help', 'warning', 'error', 'priority_high', 'task_alt', 'block',
  'lock', 'lock_open', 'password', 'key', 'shield', 'verified', 'verified_user', 'security',
  'logout', 'login',
  'notifications', 'notifications_active', 'notifications_off',
  'volume_up', 'volume_off',
  // Tema / modo visual
  'dark_mode', 'light_mode', 'computer', 'palette',
  // Salud / clínica
  'medical_services', 'medical_information', 'local_hospital', 'health_and_safety',
  'monitor_heart', 'psychology', 'psychology_alt', 'self_improvement',
  'medication', 'pill', 'vaccines', 'science',
  'assignment', 'assignment_ind', 'assignment_turned_in',
  // Pagos
  'credit_card', 'payments', 'euro', 'receipt_long', 'price_check',
  'card_membership', 'confirmation_number',
  // Agenda / citas
  'event_available', 'event_busy', 'event_note', 'event_upcoming', 'event_repeat',
  'schedule_send', 'today', 'update',
  // Contacto / ubicación
  'phone', 'call', 'location_on', 'place', 'public', 'language',
  // Feedback
  'favorite', 'favorite_border', 'star', 'thumb_up', 'thumb_down',
  'sentiment_satisfied', 'mood',
  // Estados / tendencias
  'trending_up', 'trending_down', 'trending_flat',
  'hourglass_empty', 'hourglass_top', 'autorenew', 'sync',
  // Privacidad
  'privacy_tip', 'fingerprint', 'policy',
];
for (const g of SAFE) icons.add(g);

const arr = [...icons].sort();
console.log(arr.join(','));
console.error(`total: ${arr.length}`);
