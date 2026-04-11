'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { randomUUID } from 'crypto';

function redirectLoginError(message: string, redirectToRaw: string): never {
  const safeNext =
    redirectToRaw &&
    redirectToRaw.startsWith('/') &&
    !redirectToRaw.startsWith('//')
      ? redirectToRaw
      : '';

  const params = new URLSearchParams();
  if (safeNext) params.set('next', safeNext);
  params.set('error', message);
  redirect(`/login?${params.toString()}`);
}

export async function loginAction(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '').trim();
  const trustDevice = Boolean(formData.get('trust_device'));
  const redirectToRaw = String(formData.get('redirect_to') ?? '').trim();

  if (!email || !password) {
    redirectLoginError('Email y contraseña obligatorios.', redirectToRaw);
  }

  const backendUrl =
    process.env.BACKEND_URL ?? 'http://localhost:8000/api/v1/auth';

  const h = headers();
  const userAgent = h.get('user-agent') ?? '';
  const forwardedFor =
    h.get('x-forwarded-for') ?? h.get('X-Forwarded-For') ?? '';
  const realIp = h.get('x-real-ip') ?? h.get('X-Real-IP') ?? '';

  const cookieStore = cookies();
  const existingDeviceId = cookieStore.get('device_id')?.value;
  const deviceId = trustDevice ? (existingDeviceId ?? randomUUID()) : null;

  const res = await fetch(`${backendUrl}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(userAgent ? { 'User-Agent': userAgent } : {}),
      ...(forwardedFor ? { 'X-Forwarded-For': forwardedFor } : {}),
      ...(realIp ? { 'X-Real-IP': realIp } : {}),
    },
    body: JSON.stringify({
      username: email,
      password,
      trust_device: trustDevice,
      device_fingerprint: deviceId,
    }),
    cache: 'no-store',
  });

  const data: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const detail =
      typeof (data as any)?.detail === 'string' ? (data as any).detail : null;
    const message =
      typeof (data as any)?.message === 'string' ? (data as any).message : null;

    redirectLoginError(
      detail ?? message ?? `Login fallido (${res.status})`,
      redirectToRaw
    );
  }

  const jwt =
    typeof (data as any)?.access_token === 'string'
      ? (data as any).access_token
      : typeof (data as any)?.jwt === 'string'
        ? (data as any).jwt
        : typeof (data as any)?.token === 'string'
          ? (data as any).token
          : null;

  if (!jwt) {
    redirectLoginError('JWT ausente en respuesta.', redirectToRaw);
  }

  const THIRTY_DAYS = 60 * 60 * 24 * 30;

  cookieStore.set('auth_token', jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    ...(trustDevice ? { maxAge: THIRTY_DAYS } : {}),
  });

  if (trustDevice && deviceId) {
    cookieStore.set('device_id', deviceId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: THIRTY_DAYS,
    });
  }

  const redirectTo =
    redirectToRaw &&
    redirectToRaw.startsWith('/') &&
    !redirectToRaw.startsWith('//')
      ? redirectToRaw
      : '/dashboard';

  redirect(redirectTo);
}
