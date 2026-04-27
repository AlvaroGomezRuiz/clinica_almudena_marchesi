'use client';

/**
 * Lista de adjuntos de ficha + subida para administradores.
 */

import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useCallback, useRef, useState } from 'react';

import { Button } from '@/components/portal-shell/ui';

export interface PacienteAdjuntoItem {
  readonly id: string;
  readonly nombre: string;
  readonly created_at: string;
  readonly mime: string | null;
  readonly size_bytes: number | null;
}

interface Props {
  readonly pacienteId: string;
  readonly adjuntos: readonly PacienteAdjuntoItem[];
}

function formatSize(bytes: number | null): string {
  if (bytes === null || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function mensajeErrorSubida(code: string): string {
  switch (code) {
    case 'file_demasiado_grande':
      return 'El archivo supera el límite de 50 MB.';
    case 'mime_no_soportado':
      return 'Tipo de archivo no permitido (usa PDF, imágenes u Office).';
    case 'file_signature_mismatch':
      return 'El contenido no coincide con el tipo de archivo indicado.';
    case 'ooxml_invalido':
    case 'ole_invalido':
      return 'El archivo no parece un documento Office válido.';
    case 'tamano_inconsistente':
      return 'No se pudo leer el archivo completo.';
    default:
      return code;
  }
}

export default function PacienteAdjuntosCard({
  pacienteId,
  adjuntos,
}: Props): JSX.Element {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File): Promise<void> => {
      setPending(true);
      setError(null);
      const fd = new FormData();
      fd.set('file', file);
      try {
        const res = await fetch(`/api/admin/pacientes/${pacienteId}/adjuntos`, {
          method: 'POST',
          body: fd,
          credentials: 'same-origin',
        });
        const payload: unknown = await res.json().catch(() => null);
        if (!res.ok) {
          const code =
            payload !== null &&
            typeof payload === 'object' &&
            'error' in payload &&
            typeof (payload as { error: unknown }).error === 'string'
              ? (payload as { error: string }).error
              : 'subida_fallida';
          setError(mensajeErrorSubida(code));
          return;
        }
        router.refresh();
      } finally {
        setPending(false);
        if (inputRef.current) inputRef.current.value = '';
      }
    },
    [pacienteId, router]
  );

  const onChangeInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const f = e.target.files?.[0];
      if (f) void upload(f);
    },
    [upload]
  );

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-[1.15rem] italic text-ink dark:text-white">
          Adjuntos
        </h2>
        <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 font-body text-[0.7rem] font-medium text-ink-muted dark:bg-white/10 dark:text-white/65">
          {adjuntos.length}
        </span>
      </div>
      <p className="mb-4 font-body text-[0.72rem] leading-relaxed text-ink-muted dark:text-white/55">
        Informes externos, consentimientos firmados o documentación que no forman parte del chat.
        Solo personal autorizado; las descargas quedan acotadas al contexto clínico. Tipos permitidos:
        PDF, imágenes habituales, Word/Excel/PowerPoint (.doc/.docx/.xls/.xlsx/.ppt/.pptx). Máximo 50
        MB por archivo.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,application/pdf,image/*"
          disabled={pending}
          onChange={onChangeInput}
          aria-label="Seleccionar archivo para subir"
        />
        <Button
          type="button"
          variant="surface"
          size="sm"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
        >
          {pending ? 'Subiendo…' : 'Subir archivo'}
        </Button>
      </div>

      {error ? (
        <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 font-body text-[0.75rem] text-red-800 dark:bg-red-500/15 dark:text-red-200">
          No se pudo subir: {error}
        </p>
      ) : null}

      {adjuntos.length === 0 ? (
        <p className="py-4 text-center font-body text-[0.85rem] text-ink-soft dark:text-white/45">
          Sin archivos todavía.
        </p>
      ) : (
        <ul className="space-y-2">
          {adjuntos.slice(0, 8).map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-2 rounded-xl bg-white/50 p-2 dark:bg-white/5"
            >
              <span
                className="material-symbols-outlined shrink-0 text-ink-muted dark:text-white/55"
                aria-hidden="true"
              >
                attach_file
              </span>
              <div className="min-w-0 flex-1">
                <a
                  href={`/api/admin/pacientes/adjuntos/${a.id}`}
                  className="block truncate font-body text-[0.8rem] text-ink underline decoration-dotted underline-offset-2 hover:text-primary dark:text-white"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {a.nombre}
                </a>
                <p className="font-body text-[0.7rem] text-ink-muted dark:text-white/55">
                  {format(new Date(a.created_at), 'd MMM yyyy', { locale: es })}
                  {a.size_bytes != null && a.size_bytes > 0
                    ? ` · ${formatSize(a.size_bytes)}`
                    : ''}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
