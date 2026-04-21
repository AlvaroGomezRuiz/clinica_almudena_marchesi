/**
 * Callback OAuth / Email Verification de Supabase Auth.
 * URL: /auth/callback?code=...&type=signup|recovery|magiclink
 *
 * Flujo:
 *   1. Intercambia el `code` por sesión cookies httpOnly (@supabase/ssr).
 *   2. Si es signup y primera confirmación → dispara welcome email (fire-and-forget).
 *   3. Redirige: signup → /portal, recovery → /auth/reset, default → /portal.
 */

import { NextResponse, type NextRequest } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { fireEmail } from '@/lib/email/send';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const type = searchParams.get('type') ?? 'signup';
  const nextPath = safeNext(searchParams.get('next'));

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = createServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data?.user) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error?.message ?? 'auth_exchange_failed')}`
    );
  }

  // Dispara welcome email tras confirmación inicial (signup flow)
  if (type === 'signup') {
    void fireEmail({
      type: 'welcome',
      toUserId: data.user.id,
      data: {},
    });
  }

  const target =
    type === 'recovery'
      ? '/auth/reset'
      : type === 'signup'
        ? nextPath ?? '/portal'
        : nextPath ?? '/portal';

  return NextResponse.redirect(`${origin}${target}`);
}

function safeNext(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith('/') || raw.startsWith('//')) return null;
  return raw;
}
