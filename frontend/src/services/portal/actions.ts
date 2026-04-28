'use server';

import { redirect } from 'next/navigation';

import { createServerClient } from '@/lib/supabase/server';

function safePortalNext(raw: FormDataEntryValue | null): string {
  if (typeof raw !== 'string' || raw.length === 0) {
    return '/portal';
  }
  if (!raw.startsWith('/portal') || raw.startsWith('//')) {
    return '/portal';
  }
  return raw;
}

/**
 * Marca la bienvenida del portal como vista y redirige. Solo debe ejecutarse
 * cuando el paciente confirma las CTAs de onboarding (una sola vez por cuenta).
 */
export async function completePortalWelcomeAction(formData: FormData): Promise<void> {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    redirect('/login?reason=no_session');
  }

  const nextPath = safePortalNext(formData.get('next'));

  const { error } = await supabase
    .from('profiles')
    .update({ portal_welcome_completed_at: new Date().toISOString() })
    .eq('id', user.id)
    .eq('role', 'paciente');

  if (error) {
    redirect(`${nextPath}?welcome_error=1`);
  }

  redirect(nextPath);
}
