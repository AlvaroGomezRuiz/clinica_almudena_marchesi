'use server';

import { cookies } from 'next/headers';

const BACKEND_API_URL =
  process.env.NEXT_PUBLIC_BACKEND_API_URL ?? 'http://localhost:8000/api/v1';

/**
 * secureLogout — Logout de "Zero-Footprint".
 *
 * 1. Revoca la sesión en backend (POST /auth/revoke)
 * 2. Borra la cookie auth_token del servidor
 *
 * El frontend debe complementar esta acción limpiando:
 *   - localStorage
 *   - sessionStorage
 *   - IndexedDB
 *   - Cache API
 */
export async function secureLogout(): Promise<{ success: boolean }> {
  const cookieStore = cookies();
  const token = cookieStore.get('auth_token')?.value;

  // 1. Revocar sesión en backend
  if (token) {
    try {
      await fetch(`${BACKEND_API_URL}/auth/revoke`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      });
    } catch {
      // Si falla la revocación, seguimos con la limpieza local.
      // El token expirará naturalmente.
    }
  }

  // 2. Borrar la cookie del servidor
  cookieStore.set('auth_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });

  return { success: true };
}
