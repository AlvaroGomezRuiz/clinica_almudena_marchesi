'use client';

import { useCallback, useEffect, useRef } from 'react';

interface IdleTimeoutConfig {
  /** Timeout en milisegundos. */
  timeoutMs: number;
  /** Callback ejecutado al expirar la inactividad. */
  onIdle: () => void;
  /** Si false, desactiva el hook (útil en páginas públicas). */
  enabled?: boolean;
}

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'mousedown',
  'mousemove',
  'keydown',
  'scroll',
  'touchstart',
  'click',
];

/**
 * useIdleTimeout — Cierre automático de sesión por inactividad.
 *
 * Lógica de timeout aprobada por el cliente:
 *   - Administrador (Almudena): 8 horas = 28_800_000 ms
 *   - Pacientes: 1 hora       =  3_600_000 ms
 *
 * Uso:
 * ```tsx
 * useIdleTimeout({
 *   timeoutMs: role === 'admin' ? 28_800_000 : 3_600_000,
 *   onIdle: () => secureLogout(),
 *   enabled: true,
 * });
 * ```
 */
export function useIdleTimeout({
  timeoutMs,
  onIdle,
  enabled = true,
}: IdleTimeoutConfig): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onIdleRef = useRef(onIdle);

  // Mantener la referencia actualizada sin re-registrar listeners
  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  const resetTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      onIdleRef.current();
    }, timeoutMs);
  }, [timeoutMs]);

  useEffect(() => {
    if (!enabled) return;

    // Iniciar el temporizador al montar
    resetTimer();

    const handleActivity = () => {
      resetTimer();
    };

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, handleActivity, { passive: true });
    }

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, handleActivity);
      }
    };
  }, [enabled, resetTimer]);
}
