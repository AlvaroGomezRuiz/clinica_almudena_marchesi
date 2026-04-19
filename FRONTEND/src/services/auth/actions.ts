'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { randomUUID } from 'crypto';

type ErrorPayload = {
  detail?: string;
  message?: string;
};

type LoginPayload = {
  access_token: string;
  role: 'paciente' | 'admin';
  provisioning_uri?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseErrorPayload(data: unknown): ErrorPayload | null {
  if (!isRecord(data)) return null;
  const detail = data['detail'];
  const message = data['message'];
  return {
    ...(typeof detail === 'string' ? { detail } : {}),
    ...(typeof message === 'string' ? { message } : {}),
  };
}

function parseLoginPayload(data: unknown): LoginPayload | null {
  if (!isRecord(data)) return null;
  const accessToken = data['access_token'];
  const role = data['role'];
  if (typeof accessToken !== 'string') return null;
  if (role !== 'paciente' && role !== 'admin') return null;

  const provisioningUri = data['provisioning_uri'];
  return {
    access_token: accessToken,
    role,
    ...(typeof provisioningUri === 'string' && provisioningUri.trim()
      ? { provisioning_uri: provisioningUri.trim() }
      : {}),
  };
}

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

  const backendApiUrl =
    process.env.NEXT_PUBLIC_BACKEND_API_URL ?? 'http://localhost:8000/api/v1';
  const backendUrl = `${backendApiUrl}/auth`;

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
    const err = parseErrorPayload(data);

    redirectLoginError(
      err?.detail ?? err?.message ?? `Login fallido (${res.status})`,
      redirectToRaw
    );
  }

  const parsed = parseLoginPayload(data);
  if (!parsed) {
    redirectLoginError('JWT ausente en respuesta.', redirectToRaw);
  }

  const jwt = parsed.access_token;
  const role = parsed.role;
  const provisioningUri = parsed.provisioning_uri ?? null;

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

  const backendApiUrl =
    process.env.NEXT_PUBLIC_BACKEND_API_URL ?? 'http://localhost:8000/api/v1';
  const backendUrl = `${backendApiUrl}/auth`;

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
    const err = parseErrorPayload(data);
    redirectAdminMfaError(err?.detail ?? `Verificación fallida (${res.status})`);
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
