/**
 * Visor embebido para binarios firmados (URL temporal Supabase Storage).
 * Usado en páginas servidor tras createSignedUrl; no exponer la URL en logs.
 */

interface RecursoEmbeddedViewerProps {
  readonly titulo: string;
  readonly tipo: string;
  readonly signedUrl: string;
}

export default function RecursoEmbeddedViewer({
  titulo,
  tipo,
  signedUrl,
}: RecursoEmbeddedViewerProps): JSX.Element {
  if (tipo === 'imagen') {
    return (
      <figure className="mx-auto max-w-5xl">
        {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada efímera; sin dominio fijo para next/image */}
        <img
          src={signedUrl}
          alt={titulo}
          className="max-h-[min(85vh,920px)] w-auto max-w-full rounded-2xl object-contain shadow-[0_12px_40px_-20px_rgba(0,0,0,0.35)] ring-1 ring-ink/10 dark:ring-white/10"
        />
      </figure>
    );
  }

  if (tipo === 'pdf') {
    return (
      <iframe
        title={titulo}
        src={signedUrl}
        className="min-h-[min(82vh,880px)] w-full rounded-2xl border border-ink/10 bg-white dark:border-white/10 dark:bg-ink/40"
      />
    );
  }

  if (tipo === 'audio') {
    return (
      <div className="mx-auto max-w-xl rounded-2xl bg-white/80 p-6 ring-1 ring-inset ring-ink/8 dark:bg-white/5 dark:ring-white/10">
        <p className="mb-4 font-display text-[1.1rem] italic text-ink dark:text-white">{titulo}</p>
        <audio controls className="w-full" src={signedUrl} preload="metadata" />
      </div>
    );
  }

  if (tipo === 'video') {
    return (
      <video
        controls
        className="mx-auto max-h-[min(85vh,920px)] w-full max-w-4xl rounded-2xl bg-black object-contain shadow-lg ring-1 ring-ink/10 dark:ring-white/10"
        src={signedUrl}
        preload="metadata"
      />
    );
  }

  return (
    <div className="mx-auto max-w-lg rounded-2xl bg-white/70 p-6 text-center ring-1 ring-inset ring-ink/8 dark:bg-white/5 dark:ring-white/10">
      <p className="font-body text-[0.9rem] text-ink-soft dark:text-white/70">
        Este tipo de archivo se abre mejor descargándolo o en una app externa.
      </p>
      <a
        href={signedUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 font-body text-[0.85rem] text-on-primary transition hover:bg-primary-dim"
      >
        Abrir en pestaña nueva
      </a>
    </div>
  );
}
