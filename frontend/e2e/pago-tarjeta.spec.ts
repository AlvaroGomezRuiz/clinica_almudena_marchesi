import { expect, test } from '@playwright/test';
import { fillStripeCard, loginAs } from './fixtures';

/**
 * Flujo de oro 3 — Pago con tarjeta (Stripe Payment Element, test mode).
 *
 * 1. Login como paciente
 * 2. Ir a /portal/pagos y comprar un bono (test)
 * 3. Rellenar Stripe con 4242 4242 4242 4242
 * 4. Confirmar y verificar redirect a página de éxito
 *
 * Requiere que Stripe esté en test mode y el webhook apunte al proyecto.
 * Si no está disponible, el test falla pronto (sin coste) y se puede
 * marcar skip en CI con `test.skip(!process.env.STRIPE_TEST_OK, ...)`.
 */

test.describe('Pago con tarjeta (Stripe test)', () => {
  test.skip(
    !process.env.PLAYWRIGHT_STRIPE_TEST,
    'Activar con PLAYWRIGHT_STRIPE_TEST=1 cuando Stripe test esté montado'
  );

  test('paciente compra bono con tarjeta 4242', async ({ page }) => {
    await loginAs(page, 'patient');

    await page.goto('/portal/pagos');
    await page.getByRole('button', { name: /comprar bono|bono.*sesi/i }).first().click();

    // Elige plan (ej. 5 sesiones)
    await page.getByRole('button', { name: /5 sesiones|pack 5/i }).first().click();

    // Aparece Stripe Payment Element
    await expect(page.frameLocator('iframe[name^="__privateStripeFrame"]').first().locator('body')).toBeVisible({ timeout: 15_000 });

    await fillStripeCard(page);

    await page.getByRole('button', { name: /pagar|confirmar pago/i }).click();

    // Esperamos redirect a página de éxito (o chip "Pago completado")
    await expect(page.getByText(/pago.*completado|gracias|bono activo/i)).toBeVisible({ timeout: 30_000 });
  });
});
