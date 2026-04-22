import { expect, test } from '@playwright/test';
import { loginAs } from './fixtures';

/**
 * Flujo de oro 2 — Reserva de sesión desde el portal del paciente.
 *
 * Recorre `/portal/citas/reservar`: elige servicio, día y slot. Verifica
 * que aparece el drawer de confirmación (`Confirmar reserva` o similar).
 * No completa el pago (eso lo prueba `pago-tarjeta.spec.ts`).
 */

test.describe('Reserva de sesión', () => {
  test('paciente puede seleccionar servicio + slot', async ({ page }) => {
    await loginAs(page, 'patient');

    await page.goto('/portal/citas/reservar');

    // Espera a que cargue la lista de servicios.
    await expect(
      page.getByRole('heading', { name: /reservar|disponibilidad|sesi[oó]n/i }).first()
    ).toBeVisible({ timeout: 20_000 });

    // Elige primer servicio disponible.
    const servicioBtn = page.getByRole('button', { name: /consulta|sesi[oó]n|terapia/i }).first();
    await servicioBtn.click();

    // Elige primer slot disponible dentro de la siguiente semana.
    // Los slots se renderizan como botones con label tipo "10:00".
    const primerSlot = page.getByRole('button', { name: /^\d{1,2}:\d{2}$/ }).first();
    await expect(primerSlot).toBeVisible({ timeout: 15_000 });
    await primerSlot.click();

    // Debe aparecer el drawer/resumen de reserva.
    await expect(
      page.getByRole('button', { name: /confirmar|reservar|pagar/i }).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
