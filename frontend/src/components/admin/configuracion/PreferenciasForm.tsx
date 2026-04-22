'use client';

/**
 * PreferenciasForm — toggles de notificaciones + privacidad + sonido.
 * Cada cambio llama a `actualizarPreferenciasAction` (patch parcial).
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import {
  actualizarPreferenciasAction,
  type PreferenciasPatch,
} from '@/services/admin/cuenta-actions';
import type { NotificacionesPrefs } from '@/lib/supabase/types';

type Role = 'admin' | 'paciente';

interface Props {
  readonly prefs: NotificacionesPrefs;
  /**
   * Rol del usuario actual. Define qué toggles son visibles:
   *   - paciente (default): toggles orientados al paciente (bienvenida,
   *     recordatorio 24h, recursos asignados, privacidad, marketing).
   *   - admin: toggles operativos (reserva recibida, cancelación, recordatorio
   *     de agenda, privacidad, notificaciones desktop).
   */
  readonly role?: Role;
}

interface ToggleDef {
  readonly key: keyof PreferenciasPatch;
  readonly label: string;
  readonly description: string;
  /** Roles en los que aparece este toggle. Default: ambos. */
  readonly roles?: readonly Role[];
}

const EMAIL_TOGGLES: readonly ToggleDef[] = [
  {
    key: 'welcome',
    label: 'Email de bienvenida',
    description: 'Confirmación al crear la cuenta.',
    roles: ['paciente'],
  },
  {
    key: 'booking_confirmed',
    label: 'Reserva confirmada',
    description: 'Recibes copia cuando se agenda una sesión.',
  },
  {
    key: 'booking_cancelled',
    label: 'Reserva cancelada',
    description: 'Aviso si una sesión queda cancelada.',
  },
  {
    key: 'reminder_24h',
    label: 'Recordatorio 24h',
    description: 'Resumen de la agenda el día previo.',
  },
  {
    key: 'nueva_asignacion',
    label: 'Nuevo recurso asignado',
    description: 'Cuando Almudena te comparte una tarea o lectura.',
    roles: ['paciente'],
  },
  {
    key: 'marketing',
    label: 'Novedades y talleres',
    description: 'Comunicaciones esporádicas sobre grupos y contenidos.',
    roles: ['paciente'],
  },
];

const UI_TOGGLES: readonly ToggleDef[] = [
  {
    key: 'privacy_mode_default',
    label: 'Modo privacidad por defecto',
    description: 'Oculta automáticamente datos sensibles al abrir fichas y cards.',
  },
  {
    key: 'sound',
    label: 'Sonido en chat',
    description: 'Reproducir un tono al recibir mensajes nuevos.',
  },
  {
    key: 'desktop_notifications',
    label: 'Notificaciones del navegador',
    description: 'Muestra avisos del sistema cuando la app está en segundo plano.',
  },
  {
    key: 'chat_nuevo_mensaje',
    label: 'Email al recibir mensaje',
    description: 'Copia por email si hay mensajes sin leer >15 min.',
  },
];

export default function PreferenciasForm({
  prefs,
  role = 'paciente',
}: Props): JSX.Element {
  const router = useRouter();
  const [local, setLocal] = useState<NotificacionesPrefs>(prefs);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const toggle = (key: keyof PreferenciasPatch, current: boolean): void => {
    const next = !current;
    setLocal((prev) => ({ ...prev, [key]: next } as NotificacionesPrefs));
    setSavingKey(String(key));
    setError(null);

    startTransition(async () => {
      const res = await actualizarPreferenciasAction({ [key]: next });
      setSavingKey(null);
      if (!res.ok) {
        setLocal((prev) => ({ ...prev, [key]: current } as NotificacionesPrefs));
        setError(res.message ?? 'No se pudo guardar.');
        return;
      }
      router.refresh();
    });
  };

  const emailToggles = EMAIL_TOGGLES.filter(
    (t) => !t.roles || t.roles.includes(role)
  );
  const uiToggles = UI_TOGGLES.filter(
    (t) => !t.roles || t.roles.includes(role)
  );

  return (
    <div className="space-y-6">
      <ToggleGroup
        title={role === 'admin' ? 'Avisos operativos por email' : 'Notificaciones por email'}
        toggles={emailToggles}
        prefs={local}
        savingKey={savingKey}
        onToggle={toggle}
      />
      <ToggleGroup
        title="Experiencia en la app"
        toggles={uiToggles}
        prefs={local}
        savingKey={savingKey}
        onToggle={toggle}
      />
      {error ? (
        <p role="alert" className="font-body text-[0.8rem] text-red-600 dark:text-red-400">
          Error: {error}
        </p>
      ) : null}
    </div>
  );
}

interface GroupProps {
  readonly title: string;
  readonly toggles: readonly ToggleDef[];
  readonly prefs: NotificacionesPrefs;
  readonly savingKey: string | null;
  readonly onToggle: (key: keyof PreferenciasPatch, current: boolean) => void;
}

function ToggleGroup({
  title,
  toggles,
  prefs,
  savingKey,
  onToggle,
}: GroupProps): JSX.Element {
  return (
    <div>
      <h3 className="mb-3 font-display text-[0.95rem] italic text-ink dark:text-white">
        {title}
      </h3>
      <ul className="divide-y divide-ink/5 dark:divide-white/5">
        {toggles.map((t) => {
          const value = Boolean((prefs as unknown as Record<string, boolean>)[t.key]);
          const isSaving = savingKey === String(t.key);
          return (
            <li key={String(t.key)} className="flex items-start justify-between gap-4 py-3">
              <div>
                <p className="font-body text-[0.88rem] text-ink dark:text-white">
                  {t.label}
                </p>
                <p className="font-body text-[0.72rem] text-ink-muted dark:text-white/55">
                  {t.description}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={value}
                aria-busy={isSaving}
                onClick={() => onToggle(t.key, value)}
                className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${
                  value
                    ? 'bg-primary'
                    : 'bg-ink/15 dark:bg-white/15'
                } ${isSaving ? 'opacity-60' : ''}`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition ${
                    value ? 'left-[1.35rem]' : 'left-0.5'
                  }`}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
