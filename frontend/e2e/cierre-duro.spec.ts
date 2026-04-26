import { expect, test } from '@playwright/test';

/**
 * Fase 18 — contratos mínimos de seguridad y humo ampliado.
 * Complementa `smoke.spec.ts` sin credenciales (solo respuestas HTTP anónimas).
 */

const UUID_EJEMPLO = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

test.describe('Cierre duro (API pública anónima)', () => {
  const reqTimeout = { timeout: 45_000 } as const;

  test('export facturación sin sesión → 401', async ({ request }) => {
    const res = await request.get(
      '/api/admin/facturacion/export?from=2024-01-01&to=2024-12-31',
      reqTimeout
    );
    expect(res.status(), await res.text()).toBe(401);
  });

  test('descarga recurso portal sin sesión → 401', async ({ request }) => {
    const res = await request.get(
      `/api/portal/recursos/download/${UUID_EJEMPLO}`,
      reqTimeout
    );
    expect(res.status(), await res.text()).toBe(401);
  });

  test('archivo recurso admin sin sesión → 401', async ({ request }) => {
    const res = await request.get(
      `/api/admin/recursos/file/${UUID_EJEMPLO}`,
      reqTimeout
    );
    expect(res.status(), await res.text()).toBe(401);
  });

  test('Sentry check sin token → 404 (oculto)', async ({ request }) => {
    const res = await request.get('/sentry-check', reqTimeout);
    expect(res.status(), await res.text()).toBe(404);
  });
});

test.describe('Cierre duro (público — smoke rápido)', () => {
  test('documentación legal responde', async ({ page }) => {
    const res = await page.goto('/privacidad');
    expect(res?.status()).toBeLessThan(400);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Política de Privacidad' })
    ).toBeVisible();
  });
});
