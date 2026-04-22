import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { loginAs } from './fixtures';

/**
 * Smoke WCAG 2.2 AA con axe-core sobre las 4 zonas clave.
 *
 * Reglas:
 *   - `wcag2a`, `wcag2aa`, `wcag22aa` → sólo violaciones de nivel AA o
 *     inferior. No reportamos contraste de decoraciones (best-practice).
 *   - `disableRules`: excluimos `color-contrast` en temas de marca claramente
 *     auditados manualmente (se mide en Lighthouse mobile aparte).
 *
 * El objetivo es **0 violations** en cada una de las 4 páginas.
 */

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag22aa'];
const IGNORED_RULES = [
  // Next.js inyecta `<noscript>` sin id; no aplica a la UI real.
  'region',
];

test.describe('A11y — WCAG 2.2 AA', () => {
  test('home pública', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(AXE_TAGS)
      .disableRules(IGNORED_RULES)
      .analyze();
    expect.soft(results.violations, formatAxe(results.violations)).toEqual([]);
  });

  test('login', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(AXE_TAGS)
      .disableRules(IGNORED_RULES)
      .analyze();
    expect.soft(results.violations, formatAxe(results.violations)).toEqual([]);
  });

  test('reserva de cita (portal paciente)', async ({ page }) => {
    await loginAs(page, 'patient');
    await page.goto('/portal/citas/reservar');
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(AXE_TAGS)
      .disableRules(IGNORED_RULES)
      .analyze();
    expect.soft(results.violations, formatAxe(results.violations)).toEqual([]);
  });

  test('admin dashboard', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(AXE_TAGS)
      .disableRules(IGNORED_RULES)
      .analyze();
    expect.soft(results.violations, formatAxe(results.violations)).toEqual([]);
  });
});

function formatAxe(violations: readonly unknown[]): string {
  if (violations.length === 0) return '';
  // Formato compacto con la regla + selector + help
  return (violations as Array<{ id: string; help: string; nodes: Array<{ target: readonly string[] }> }>)
    .map((v) => `[${v.id}] ${v.help} · ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)
    .join('\n');
}
