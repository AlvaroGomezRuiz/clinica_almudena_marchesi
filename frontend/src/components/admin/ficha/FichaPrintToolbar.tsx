'use client';

/**
 * Barra solo pantalla: al imprimir se oculta vía `print:hidden`.
 */

import { Button } from '@/components/portal-shell/ui';

export default function FichaPrintToolbar(): JSX.Element {
  return (
    <div className="ficha-print-toolbar print:hidden mb-6 flex flex-col gap-3 rounded-2xl bg-white/90 p-4 ring-1 ring-inset ring-ink/10 sm:flex-row sm:items-center sm:justify-between dark:bg-white/[0.08] dark:ring-white/12">
      <p className="font-body text-[0.82rem] text-ink-soft dark:text-white/70">
        Vista lista para imprimir o guardar como PDF desde el navegador (Ctrl+P / “Guardar como PDF”).
      </p>
      <Button type="button" variant="primary" icon="picture_as_pdf" onClick={() => window.print()}>
        Imprimir / PDF
      </Button>
    </div>
  );
}
