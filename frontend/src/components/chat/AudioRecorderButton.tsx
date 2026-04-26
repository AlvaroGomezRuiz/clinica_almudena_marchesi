'use client';

/**
 * Graba un mensaje de audio (WebM/Opus u OGG) y lo sube con el resto de adjuntos.
 */

import { useCallback, useEffect, useRef, useState, useTransition, type JSX } from 'react';
import { useRouter } from 'next/navigation';

import {
  CHAT_AUDIO_IDLE,
  CHAT_AUDIO_RECORDING,
  CHAT_AUDIO_MESSAGE_BODY,
  CHAT_AUDIO_SENDING,
  chatAudioErrorToMessage,
  formatRecordingDuration,
} from '@/lib/chat/chat-composer-copy';

const MAX_MS = 120_000;
const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'] as const;

interface Props {
  readonly conversacionId: string;
  readonly disabled?: boolean;
  readonly onUploaded?: (mensajeId: string) => void;
}

export default function AudioRecorderButton({
  conversacionId,
  disabled,
  onUploaded,
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
  const discardRef = useRef(false);

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
      form.append('body', CHAT_AUDIO_MESSAGE_BODY);

      startTransition(async () => {
        try {
          const res = await fetch('/api/mensajes/attach', { method: 'POST', body: form });
          const body = (await res.json()) as {
            ok?: boolean;
            error?: string;
            mensaje_id?: string;
          };
          if (!res.ok || !body.ok) {
            setErr(body.error != null && body.error.length > 0 ? body.error : `HTTP ${res.status}`);
            return;
          }
          setErr(null);
          if (body.mensaje_id) onUploaded?.(body.mensaje_id);
          router.refresh();
        } catch (e) {
          setErr('upload_error');
        }
      });
    },
    [conversacionId, onUploaded, router]
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
      discardRef.current = false;

      rec.ondataavailable = (ev: BlobEvent) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      rec.onstop = () => {
        clearTimers();
        stopTracks();
        setRecording(false);
        setSeconds(0);
        const wasDiscarded = discardRef.current;
        discardRef.current = false;
        const parts = chunksRef.current;
        chunksRef.current = [];
        recRef.current = null;
        if (wasDiscarded) {
          return;
        }
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
        discardRef.current = true;
        recRef.current.stop();
      }
      stopTracks();
    },
    [clearTimers, stopTracks]
  );

  const discardRecording = useCallback((): void => {
    if (!recRef.current || recRef.current.state === 'inactive') return;
    discardRef.current = true;
    recRef.current.stop();
  }, []);

  const onToggle = useCallback((): void => {
    if (recording) {
      stopAndUpload();
    } else {
      void start();
    }
  }, [recording, start, stopAndUpload]);

  const duration = formatRecordingDuration(seconds);
  const errVisible = err != null && err.length > 0 ? chatAudioErrorToMessage(err) : null;

  const a11yLabel: string = isPending
    ? CHAT_AUDIO_SENDING
    : errVisible != null
      ? `Problema: ${errVisible}`
      : recording
        ? `${CHAT_AUDIO_RECORDING} · Llevas ${duration}`
        : CHAT_AUDIO_IDLE;

  return (
    <div className="flex max-w-[10rem] flex-col items-center gap-1.5">
      {recording ? (
        <p className="w-full text-center font-body text-[0.64rem] leading-tight text-ink-muted tabular-nums dark:text-white/50">
          Grabando · {duration} · tope {formatRecordingDuration(Math.floor(MAX_MS / 1000))}
        </p>
      ) : null}
      <div className="flex w-full items-center justify-center gap-1.5">
        {recording ? (
          <button
            type="button"
            onClick={discardRecording}
            className="shrink-0 rounded-full px-2 py-1.5 font-body text-[0.64rem] text-ink-muted underline decoration-ink/30 underline-offset-2 hover:text-ink dark:text-white/55"
          >
            Descartar
          </button>
        ) : null}
        <button
          type="button"
          onClick={onToggle}
          disabled={disabled || isPending}
          title={a11yLabel}
          aria-label={a11yLabel}
          aria-pressed={recording}
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ring-1 ring-inset transition disabled:opacity-40 ${
            recording
              ? 'animate-pulse bg-primary text-on-primary ring-primary/30 dark:bg-primary-dark'
              : 'bg-white/55 text-ink-soft ring-white/50 hover:bg-white/90 hover:text-primary dark:bg-white/5 dark:text-white/60 dark:ring-white/10 dark:hover:bg-white/10 dark:hover:text-primary'
          }`}
        >
          <span className="material-symbols-outlined text-[1.2rem]" aria-hidden="true">
            {isPending ? 'sync' : recording ? 'stop' : 'mic'}
          </span>
        </button>
      </div>
      {errVisible ? (
        <p
          className="max-w-[10rem] text-pretty text-center font-body text-[0.64rem] leading-snug text-[#8c4d44] dark:text-[#f0b0a4]"
          role="alert"
        >
          {errVisible}
        </p>
      ) : null}
    </div>
  );
}
