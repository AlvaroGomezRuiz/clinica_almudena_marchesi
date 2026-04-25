# Webhook de Stripe a Supabase

1. **URL completa (destino de eventos en Stripe):**

   `https://<proyecto>.supabase.co/functions/v1/stripe-webhook`

   Comprueba que el último tramo es **`stripe-webhook`** (no se puede cortar en
   `…/stripe-webho`); si la URL queda mutilada, Stripe responde **404** a cada
   entrega y en el panel se ve **0 % de aciertos**.

2. **Secreto de firma (Signing secret, `whsec_…`)** en Supabase → *Edge Functions*
   → `STRIPE_WEBHOOK_SECRET` debe coincidir con el de ese endpoint en el dashboard
   de Stripe (cada “destino” tiene un secreto distinto; test y live, distintos).

3. Tras corregir la URL, reenvía un evento `payment_intent.succeeded` de prueba o
   paga otra tarjeta de test y comprueba que `stripe_events` y `pagos` se
   rellenan (y el paciente deja de ver “Procesando” indefinidamente en la
   confirmación, porque el borrador depende de ese insert).

4. **JWT en la Edge Function (`verify_jwt`)**  
   `stripe-webhook` debe ejecutarse **sin** exigir JWT (Stripe solo manda cabecera
   `Stripe-Signature`). En el repo está fijado en `supabase/config.toml` bajo
   `[functions.stripe-webhook] verify_jwt = false`. Si al desplegar desde otro
   entorno se omitiera y el dashboard tuviera “Enforce JWT” activo para esa
   función, cada entrega devolvería **401** y el síntoma es el mismo: pago OK en
   Stripe, fila ausente en `pagos`, pantalla de confirmación atascada.
