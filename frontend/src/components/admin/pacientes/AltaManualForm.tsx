'use client';

/**
 * AltaManualForm — formulario admin de alta de paciente con cifrado F5.
 *
 * Flujo:
 *   1. Admin rellena PII (nombre, DNI, contacto).
 *   2. Consentimiento RGPD obligatorio (checkbox duro).
 *   3. Submit → `altaManualPacienteAction` → RPC `paciente_alta_cifrada` que:
 *      - Verifica is_admin() (code 42501 si no).
 *      - Cifra AES-256 cada campo sensible + genera blind indexes HMAC-SHA256.
 *      - Inserta fila en `pacientes` (sin plaintext).
 *   4. Redirect a la ficha del paciente recién creado.
 *
 * Seguridad:
 *   - Autocomplete="off" en todos los campos sensibles (no queda en el gestor
 *     de contraseñas del navegador).
 *   - Nombre/DNI se normalizan (trim, uppercase DNI) antes de enviar.
 *   - Feedback de error lo más genérico posible (no expone ciphertext).
 */

import { useRouter } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';

import { Button, SurfaceCard } from '@/components/portal-shell/ui';
import { CLINIC_PUBLIC_PHONE_DISPLAY } from '@/lib/clinic';
import { altaManualPacienteAction } from '@/services/admin/pacientes-actions';

interface FormState {
  nombreCompleto: string;
  dniNie: string;
  telefono: string;
  email: string;
  fechaNacimiento: string;
  direccion: string;
  contactoEmergenciaNombre: string;
  contactoEmergenciaTelefono: string;
  motivoConsultaInicial: string;
  experienciaTerapia: string;
  consentimientoRgpd: boolean;
  tagsCsv: string;
}

const INITIAL_STATE: FormState = {
  nombreCompleto: '',
  dniNie: '',
  telefono: '',
  email: '',
  fechaNacimiento: '',
  direccion: '',
  contactoEmergenciaNombre: '',
  contactoEmergenciaTelefono: '',
  motivoConsultaInicial: '',
  experienciaTerapia: '',
  consentimientoRgpd: false,
  tagsCsv: '',
};

