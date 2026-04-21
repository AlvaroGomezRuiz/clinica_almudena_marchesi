'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type Props = {
  initialNota: string;
  disabled?: boolean;
};

export default function AdminNotaAdministrativaSticker({
  initialNota,
  disabled,
}: Props) {
  const [nota, setNota] = useState(initialNota ?? '');
  const lastSaved = useRef((initialNota ?? '').trim());

  useEffect(() => {
    setNota(initialNota ?? '');
    lastSaved.current = (initialNota ?? '').trim();
  }, [initialNota]);

  const handleBlur = useCallback(async () => {
    if (disabled) return;

    const cleaned = (nota ?? '').trim();
    if (cleaned === lastSaved.current) return;

    try {
      const res = await fetch('/api/admin/facturacion/nota-administrativa', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nota: cleaned }),
      });

      if (res.ok) {
        lastSaved.current = cleaned;
        setNota(cleaned);
      }
    } catch {
      // Silencioso por diseño.
    }
  }, [disabled, nota]);

  return (
    <div className="bg-[#f2f1ec] p-6 rounded-lg rotate-1 tonal-card border border-stone-300/30 flex flex-col items-center text-center space-y-4">
      <span
        className="material-symbols-outlined text-4xl text-tertiary/40"
        data-icon="sticky_note_2"
      >
        sticky_note_2
      </span>

      <textarea
        className="w-full bg-transparent text-xs italic text-stone-600 font-serif leading-relaxed resize-none outline-none disabled:opacity-60"
        rows={5}
        placeholder="Sin notas administrativas."
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        onBlur={handleBlur}
        disabled={disabled}
      />

      <div className="w-12 h-0.5 bg-stone-300" />
      <span className="text-[10px] uppercase tracking-tighter text-stone-400">
        Nota Administrativa
      </span>
    </div>
  );
}
