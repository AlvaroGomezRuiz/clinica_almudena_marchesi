'use client';

/**
 * PreferenciasForm — toggles de notificaciones + privacidad + sonido.
 * Agrupados por categorías. Cada cambio llama a `actualizarPreferenciasAction` (patch parcial).
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
   * Rol del usuario actual. Define qué toggles son visibles.
   */
  readonly role?: Role;
}

interface ToggleDef {
  readonly key: keyof PreferenciasPatch;
  readonly label: string;
  readonly description: string;
  readonly roles?: readonly Role[];
}

interface CategoryDef {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly toggles: readonly ToggleDef[];
}

const CATEGORIES: readonly CategoryDef[] = [
  {
    id: 'citas',
    title: 'Citas y Sesiones',
    description: 'Gestión de tus reservas y recordatorios automáticos.',
    toggles: [
      {
        key: 'booking_confirmed',
        label: 'Reserva confirmada',
        description: 'Recibirás un email con los detalles cada vez que se agende una sesión.',
      },
      {
        key: 'booking_cancelled',
        label: 'Reserva cancelada',
        description: 'Aviso en caso de que una sesión quede anulada.',
      },
      {
        key: 'reminder_48h',
        label: 'Recordatorio ~48h',
        description: 'Recibe un aviso 48h antes de la sesión para poder cancelar sin penalización.',
      },
      {
        key: 'reminder_24h',
        label: 'Recordatorio ~24h',
        description: 'Recordatorio final un día antes de la sesión.',
      },
    ],
  },
  {
    id: 'mensajes',
    title: 'Mensajes y Recursos',
    description: 'Avisos sobre el chat y material compartido por Almudena.',
    toggles: [
      {
        key: 'nueva_asignacion',
        label: 'Nuevos recursos o tareas',
        description: 'Aviso cuando tengas disponible nuevo material de trabajo.',
        roles: ['paciente'],
      },
      {
        key: 'chat_nuevo_mensaje',
        label: 'Email por mensajes no leídos',
        description: 'Recibirás un correo si tienes mensajes en el chat sin leer tras 15 minutos.',
      },
      {
        key: 'sound',
        label: 'Sonido en el chat',
        description: 'Reproducir un tono suave al recibir un nuevo mensaje.',
      },
    ],
  },
  {
    id: 'sistema',
    title: 'Privacidad y Cuenta',
    description: 'Ajustes sobre el funcionamiento de la plataforma y novedades.',
    toggles: [
      {
        key: 'privacy_mode_default',
        label: 'Modo privacidad por defecto',
        description: 'Oculta automáticamente los datos sensibles (como DNI o email) en pantalla.',
      },
      {
        key: 'desktop_notifications',
        label: 'Notificaciones del navegador',
        description: 'Avisos nativos cuando la aplicación está en segundo plano.',
      },
      {
        key: 'welcome',
        label: 'Emails de bienvenida',
        description: 'Comunicaciones iniciales tras registrar tu cuenta.',
        roles: ['paciente'],
      },
      {
        key: 'marketing',
        label: 'Novedades y talleres',
        description: 'Correos esporádicos sobre nuevas terapias de grupo y eventos.',
        roles: ['paciente'],
      },
    ],
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

  return (
    <div className="space-y-8">
      {CATEGORIES.map((cat) => {
        const visibleToggles = cat.toggles.filter(
          (t) => !t.roles || t.roles.includes(role)
        );

        if (visibleToggles.length === 0) return null;

        return (
          <ToggleGroup
            key={cat.id}
            title={cat.title}
            description={cat.description}
            toggles={visibleToggles}
            prefs={local}
            savingKey={savingKey}
            onToggle={toggle}
          />
        );
      })}

      {error ? (
        <p role="alert" className="font-body text-[0.85rem] text-red-600 dark:text-red-400 mt-4">
          Error: {error}
        </p>
      ) : null}
    </div>
  );
}

interface GroupProps {
  readonly title: string;
  readonly description?: string;
  readonly toggles: readonly ToggleDef[];
  readonly prefs: NotificacionesPrefs;
  readonly savingKey: string | null;
  readonly onToggle: (key: keyof PreferenciasPatch, current: boolean) => void;
}

function ToggleGroup({
  title,
  description,
  toggles,
  prefs,
  savingKey,
  onToggle,
}: GroupProps): JSX.Element {
  return (
    <div>
      <div className="mb-4">
        <h3 className="font-display text-[1.15rem] italic text-ink dark:text-white">
          {title}
        </h3>
        {description ? (
          <p className="mt-1 font-body text-[0.85rem] text-ink-soft dark:text-white/60">
            {description}
          </p>
        ) : null}
      </div>
      <ul className="divide-y divide-ink/5 dark:divide-white/5 border-t border-b border-ink/5 dark:border-white/5">
        {toggles.map((t) => {
          const value = Boolean((prefs as unknown as Record<string, boolean>)[t.key]);
          const isSaving = savingKey === String(t.key);
          return (
            <li key={String(t.key)} className="flex items-center justify-between gap-4 py-4">
              <div className="pr-4">
                <p className="font-body text-[0.9rem] font-medium text-ink dark:text-white/90">
                  {t.label}
                </p>
                <p className="mt-0.5 font-body text-[0.8rem] leading-relaxed text-ink-soft dark:text-white/60">
                  {t.description}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={value}
                aria-busy={isSaving}
                onClick={() => onToggle(t.key, value)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-ink-900 ${
                  value
                    ? 'bg-primary'
                    : 'bg-ink/20 dark:bg-white/20'
                } ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                    value ? 'translate-x-[1.35rem]' : 'translate-x-0.5'
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
