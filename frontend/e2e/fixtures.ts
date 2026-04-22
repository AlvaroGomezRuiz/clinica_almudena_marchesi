/**
 * Fixtures y helpers compartidos para los tests Playwright.
 *
 * - `loginAs`       → login contra la app real (usa seed demo)
 * - `uniqueEmail`   → email único para registro OTP sin colisionar
 * - `fillStripeCard`→ rellena Stripe Payment Element (test mode 4242...)
 */

import type { Page } from '@playwright/test';

export const SEED = {
  adminEmail: process.env.PLAYWRIGHT_ADMIN_EMAIL ?? 'almudena@admin.com',
  adminPassword: process.env.PLAYWRIGHT_ADMIN_PASSWORD ?? 'Almudena2026!',
  patientEmail: process.env.PLAYWRIGHT_PATIENT_EMAIL ?? 'usuario@visualizacion.com',
  patientPassword: process.env.PLAYWRIGHT_PATIENT_PASSWORD ?? 'Usuario2026!',
};

export function uniqueEmail(prefix = 'e2e'): string {
  return `${prefix}+${Date.now()}-${Math.floor(Math.random() * 1e6)}@almudena.test`;
}

export async function loginAs(page: Page, kind: 'admin' | 'patient'): Promise<void> {
  const email = kind === 'admin' ? SEED.adminEmail : SEED.patientEmail;
  const password = kind === 'admin' ? SEED.adminPassword : SEED.patientPassword;

  await page.goto('/login');
  // Next dev server a veces se despierta lento: espera SSR
  await page.waitForLoadState('networkidle');

  await page.getByLabel(/correo|email/i).fill(email);
  await page.getByLabel(/contraseña|password/i).fill(password);
  await page.getByRole('button', { name: /entrar|iniciar sesión|acceder/i }).click();

  // Redirige al área correspondiente
  const expected = kind === 'admin' ? '/admin' : '/portal';
  await page.waitForURL(new RegExp(`${expected}(/|$)`), { timeout: 20_000 });
}

/**
 * Rellena el Stripe Payment Element con la tarjeta de test 4242..., CVC cualquiera
 * y fecha futura. Funciona en `stripe-js` v9+ porque el PE está dentro de iframes
 * anidados; Playwright sabe recorrerlos via `frameLocator`.
 */
export async function fillStripeCard(page: Page): Promise<void> {
  const pe = page.frameLocator('iframe[name^="__privateStripeFrame"]').first();
  await pe.getByPlaceholder(/número de tarjeta|card number/i).fill('4242424242424242');
  await pe.getByPlaceholder(/mm \/ aa|mm \/ yy|mmaa/i).fill('12' + String(new Date().getFullYear() + 2).slice(-2));
  await pe.getByPlaceholder(/cvc|cvv/i).fill('123');
  const zip = pe.getByPlaceholder(/cp|zip|postal/i);
  if (await zip.count()) await zip.first().fill('28008');
}
