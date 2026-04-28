'use client';

/**
 * Tras OAuth/redirección post-registro, el primer RSC a veces llega sin hidratar
 * el árbol completo; un refresh puntual al montar evita pantalla en negro hasta F5.
 */
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

export default function BienvenidaFirstPaintRefresh(): null {
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    router.refresh();
  }, [router]);

  return null;
}
