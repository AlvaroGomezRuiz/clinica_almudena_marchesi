'use client';

/**
 * NuevaCitaAdminWrapper — Client boundary que envuelve el panel admin
 * con el contexto del modal de nueva cita + el modal en sí.
 *
 * Se renderiza en admin/layout.tsx (RSC) como wrapper client-leaf.
 */

import type { ReactNode } from 'react';
import { NuevaCitaAdminProvider } from '@/components/admin/NuevaCitaAdminContext';
import NuevaCitaAdminModal from '@/components/admin/agenda/NuevaCitaAdminModal';

interface Props {
  readonly children: ReactNode;
}

export default function NuevaCitaAdminWrapper({ children }: Props): JSX.Element {
  return (
    <NuevaCitaAdminProvider>
      {children}
      <NuevaCitaAdminModal />
    </NuevaCitaAdminProvider>
  );
}
