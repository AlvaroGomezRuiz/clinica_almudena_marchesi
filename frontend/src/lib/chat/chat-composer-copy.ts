/**
 * Textos del compositor de chat (tono clínico, propio; evita fórmulas de IM genéricas).
 */
/**
 * Cuerpo almacenado del mensaje cuando el adjunto es solo audio (sin comentario del paciente).
 * Debe coincidir con lo que envía `AudioRecorderButton` al API.
 */
export const CHAT_AUDIO_MESSAGE_BODY = 'Mensaje de audio enviado desde el portal.' as const;

export const CHAT_TEXT_PLACEHOLDER = 'Escribe aquí…' as const;

export const CHAT_TEXT_PLACEHOLDER_HINT =
  'Enter envía el mensaje. Con Shift+Enter añades un salto de línea.' as const;

export const CHAT_ATTACH_TOOLTIP =
  'Añadir una imagen, un PDF u otro tipo permitido.' as const;

export const CHAT_AUDIO_IDLE =
  'Grabar un mensaje de audio' as const;

export const CHAT_AUDIO_RECORDING =
  'Pulsa de nuevo para finalizar y enviar' as const;

export const CHAT_AUDIO_SENDING = 'Enviando el audio…' as const;

export function formatFileSizeForChat(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1).replace(/\.0$/, '')} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, '')} MB`;
}

export function formatRecordingDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const AUDIO_ERR_FALLBACK = 'Inténtalo de nuevo en unos momentos.';

/**
 * Códigos internos de error → mensaje visible (sin tecnicismos).
 */
export function chatAudioErrorToMessage(code: string | null | undefined): string {
  if (code == null || code === '') return AUDIO_ERR_FALLBACK;
  if (code === 'mic_no_disponible') {
    return 'Este entorno no permite acceder al micrófono.';
  }
  if (code === 'permiso_microfono') {
    return 'Acepta el permiso de micrófono en el navegador o revisa el candado de la barra de direcciones.';
  }
  if (code === 'upload_error') {
    return 'No se pudo completar el envío del audio. Prueba otra conexión o más tarde.';
  }
  if (code === 'file_signature_mismatch') {
    return 'El navegador envió un formato de audio no reconocido. Prueba de nuevo o adjunta un archivo.';
  }
  if (code === 'rate_limited') {
    return 'Demasiados envíos seguidos. Espera un minuto e inténtalo de nuevo.';
  }
  if (code.startsWith('HTTP ')) {
    return 'No se pudo subir el audio. Comprueba la conexión.';
  }
  return AUDIO_ERR_FALLBACK;
}
