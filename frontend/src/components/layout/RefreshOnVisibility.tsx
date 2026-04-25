'use client';

/**
 * Tras volver a la pestaña/app (p. ej. tras cambiar foto de perfil en otro
 * dispositivo), fuerza una revalidación del árbol de Server Components.
 */
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function RefreshOnVisibility(): null {
  const router = useRouter();

  useEffect(() => {
    const onVis = (): void => {
      if (document.visibilityState === 'visible') {
        router.refresh();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [router]);

  return null;
}
