'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { createBrowserClient } from '@/lib/supabase/client';

/**
 * Suscripción ligera a cambios en tablas Supabase.
 *
 * Monta en cualquier Server Component envolviendo este componente cliente.
 * Ante cualquier INSERT/UPDATE/DELETE en las tablas indicadas, dispara
 * `router.refresh()` — Next re-ejecuta los loaders del segment actual sin
 * hard-reload, manteniendo animaciones y scroll position.
 *
 * Rendimiento:
 *   - Un solo canal WebSocket compartido por página.
 *   - Filtro `replica identity full` en migración 0004 garantiza payload completo.
 *   - Debounce implícito: Next coalesces múltiples `refresh()` en una sola
 *     revalidación (arquitectura Server Components).
 */
interface Props {
  readonly tables: readonly string[];
  readonly filter?: string;
  readonly channelName?: string;
}

export default function RealtimeRefresh({
  tables,
  filter,
  channelName = 'realtime-refresh',
}: Props): null {
  const router = useRouter();

  useEffect(() => {
    const supabase = createBrowserClient();
    const channel = supabase.channel(channelName);

    tables.forEach((table) => {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter,
        },
        () => {
          router.refresh();
        }
      );
    });

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [router, channelName, filter, tables]);

  return null;
}
