import { expect, test } from '@playwright/test';
import { uniqueEmail } from './fixtures';

/**
 * Flujo de oro 1 — Auto-registro con OTP.
 *
 * No completamos el paso 2 (verificación OTP) porque requeriría leer el email
 * real de Resend. Verificamos que el paso 1 POSTea correctamente y redirige a
 * `/registro-paciente/verificar` con la query apropiada.
 *
 * Si quieres un test full-cycle, monta un `Inbox` de test (p.ej. Mailosaur) y
 * extrae el OTP desde el webhook de Resend.
 */

test.describe('Registro OTP — paso 1', () => {
  test('recoge datos clínicos y envía OTP', async ({ page }) => {
    const email = uniqueEmail('otp');

    await page.goto('/registro-paciente');

    // Paso 1 — datos personales + clínicos.
    await page.getByLabel(/nombre completo/i).fill('Test E2E Paciente');
    await page.getByLabel(/dni|nie/i).fill('12345678Z');
    await page.getByLabel(/tel[eé]fono/i).fill('+34699111222');
    await page.getByLabel(/correo|email/i).fill(email);

    const fecha = page.getByLabel(/fecha de nacimiento/i);
    if (await fecha.count()) await fecha.fill('1990-05-12');

    const motivo = page.getByLabel(/motivo|por qu[eé] vienes/i);
    if (await motivo.count()) await motivo.fill('Necesito apoyo para gestionar ansiedad.');

    const experiencia = page.getByLabel(/terapia previa|experiencia/i);
    if (await experiencia.count()) await experiencia.fill('He ido 6 meses en 2022.');

    const medicacion = page.getByLabel(/medicaci[oó]n/i);
    if (await medicacion.count()) await medicacion.fill('Ninguna.');

    // Consentimiento RGPD (checkbox obligatorio)
    const rgpd = page.getByRole('checkbox', { name: /rgpd|protecci[oó]n de datos|consentimiento/i });
    if (await rgpd.count()) await rgpd.first().check();

    await page.getByRole('button', { name: /enviar|c[oó]digo|verificaci[oó]n/i }).click();

    // Esperamos la página de verificación OTP (o un mensaje de "te hemos enviado un código")
    await expect(page).toHaveURL(/verificar|otp/i, { timeout: 15_000 });
    await expect(page.getByText(/c[oó]digo|otp/i)).toBeVisible();
  });
});
