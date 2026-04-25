// Cliente Resend minimalista con retry exponencial.
// No usamos el SDK oficial porque añade 80kB innecesarios; la API REST
// es trivial (un único POST /emails).

interface ResendAttachment {
  filename: string;
  /** Base64 del archivo (API Resend). */
  content: string;
}

interface ResendPayload {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  reply_to?: string;
  tags?: Array<{ name: string; value: string }>;
  attachments?: ResendAttachment[];
}

interface ResendOkResponse { id: string }
interface ResendErrResponse { name: string; message: string; statusCode?: number }

export interface SendResult {
  ok: boolean;
  providerId?: string;
  error?: string;
  attempts: number;
}

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 400; // 400ms → 800ms → 1600ms

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendViaResend(payload: ResendPayload): Promise<SendResult> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY no configurado", attempts: 0 };
  }

  let lastError = "unknown error";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(RESEND_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = (await res.json()) as ResendOkResponse;
        return { ok: true, providerId: data.id, attempts: attempt };
      }

      const err = (await res.json().catch(() => ({}))) as ResendErrResponse;
      lastError = `${res.status} ${err.message ?? err.name ?? res.statusText}`;

      // 4xx (excepto 429) → no reintentar, error de payload / auth
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        return { ok: false, error: lastError, attempts: attempt };
      }
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }

    if (attempt < MAX_ATTEMPTS) {
      await sleep(BASE_DELAY_MS * 2 ** (attempt - 1));
    }
  }

  return { ok: false, error: lastError, attempts: MAX_ATTEMPTS };
}