export default function AltaManualForm(): JSX.Element {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const update = useCallback(
    <K extends keyof FormState>(k: K, v: FormState[K]): void => {
      setForm((prev) => ({ ...prev, [k]: v }));
    },
    []
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>): void => {
      e.preventDefault();
      setError(null);

      if (!form.consentimientoRgpd) {
        setError('Falta el consentimiento RGPD explícito.');
        return;
      }
      if (!form.nombreCompleto.trim()) {
        setError('El nombre completo es obligatorio.');
        return;
      }
      if (!form.dniNie.trim()) {
        setError('El DNI/NIE es obligatorio.');
        return;
      }

      const tags = form.tagsCsv
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      startTransition(async () => {
        const res = await altaManualPacienteAction({
          nombreCompleto: form.nombreCompleto,
          dniNie: form.dniNie,
          telefono: form.telefono || null,
          email: form.email || null,
          fechaNacimiento: form.fechaNacimiento || null,
          direccion: form.direccion || null,
          contactoEmergenciaNombre: form.contactoEmergenciaNombre || null,
          contactoEmergenciaTelefono: form.contactoEmergenciaTelefono || null,
          motivoConsultaInicial: form.motivoConsultaInicial || null,
          experienciaTerapia: form.experienciaTerapia || null,
          consentimientoRgpd: true,
          tags,
        });
        if (!res.ok) {
          setError(res.message);
          return;
        }
        router.push(`/admin/pacientes/${res.data.id}`);
      });
    },
    [form, router]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-8" autoComplete="off">
      {/* -------- Identidad -------- */}
      <SurfaceCard>
        <header className="mb-5">
          <h3 className="font-display text-[1.15rem] italic text-ink tracking-[-0.01em] dark:text-white">
            Identidad
          </h3>
          <p className="mt-1 font-body text-[0.82rem] text-ink-soft dark:text-white/60">
            Datos cifrados AES-256 en reposo (columna <code className="font-mono text-[0.78rem]">*_ciphertext</code>).
          </p>
        </header>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Nombre completo *"
            value={form.nombreCompleto}
            onChange={(v) => update('nombreCompleto', v)}
            required
            maxLength={200}
          />
          <Field
            label="DNI / NIE *"
            value={form.dniNie}
            onChange={(v) => update('dniNie', v.toUpperCase())}
            required
            maxLength={12}
            placeholder="12345678A"
          />
          <Field
            label="Teléfono"
            type="tel"
            value={form.telefono}
            onChange={(v) => update('telefono', v)}
            maxLength={40}
            placeholder={`Ej. ${CLINIC_PUBLIC_PHONE_DISPLAY}`}
          />
          <Field
            label="Email"
            type="email"
            value={form.email}
            onChange={(v) => update('email', v.toLowerCase())}
            maxLength={200}
          />
          <Field
            label="Fecha de nacimiento"
            type="date"
            value={form.fechaNacimiento}
            onChange={(v) => update('fechaNacimiento', v)}
          />
          <Field
            label="Dirección"
            value={form.direccion}
            onChange={(v) => update('direccion', v)}
            maxLength={300}
          />
        </div>
      </SurfaceCard>

      {/* -------- Contacto de emergencia -------- */}
      <SurfaceCard>
        <header className="mb-5">
          <h3 className="font-display text-[1.15rem] italic text-ink tracking-[-0.01em] dark:text-white">
            Contacto de emergencia
          </h3>
        </header>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Nombre"
            value={form.contactoEmergenciaNombre}
            onChange={(v) => update('contactoEmergenciaNombre', v)}
            maxLength={200}
          />
          <Field
            label="Teléfono"
            type="tel"
            value={form.contactoEmergenciaTelefono}
            onChange={(v) => update('contactoEmergenciaTelefono', v)}
            maxLength={40}
          />
        </div>
      </SurfaceCard>

      {/* -------- Contexto clínico -------- */}
      <SurfaceCard>
        <header className="mb-5">
          <h3 className="font-display text-[1.15rem] italic text-ink tracking-[-0.01em] dark:text-white">
            Contexto inicial
          </h3>
          <p className="mt-1 font-body text-[0.82rem] text-ink-soft dark:text-white/60">
            Opcional. Facilita la primera sesión; todo editable desde la ficha.
          </p>
        </header>
        <div className="space-y-5">
          <Textarea
            label="Motivo de consulta inicial"
            value={form.motivoConsultaInicial}
            onChange={(v) => update('motivoConsultaInicial', v)}
            rows={3}
            maxLength={2000}
          />
          <Field
            label="Experiencia previa con terapia"
            value={form.experienciaTerapia}
            onChange={(v) => update('experienciaTerapia', v)}
            maxLength={500}
          />
          <Field
            label="Etiquetas (separadas por coma)"
            value={form.tagsCsv}
            onChange={(v) => update('tagsCsv', v)}
            placeholder="pareja, ansiedad, derivado Sanitas"
          />
        </div>
      </SurfaceCard>

      {/* -------- Consentimiento RGPD -------- */}
      <SurfaceCard>
        <label className="flex cursor-pointer items-start gap-4">
          <input
            type="checkbox"
            checked={form.consentimientoRgpd}
            onChange={(e) => update('consentimientoRgpd', e.target.checked)}
            className="mt-1 h-5 w-5 rounded border-ink/20 text-primary focus:ring-2 focus:ring-primary/40 dark:border-white/20"
            required
            aria-required="true"
          />
          <span className="font-body text-[0.9rem] leading-relaxed text-ink dark:text-white/90">
            <strong>Consentimiento RGPD explícito</strong>: el paciente ha
            firmado o consentido por vía alternativa el tratamiento de sus
            datos conforme al Reglamento (UE) 2016/679 y la LOPDGDD. El acceso
            a esta ficha quedará registrado en <code className="font-mono text-[0.78rem]">admin_lookups</code>.
          </span>
        </label>
      </SurfaceCard>

      {error ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-300/50 bg-red-50/80 px-5 py-4 text-[0.88rem] text-red-800 dark:border-red-500/30 dark:bg-red-950/30 dark:text-red-300"
        >
          {error}
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-3">
        <Button
          variant="ghost"
          type="button"
          onClick={() => router.push('/admin/pacientes')}
        >
          Cancelar
        </Button>
        <Button
          variant="primary"
          type="submit"
          icon="person_add"
          disabled={isPending || !form.consentimientoRgpd}
        >
          {isPending ? 'Creando…' : 'Crear paciente'}
        </Button>
      </div>
    </form>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Subcomponentes internos
// ───────────────────────────────────────────────────────────────────────────
interface FieldProps {
  readonly label: string;
  readonly value: string;
  readonly onChange: (v: string) => void;
  readonly type?: 'text' | 'email' | 'tel' | 'date';
  readonly required?: boolean;
  readonly maxLength?: number;
  readonly placeholder?: string;
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  maxLength,
  placeholder,
}: FieldProps): JSX.Element {
  return (
    <label className="block">
      <span className="mb-1.5 block font-body text-[0.72rem] uppercase tracking-[0.15em] text-ink-muted dark:text-white/55">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        maxLength={maxLength}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-xl border border-ink/10 bg-white/80 px-4 py-2.5 font-body text-[0.92rem] text-ink placeholder:text-ink-muted/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-white/40"
      />
    </label>
  );
}

interface TextareaProps {
  readonly label: string;
  readonly value: string;
  readonly onChange: (v: string) => void;
  readonly rows?: number;
  readonly maxLength?: number;
}

function Textarea({
  label,
  value,
  onChange,
  rows = 3,
  maxLength,
}: TextareaProps): JSX.Element {
  return (
    <label className="block">
      <span className="mb-1.5 block font-body text-[0.72rem] uppercase tracking-[0.15em] text-ink-muted dark:text-white/55">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        maxLength={maxLength}
        autoComplete="off"
        className="w-full resize-y rounded-xl border border-ink/10 bg-white/80 px-4 py-2.5 font-body text-[0.92rem] text-ink placeholder:text-ink-muted/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-white/40"
      />
    </label>
  );
}
