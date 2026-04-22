import { expect, test } from '@playwright/test';

/**
 * Smoke test — las 3 páginas públicas clave cargan sin error HTTP.
 * Permite detectar regresiones catastróficas (500, CSP rota, import fail)
 * en <5s antes de correr el resto de la suite.
 */

test.describe('Smoke público', () => {
  test('home carga y pinta el hero', async ({ page }) => {
    const res = await page.goto('/');
    expect(res?.status()).toBeLessThan(400);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('/login carga el formulario', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel(/correo|email/i)).toBeVisible();
    await expect(page.getByLabel(/contraseña|password/i)).toBeVisible();
  });

  test('/registro-paciente carga el wizard', async ({ page }) => {
    await page.goto('/registro-paciente');
    await expect(page.locator('form')).toBeVisible();
  });
});
