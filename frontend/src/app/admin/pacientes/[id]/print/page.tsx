import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { formatEurosDesdeCentimos, lineaTarifaCitaFicha } from '@/components/admin/ficha/ficha-cita-pago';
import FichaPrintToolbar from '@/components/admin/ficha/FichaPrintToolbar';
import {
  CLINIC_ADDRESS,
  CLINIC_CONTACT_EMAIL,
  CLINIC_PROFESSIONAL_LICENSE,
  CLINIC_PUBLIC_PHONE_DISPLAY,
  CLINIC_PUBLIC_SITE_HOST_LABEL,
  CLINIC_PUBLIC_SITE_URL,
} from '@/lib/clinic';
import { createServerClient } from '@/lib/supabase/server';
import type { FichaSensiblesBulk } from '@/services/admin/ficha-actions';
import type { Profile } from '@/lib/supabase/types';

export const metadata = {
  title: `Imprimir ficha | ${CLINIC_PUBLIC_SITE_HOST_LABEL}`,
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const CLINIC_NAME = 'Clínica Almudena Marchesi';

interface CitaRow {
  id: string;
  inicio: string;
  estado: string;
  servicio_nombre: string;
  precio_centimos: number;
  duracion_minutos: number;
}

export default async function FichaPacientePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<JSX.Element> {
  const { id } = await params;
  const supabase = createServerClient();

  const { data: paciente, error: pErr } = await supabase
    .from('pacientes')
    .select(
      'id, user_id, fecha_nacimiento, fecha_alta, tags, activo, consentimiento_rgpd'
    )
    .eq('id', id)
    .maybeSingle<{
      id: string;
      user_id: string | null;
      fecha_nacimiento: string | null;
      fecha_alta: string;
      tags: readonly string[];
      activo: boolean;
      consentimiento_rgpd: boolean;
    }>();

  if (pErr || !paciente) notFound();

  const [{ data: sensiblesData }, { data: citasRaw }, dxMedRpc] = await Promise.all([
    (supabase.rpc as unknown as (
      fn: 'paciente_ficha_sensibles_bulk',
      args: { p_id: string; p_justificacion: string | null }
    ) => Promise<{ data: FichaSensiblesBulk | null; error: { message: string } | null }>)(
      'paciente_ficha_sensibles_bulk',
      { p_id: paciente.id, p_justificacion: 'export_pdf_ficha_admin' }
    ),
    supabase
      .from('v_citas_expandidas')
      .select('id, inicio, estado, servicio_nombre, precio_centimos, duracion_minutos')
      .eq('paciente_id', id)
      .neq('estado', 'bloqueo_temporal')
      .order('inicio', { ascending: false })
      .limit(12),
    (supabase.rpc as unknown as (
      fn: 'paciente_dx_med_bulk_descifrar',
      args: { p_paciente_id: string }
    ) => Promise<{
      data: {
        diagnosticos: readonly {
          id: string;
          titulo: string | null;
          activo: boolean;
          estado: string | null;
        }[];
        medicacion: readonly {
          id: string;
          nombre: string;
          activo: boolean;
          dosis: string | null;
        }[];
      } | null;
      error: { message: string } | null;
    }>)('paciente_dx_med_bulk_descifrar', { p_paciente_id: paciente.id }),
  ]);

  const sensibles = sensiblesData ?? null;
  const citas = ((citasRaw as CitaRow[] | null) ?? []).filter(Boolean);
  const dxBulk = dxMedRpc.data;
  const diagnosticos = (dxBulk?.diagnosticos ?? []).filter((d) => d.activo);
  const medicacion = (dxBulk?.medicacion ?? []).filter((m) => m.activo);

  type ProfileLite = Pick<Profile, 'display_name' | 'email'>;
  let profile: ProfileLite | null = null;
  if (paciente.user_id) {
    const { data } = await supabase
      .from('profiles')
      .select('display_name, email')
      .eq('id', paciente.user_id)
      .maybeSingle();
    profile = (data as unknown as ProfileLite | null) ?? null;
  }

  const nombreCompleto =
    sensibles?.nombre_completo?.trim() || profile?.display_name || 'Paciente';
  const generado = format(new Date(), "d MMM yyyy · HH:mm", { locale: es });

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
@media print {
  .portal-sidebar, .portal-topbar, .portal-grain { display: none !important; }
  main#main { margin-left: 0 !important; padding-top: 0.25in !important; padding-bottom: 0.25in !important; }
  .ficha-print-root { background: white !important; color: #1a1a1a !important; }
  .ficha-print-root * { box-shadow: none !important; }
}
`,
        }}
      />
      <div className="ficha-print-root max-w-3xl text-ink dark:text-white">
        <FichaPrintToolbar />

        <header className="border-b border-ink/15 pb-5 dark:border-white/20">
          <p className="font-display text-[1.35rem] italic tracking-tight text-primary dark:text-primary-fixed-dim">
            {CLINIC_NAME}
          </p>
          <p className="mt-1 font-body text-[0.78rem] text-ink-soft dark:text-white/70">
            Psicología clínica · Colegiación oficial {CLINIC_PROFESSIONAL_LICENSE}
          </p>
          <p className="mt-2 font-body text-[0.72rem] leading-relaxed text-ink-muted dark:text-white/65">
            {CLINIC_ADDRESS}
            <br />
            Tel. {CLINIC_PUBLIC_PHONE_DISPLAY} · {CLINIC_CONTACT_EMAIL}
          </p>
          <h1 className="mt-6 font-display text-[1.5rem] italic tracking-[-0.02em] text-ink dark:text-white">
            Ficha clínica — resumen
          </h1>
          <p className="mt-1 font-body text-[0.8rem] text-ink-muted dark:text-white/60">
            Paciente: <strong className="text-ink dark:text-white">{nombreCompleto}</strong>
            {' · '}
            ID interno {paciente.id.slice(0, 8)}…
          </p>
          <p className="mt-1 font-body text-[0.72rem] text-ink-muted dark:text-white/55">
            Generado: {generado} · Documento confidencial (RGPD)
          </p>
        </header>

        <section className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <h2 className="font-body text-[0.62rem] uppercase tracking-[0.18em] text-ink-muted dark:text-white/55">
              Identificación
            </h2>
            <dl className="mt-2 space-y-1.5 font-body text-[0.82rem]">
              <div>
                <dt className="text-ink-muted dark:text-white/50">DNI / NIE</dt>
                <dd>{sensibles?.dni_nie?.trim() || '—'}</dd>
              </div>
              <div>
                <dt className="text-ink-muted dark:text-white/50">Teléfono</dt>
                <dd>{sensibles?.telefono?.trim() || '—'}</dd>
              </div>
              <div>
                <dt className="text-ink-muted dark:text-white/50">Email (ficha)</dt>
                <dd>{sensibles?.email?.trim() || profile?.email || '—'}</dd>
              </div>
              <div>
                <dt className="text-ink-muted dark:text-white/50">Domicilio</dt>
                <dd className="whitespace-pre-wrap">{sensibles?.direccion?.trim() || '—'}</dd>
              </div>
            </dl>
          </div>
          <div>
            <h2 className="font-body text-[0.62rem] uppercase tracking-[0.18em] text-ink-muted dark:text-white/55">
              Contexto
            </h2>
            <dl className="mt-2 space-y-1.5 font-body text-[0.82rem]">
              <div>
                <dt className="text-ink-muted dark:text-white/50">Fecha de nacimiento</dt>
                <dd>
                  {paciente.fecha_nacimiento
                    ? format(new Date(paciente.fecha_nacimiento), 'd MMM yyyy', { locale: es })
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-ink-muted dark:text-white/50">Alta en consulta</dt>
                <dd>{format(new Date(paciente.fecha_alta), "d MMM yyyy", { locale: es })}</dd>
              </div>
              <div>
                <dt className="text-ink-muted dark:text-white/50">Estado</dt>
                <dd>{paciente.activo ? 'Activo' : 'Baja'}</dd>
              </div>
              <div>
                <dt className="text-ink-muted dark:text-white/50">RGPD firmado</dt>
                <dd>{paciente.consentimiento_rgpd ? 'Sí' : 'Pendiente'}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="mt-6">
          <h2 className="font-body text-[0.62rem] uppercase tracking-[0.18em] text-ink-muted dark:text-white/55">
            Contacto de emergencia
          </h2>
          <p className="mt-2 font-body text-[0.82rem]">
            {sensibles?.contacto_emergencia_nombre?.trim() || '—'}
            {sensibles?.contacto_emergencia_telefono
              ? ` · ${sensibles.contacto_emergencia_telefono.trim()}`
              : ''}
          </p>
        </section>

        <section className="mt-6">
          <h2 className="font-body text-[0.62rem] uppercase tracking-[0.18em] text-ink-muted dark:text-white/55">
            Alergias / medicación base (ficha)
          </h2>
          <p className="mt-2 whitespace-pre-wrap font-body text-[0.82rem]">
            <strong>Alergias:</strong> {sensibles?.alergias?.trim() || '—'}
          </p>
          <p className="mt-2 whitespace-pre-wrap font-body text-[0.82rem]">
            <strong>Medicación base:</strong> {sensibles?.medicacion_base?.trim() || '—'}
          </p>
        </section>

        <section className="mt-6">
          <h2 className="font-body text-[0.62rem] uppercase tracking-[0.18em] text-ink-muted dark:text-white/55">
            Diagnósticos activos
          </h2>
          {diagnosticos.length === 0 ? (
            <p className="mt-2 font-body text-[0.82rem]">—</p>
          ) : (
            <ul className="mt-2 list-disc space-y-1 pl-5 font-body text-[0.82rem]">
              {diagnosticos.map((d) => (
                <li key={d.id}>{d.titulo?.trim() || 'Sin título'}</li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-6">
          <h2 className="font-body text-[0.62rem] uppercase tracking-[0.18em] text-ink-muted dark:text-white/55">
            Medicación activa
          </h2>
          {medicacion.length === 0 ? (
            <p className="mt-2 font-body text-[0.82rem]">—</p>
          ) : (
            <ul className="mt-2 list-disc space-y-1 pl-5 font-body text-[0.82rem]">
              {medicacion.map((m) => (
                <li key={m.id}>
                  {m.nombre}
                  {m.dosis ? ` · ${m.dosis}` : ''}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-6 break-inside-avoid">
          <h2 className="font-body text-[0.62rem] uppercase tracking-[0.18em] text-ink-muted dark:text-white/55">
            Últimas citas
          </h2>
          <p className="mt-1 font-body text-[0.7rem] leading-relaxed text-ink-muted dark:text-white/55">
            «Tarifa ref.» = precio del servicio en catálogo; el importe cobrado puede depender de bono, pago
            en portal o criterio de consulta.
          </p>
          {citas.length === 0 ? (
            <p className="mt-2 font-body text-[0.82rem]">—</p>
          ) : (
            <table className="mt-3 w-full border-collapse font-body text-[0.76rem]">
              <thead>
                <tr className="border-b border-ink/15 text-left dark:border-white/20">
                  <th className="py-1.5 pr-2 font-medium">Fecha</th>
                  <th className="py-1.5 pr-2 font-medium">Servicio</th>
                  <th className="py-1.5 pr-2 font-medium">Estado</th>
                  <th className="py-1.5 pr-2 text-right font-medium">Tarifa ref.</th>
                </tr>
              </thead>
              <tbody>
                {citas.map((c) => (
                  <tr key={c.id} className="border-b border-ink/8 align-top dark:border-white/10">
                    <td className="py-1.5 pr-2 tabular-nums">
                      {format(new Date(c.inicio), "d MMM yyyy · HH:mm", { locale: es })}
                      <div className="mt-0.5 text-[0.68rem] text-ink-muted dark:text-white/50">
                        {c.duracion_minutos} min
                      </div>
                    </td>
                    <td className="py-1.5 pr-2">{c.servicio_nombre}</td>
                    <td className="py-1.5 pr-2">
                      <span className="block">{c.estado}</span>
                      <span className="mt-0.5 block text-[0.65rem] text-ink-muted leading-snug dark:text-white/50">
                        {lineaTarifaCitaFicha(c.estado, c.precio_centimos)}
                      </span>
                    </td>
                    <td className="py-1.5 text-right tabular-nums">
                      {formatEurosDesdeCentimos(c.precio_centimos)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {paciente.tags.length > 0 ? (
          <section className="mt-6">
            <h2 className="font-body text-[0.62rem] uppercase tracking-[0.18em] text-ink-muted dark:text-white/55">
              Etiquetas
            </h2>
            <p className="mt-2 font-body text-[0.82rem]">{paciente.tags.join(', ')}</p>
          </section>
        ) : null}

        <footer className="mt-10 border-t border-ink/15 pt-4 font-body text-[0.68rem] text-ink-muted dark:border-white/20 dark:text-white/50">
          {CLINIC_NAME} · Colegiación {CLINIC_PROFESSIONAL_LICENSE} · {CLINIC_PUBLIC_SITE_URL}
        </footer>
      </div>
    </>
  );
}
