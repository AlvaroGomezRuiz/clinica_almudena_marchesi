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

    // Paso explícito: «Confirmar hora» abre el modal de política 48h.
    await page.getByRole('button', { name: /^Confirmar hora$/i }).first().click();
    await expect(page.getByRole('heading', { name: /ventana de 48 horas/i })).toBeVisible({
      timeout: 10_000,
    });

    // Confirmación final dentro del diálogo (misma etiqueta; scope al modal).
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: /^Confirmar hora$/i }).click();

    // El modal se cierra al terminar la acción (éxito o error manejado).
    await expect(dialog).toBeHidden({ timeout: 25_000 });
  });
});
