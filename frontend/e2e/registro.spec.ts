import { expect, test } from '@playwright/test';
import { uniqueEmail } from './fixtures';

/**
 * Flujo de oro 1 — Auto-registro de paciente.
 *
 * Se ha migrado del flujo OTP antiguo (2 pasos con código numérico) al flujo
 * actual de Supabase Auth:
 *   - 1 paso: nombre + apellidos + email + DNI + contraseña.
 *   - Supabase envía email de verificación con link.
 *   - El link redirige a /auth/callback y crea la ficha cifrada.
 *
 * No completamos el paso de "click en email" porque requeriría leer el buzón
 * real (Resend). Verificamos que el paso 1 valida los 5 campos y muestra el
 * aviso de "verifica tu correo" tras POSTear.
 */

test.describe('Registro paciente — signUp con email verification', () => {
  test('valida DNI/NIE + política de contraseña y muestra aviso de verificación', async ({
    page,
  }) => {
    const email = uniqueEmail('signup');

    await page.goto('/registro-paciente');

    await page.getByLabel('Nombre', { exact: true }).fill('María');
    await page.getByLabel(/apellidos/i).fill('Pérez García');
    await page.getByLabel(/correo electr[oó]nico/i).fill(email);
    await page.getByLabel(/dni/i).fill('12345678Z');

    await page
      .getByLabel('Contraseña', { exact: true })
      .fill('MiClave.Segura#2026');
    await page.getByLabel(/repetir contrase[ñn]a/i).fill('MiClave.Segura#2026');

    await page.getByRole('checkbox').check();

    await page.getByRole('button', { name: /crear mi cuenta/i }).click();

    await expect(page.getByText(/verifica tu correo|email enviado/i)).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(email)).toBeVisible();
  });

  test('bloquea envío si la contraseña es débil', async ({ page }) => {
    const email = uniqueEmail('signup-weak');

    await page.goto('/registro-paciente');

    await page.getByLabel('Nombre', { exact: true }).fill('Juan');
    await page.getByLabel(/apellidos/i).fill('García López');
    await page.getByLabel(/correo electr[oó]nico/i).fill(email);
    await page.getByLabel(/dni/i).fill('12345678Z');

    await page.getByLabel('Contraseña', { exact: true }).fill('corta');
    await page.getByLabel(/repetir contrase[ñn]a/i).fill('corta');

    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: /crear mi cuenta/i }).click();

    // Error del validador client-side (no llega a Supabase).
    await expect(page.getByText(/no cumple la pol[ií]tica|debe tener al menos 12/i)).toBeVisible();
  });

  test('rechaza DNI con letra incorrecta', async ({ page }) => {
    const email = uniqueEmail('signup-baddni');

    await page.goto('/registro-paciente');

    await page.getByLabel('Nombre', { exact: true }).fill('Ana');
    await page.getByLabel(/apellidos/i).fill('Ruiz');
    await page.getByLabel(/correo electr[oó]nico/i).fill(email);
    await page.getByLabel(/dni/i).fill('12345678A'); // letra incorrecta
    await page
      .getByLabel('Contraseña', { exact: true })
      .fill('MiClave.Segura#2026');
    await page.getByLabel(/repetir contrase[ñn]a/i).fill('MiClave.Segura#2026');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: /crear mi cuenta/i }).click();

    await expect(page.getByText(/letra del dni no coincide|dni.*no v[aá]lido/i)).toBeVisible();
  });
});
