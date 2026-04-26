/**
 * Contratos compartidos entre AdminShell y PortalShell.
 */
import type { ReactNode } from 'react';

export type ShellTone = 'admin' | 'patient';

export interface NavItem {
  readonly label: string;
  readonly href: string;
  readonly icon: string; // material-symbols-outlined glyph name
  readonly badge?: number;
  readonly exact?: boolean; // si true, match exacto; default prefix
}

export interface ShellUser {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly avatarUrl: string | null;
  readonly role: 'admin' | 'paciente';
}

export interface ShellProps {
  readonly user: ShellUser;
  readonly tone: ShellTone;
  readonly brandTitle: string;
  readonly brandSubtitle: string;
  readonly navItems: readonly NavItem[];
  /** Total mensajes no leídos (paciente: su conversación; admin: suma conversaciones). */
  readonly mensajesUnread?: number;
  readonly footerSlot?: ReactNode;
  readonly children: ReactNode;
}
