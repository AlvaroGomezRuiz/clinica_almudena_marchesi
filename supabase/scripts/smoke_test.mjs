// Smoke test de Edge Functions desplegadas. Verifica que:
//   1. El endpoint responde (status < 600)
//   2. El handler está montado (no 404 de infraestructura)
//   3. Rechaza peticiones mal formadas como se espera (401/400/405)
//
// Los Edge Functions con verify_jwt=true deberían devolver 401 sin auth.
// Los que tienen verify_jwt=false (webhooks) deberían devolver 400/401 segun firma.
//
// Uso (desde la raiz del repo):
//   SUPABASE_PROJECT_REF=tu_ref node supabase/scripts/smoke_test.mjs
// Si no defines SUPABASE_PROJECT_REF, se usa el ref por defecto del proyecto clinica.

const PROJECT_ID = process.env.SUPABASE_PROJECT_REF ?? 'koxsikkobjlycqqfstye';
const BASE = `https://${PROJECT_ID}.supabase.co/functions/v1`;

const TESTS = [
  { fn: 'send-email',              method: 'POST', expectStatus: [401, 400], body: {} },
  { fn: 'stripe-checkout',         method: 'POST', expectStatus: [401],      body: {} },
  { fn: 'stripe-webhook',          method: 'POST', expectStatus: [400, 500], body: {} },
  { fn: 'cron-recordatorios-24h',  method: 'POST', expectStatus: [403, 500], body: {} },
  { fn: 'cancel-cita',             method: 'POST', expectStatus: [401],      body: {} },
  { fn: 'assign-recurso',          method: 'POST', expectStatus: [401],      body: {} },
  { fn: 'resend-webhook',          method: 'POST', expectStatus: [400, 401, 500], body: {} },
];

let pass = 0;
let fail = 0;

for (const t of TESTS) {
  try {
    const res = await fetch(`${BASE}/${t.fn}`, {
      method: t.method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(t.body),
    });
    const text = await res.text().catch(() => '');
    const ok = t.expectStatus.includes(res.status);
    if (ok) pass++;
    else fail++;
    const body = text.length > 120 ? text.slice(0, 120) + '...' : text;
    console.log(`${ok ? 'OK ' : 'XX '} ${t.fn.padEnd(24)} -> ${res.status}  ${body}`);
  } catch (e) {
    fail++;
    console.log(`XX ${t.fn.padEnd(24)} -> ERROR ${e.message}`);
  }
}

console.log(`\n${pass}/${TESTS.length} OK (${fail} fail)`);
process.exit(fail > 0 ? 1 : 0);
