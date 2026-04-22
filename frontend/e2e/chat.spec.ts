import { expect, test } from '@playwright/test';
import { loginAs } from './fixtures';

/**
 * Flujo de oro 4 — Chat admin ↔ paciente en tiempo real.
 *
 * Dos contextos en paralelo (admin + paciente). El paciente envía un mensaje
 * y el admin debe verlo aparecer vía Supabase realtime (postgres_changes +
 * RPC `chat_descifrar_mensaje`).
 *
 * Dado que el chat ahora se cifra en reposo con `app_encrypt`, este test
 * también valida que el plaintext llega correctamente tras el roundtrip de
 * descifrado por RPC.
 */

test.describe('Chat realtime', () => {
  test('paciente envía y admin recibe descifrado', async ({ browser }) => {
    const adminCtx = await browser.newContext();
    const patientCtx = await browser.newContext();
    const adminPage = await adminCtx.newPage();
    const patientPage = await patientCtx.newPage();

    try {
      await loginAs(adminPage, 'admin');
      await loginAs(patientPage, 'patient');

      // Paciente abre su chat.
      await patientPage.goto('/portal/mensajes');
      await expect(patientPage.getByPlaceholder(/escribe un mensaje/i)).toBeVisible();

      // Admin abre bandeja y elige primera conversación.
      await adminPage.goto('/admin/mensajes');
      const firstConv = adminPage.getByRole('link', { name: /\w+/i }).first();
      await firstConv.click();

      await expect(adminPage.getByPlaceholder(/escribe un mensaje/i)).toBeVisible();

      // Paciente envía un mensaje único.
      const unique = `e2e-${Date.now()}`;
      await patientPage.getByPlaceholder(/escribe un mensaje/i).fill(unique);
      await patientPage.keyboard.press('Enter');

      // Debería aparecer en el panel del admin en <5s vía realtime.
      await expect(adminPage.getByText(unique, { exact: false })).toBeVisible({ timeout: 10_000 });
    } finally {
      await adminCtx.close();
      await patientCtx.close();
    }
  });
});
