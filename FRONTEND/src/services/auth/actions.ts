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

  const roleRaw =
    typeof (data as any)?.role === 'string' ? (data as any).role : '';
  const role = roleRaw.trim().toLowerCase();
  if (role !== 'paciente' && role !== 'admin') {
    redirectLoginError('Rol inválido en respuesta.', redirectToRaw);
  }

  const provisioningUriRaw = (data as any)?.provisioning_uri;
  const provisioningUri =
    typeof provisioningUriRaw === 'string' && provisioningUriRaw.trim()
      ? provisioningUriRaw.trim()
      : null;

  const THIRTY_DAYS = 60 * 60 * 24 * 30;

  const authTokenMaxAge =
    role === 'paciente' ? THIRTY_DAYS : trustDevice ? THIRTY_DAYS : undefined;

  cookieStore.set('auth_token', jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    ...(authTokenMaxAge ? { maxAge: authTokenMaxAge } : {}),
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

  if (role === 'admin' && provisioningUri) {
    cookieStore.set('admin_provisioning_uri', provisioningUri, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/admin',
      maxAge: 10 * 60,
    });
  } else {
    cookieStore.delete({ name: 'admin_provisioning_uri', path: '/admin' });
  }

  redirect(role === 'paciente' ? '/portal' : '/admin/mfa');
}

function redirectAdminMfaError(message: string): never {
  const params = new URLSearchParams();
  params.set('error', message);
  redirect(`/admin/mfa?${params.toString()}`);
}

export async function verifyAdminMfaAction(formData: FormData): Promise<void> {
  const code = String(formData.get('code') ?? '')
    .trim()
    .replace(/\s+/g, '');

  if (!/^\d{6}$/.test(code)) {
    redirectAdminMfaError('Código inválido (6 dígitos).');
  }

  const cookieStore = cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) {
    redirect('/login');
  }

  const backendUrl =
    process.env.BACKEND_URL ?? 'http://localhost:8000/api/v1/auth';

  const res = await fetch(`${backendUrl}/admin/verify-totp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ code }),
    cache: 'no-store',
  });

  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const detail =
      typeof (data as any)?.detail === 'string' ? (data as any).detail : null;
    redirectAdminMfaError(detail ?? `Verificación fallida (${res.status})`);
  }

  cookieStore.delete({ name: 'admin_provisioning_uri', path: '/admin' });

  redirect('/admin');
}

export async function logoutAction(): Promise<void> {
  const cookieStore = cookies();
  cookieStore.delete('auth_token');
  cookieStore.delete({ name: 'admin_provisioning_uri', path: '/admin' });
  redirect('/login');
}
