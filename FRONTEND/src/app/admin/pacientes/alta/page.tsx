import Link from 'next/link';

import { Button, PageHeader, SurfaceCard } from '@/components/portal-shell/ui';

export const metadata = { title: 'Alta manual de paciente | Panel Almudena' };

/**
 * Alta manual — placeholder consciente del estado del cifrado.
 *
 * El schema `public.pacientes` requiere dni_nie_ciphertext y
 * nombre_completo_ciphertext NOT NULL. El cifrado se realiza con la
 * clave maestra KEK almacenada en Supabase Vault + KMS, operada por la
 * Edge Function `encrypt-pii` (diferida a F5 — ver plan original).
 *
 * Hasta entonces, el alta de pacientes se realiza exclusivamente vía
 * flujo de registro (`/registro`) que sí tiene integrado el cifrado.
 */
export default function AltaManualPage(): JSX.Element {
  return (
    <>
      <PageHeader
        eyebrow="Pacientes"
        title="Alta manual"
        description="Registro directo de pacientes sin autoservicio (llegadas por teléfono, referidos)."
        actions={
          <Link href="/admin/pacientes">
            <Button variant="ghost" icon="arrow_back">Volver al listado</Button>
          </Link>
        }
      />

      <SurfaceCard className="max-w-3xl">
        <div className="flex items-start gap-4">
          <span
            className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-full bg-[#c89b5a]/15 text-[#8a6530] ring-1 ring-[#c89b5a]/25 dark:bg-[#c89b5a]/25 dark:text-[#e9c88a]"
            aria-hidden="true"
          >
            <span className="material-symbols-outlined text-[1.4rem]">engineering</span>
          </span>
          <div>
            <h2 className="font-display text-[1.4rem] italic text-ink tracking-[-0.01em] dark:text-white">
              En preparación
            </h2>
            <p className="mt-3 font-body text-[0.92rem] leading-[1.65] text-ink-soft dark:text-white/70">
              El alta manual requiere cifrado columnar AES-256-GCM del DNI y el nombre completo
              (<code className="font-mono text-[0.84rem] bg-ink/5 px-1 py-0.5 rounded dark:bg-white/10">dni_nie_ciphertext</code>,
              {' '}
              <code className="font-mono text-[0.84rem] bg-ink/5 px-1 py-0.5 rounded dark:bg-white/10">nombre_completo_ciphertext</code>).
              Este servicio se expone desde la Edge Function
              {' '}
              <code className="font-mono text-[0.84rem] bg-ink/5 px-1 py-0.5 rounded dark:bg-white/10">encrypt-pii</code>
              {' '}
              (fase <strong>F5</strong>) con la clave maestra en Supabase Vault + KMS.
            </p>
            <p className="mt-4 font-body text-[0.92rem] leading-[1.65] text-ink-soft dark:text-white/70">
              <strong className="text-ink dark:text-white">Alternativa inmediata:</strong> comparte el
              enlace de registro con el paciente y tras firmar el RGPD podrás abrir su ficha, ajustar
              tags y añadir notas clínicas en segundos.
            </p>
            <div className="mt-6 flex gap-3">
              <Link href="/registro">
                <Button variant="primary" icon="link">Enlace de registro</Button>
              </Link>
              <Link href="/admin/pacientes">
                <Button variant="ghost" icon="arrow_back">Volver</Button>
              </Link>
            </div>
          </div>
        </div>
      </SurfaceCard>
    </>
  );
}
