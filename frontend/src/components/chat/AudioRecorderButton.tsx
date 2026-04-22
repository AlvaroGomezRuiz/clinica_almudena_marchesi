'use client';

/**
 * Grabación de nota de voz para el chat (MediaRecorder → WebM/Opus).
 * Sube vía /api/mensajes/attach con el mismo contrato que archivos.
 */

import { useCallback, useEffect, useRef, useState, useTransition, type JSX } from 'react';
import { useRouter } from 'next/navigation';

const MAX_MS = 120_000;
const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'] as const;

interface Props {
  readonly conversacionId: string;
  readonly disabled?: boolean;
}

export default function AudioRecorderButton({
  conversacionId,
  disabled,
}: Props): JSX.Element {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pickMime = useCallback((): string => {
    for (const m of MIME_CANDIDATES) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) {
        return m;
      }
    }
    return 'audio/webm';
  }, []);

  const stopTracks = useCallback((): void => {
    for (const t of streamRef.current?.getTracks() ?? []) {
      t.stop();
    }
    streamRef.current = null;
  }, []);

  const clearTimers = useCallback((): void => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
  }, []);

  const uploadBlob = useCallback(
    (blob: Blob, label: string): void => {
      const file = new File([blob], label, { type: blob.type || 'audio/webm' });
      const form = new FormData();
      form.append('file', file);
      form.append('conversation_id', conversacionId);
      form.append('body', '🎤 Nota de voz');

      startTransition(async () => {
        try {
          const res = await fetch('/api/mensajes/attach', { method: 'POST', body: form });
          const body = (await res.json()) as { ok?: boolean; error?: string };
          if (!res.ok || !body.ok) {
            setErr(body.error ?? `HTTP ${res.status}`);
            return;
          }
          setErr(null);
          router.refresh();
        } catch (e) {
          setErr(e instanceof Error ? e.message : 'upload_error');
        }
      });
    },
    [conversacionId, router]
  );

  const stopAndUpload = useCallback((): void => {
    const rec = recRef.current;
    if (!rec || rec.state === 'inactive') return;
    rec.stop();
  }, []);

  const start = useCallback(async () => {
    if (disabled || isPending) return;
    setErr(null);
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setErr('mic_no_disponible');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mime = pickMime();
      let rec: MediaRecorder;
      try {
        rec = new MediaRecorder(stream, { mimeType: mime });
      } catch {
        rec = new MediaRecorder(stream);
      }
      recRef.current = rec;

      rec.ondataavailable = (ev: BlobEvent) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      rec.onstop = () => {
        clearTimers();
        stopTracks();
        setRecording(false);
        setSeconds(0);
        const parts = chunksRef.current;
        chunksRef.current = [];
        recRef.current = null;
        if (parts.length === 0) return;
        const blob = new Blob(parts, { type: rec.mimeType || mime });
        const ext = blob.type.includes('ogg') ? 'ogg' : 'webm';
        uploadBlob(blob, `voz-${Date.now()}.${ext}`);
      };

      setRecording(true);
      setSeconds(0);
      rec.start(200);
      timerRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
      stopTimerRef.current = setTimeout(() => {
        stopAndUpload();
      }, MAX_MS);
    } catch {
      setErr('permiso_microfono');
      stopTracks();
    }
  }, [clearTimers, disabled, isPending, pickMime, stopAndUpload, stopTracks, uploadBlob]);

  useEffect(
    () => () => {
      clearTimers();
      if (recRef.current && recRef.current.state !== 'inactive') {
        recRef.current.stop();
      }
      stopTracks();
    },
    [clearTimers, stopTracks]
  );

  const onToggle = useCallback((): void => {
    if (recording) {
      stopAndUpload();
    } else {
      void start();
    }
  }, [recording, start, stopAndUpload]);

  const label = err ? `Error: ${err}` : recording ? `Parar · ${seconds}s` : 'Grabar nota de voz';

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled || isPending}
        title={label}
        aria-label={label}
        aria-pressed={recording}
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ring-1 ring-inset transition disabled:opacity-40 ${
          recording
            ? 'animate-pulse bg-red-500/90 text-white ring-red-300/50'
            : 'bg-white/55 text-ink-soft ring-white/50 hover:bg-white/90 hover:text-primary dark:bg-white/5 dark:text-white/60 dark:ring-white/10 dark:hover:bg-white/10 dark:hover:text-primary'
        }`}
      >
        <span className="material-symbols-outlined text-[1.2rem]" aria-hidden="true">
          {isPending ? 'sync' : recording ? 'stop_circle' : 'mic'}
        </span>
      </button>
    </div>
  );
}
