'use client';

/**
 * NuevaCitaAdminContext — Estado global para abrir el modal "Nueva cita"
 * desde cualquier punto del panel admin (FAB, AgendaClient DayView, etc.).
 *
 * Se renderiza en admin/layout.tsx y se consume vía hooks en los componentes hijos.
 */

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

interface NuevaCitaAdminState {
  /** Si el modal está abierto. */
  readonly isOpen: boolean;
  /** Fecha preseleccionada (ISO yyyy-MM-dd) al abrir desde agenda. */
  readonly fechaInicial: string | null;
  /** Abre el modal, opcionalmente con fecha preseleccionada. */
  readonly open: (fechaISO?: string) => void;
  /** Cierra el modal. */
  readonly close: () => void;
}

const NuevaCitaAdminCtx = createContext<NuevaCitaAdminState | null>(null);

export function useNuevaCitaAdmin(): NuevaCitaAdminState {
  const ctx = useContext(NuevaCitaAdminCtx);
  if (!ctx) throw new Error('useNuevaCitaAdmin requiere NuevaCitaAdminProvider');
  return ctx;
}

interface ProviderProps {
  readonly children: ReactNode;
}

export function NuevaCitaAdminProvider({ children }: ProviderProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [fechaInicial, setFechaInicial] = useState<string | null>(null);

  const open = useCallback((fechaISO?: string) => {
    setFechaInicial(fechaISO ?? null);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setFechaInicial(null);
  }, []);

  return (
    <NuevaCitaAdminCtx.Provider value={{ isOpen, fechaInicial, open, close }}>
      {children}
    </NuevaCitaAdminCtx.Provider>
  );
}
