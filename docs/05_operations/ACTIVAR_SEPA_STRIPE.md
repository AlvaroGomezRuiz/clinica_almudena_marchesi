# Activar SEPA (transferencia bancaria) en Stripe

> **Autor**: Auditoría técnica 22-abr-2026
> **Destinataria**: Almudena (como titular de la cuenta Stripe)
> **Tiempo estimado**: 15 minutos · activación + ~2 días hábiles de revisión de Stripe

---

## 1. ¿Por qué activar SEPA?

Hoy tu portal acepta **solo tarjeta** (Visa, Mastercard, American Express).
SEPA Direct Debit permite a los pacientes pagarte **por transferencia
bancaria domiciliada** (IBAN) sin salir del portal. Ventajas:

- **Comisiones más bajas**: SEPA cuesta ~0,35 €/transacción vs. ~1,4 %+25 ct.
  de tarjeta. En un bono de 450 € te ahorras ~6 €.
- **Apropiado para bonos grandes**: algunos pacientes desconfían de pagar
  450 € con tarjeta en un sitio web y prefieren transferencia.
- **Compatible con Payment Element**: nuestro drawer de pago ya está
  configurado con `automatic_payment_methods.enabled = true`, así que
  bastará con activar SEPA en el dashboard para que aparezca
  automáticamente como opción junto a tarjeta.

> ⚠️ **Limitación importante**: SEPA es **asíncrono**. El dinero tarda 5-7
> días hábiles en confirmarse (contrario a tarjeta que es instantáneo).
> Durante ese tiempo el pago queda en estado `procesando` y **no se crea
> bono ni se confirma cita**. El webhook ya gestiona esto correctamente
> (migración `0010_stripe.sql` contempla `payment_intent.processing`), pero
> hay que comunicárselo al paciente en la UI (tarea del siguiente sprint).

---

## 2. Checklist de activación en Stripe Dashboard

Entra en <https://dashboard.stripe.com> con la cuenta de la clínica y
completa **todo el checklist en este orden**:

### 2.1. Verificar que la cuenta está en modo _live_

1. Esquina superior izquierda → selector **"Modo test / Modo en vivo"**.
2. Asegúrate de que estás en **Modo en vivo** (fondo morado, no amarillo).
3. Si ves "Activar pagos", completa antes la verificación KYC (DNI de
   Almudena + IBAN de cobro + justificante de actividad).

### 2.2. Solicitar la capacidad SEPA

1. Menú lateral → **Configuración** → **Métodos de pago**
   (URL directa: <https://dashboard.stripe.com/settings/payment_methods>).
2. Busca **"Adeudos SEPA directos"** o "SEPA Direct Debit".
3. Pulsa **"Activar"**. Stripe te pedirá:
   - **Dirección de la clínica** (la que aparezca en la factura Almudena).
   - **Web donde se usará** (`https://amclinicapsicologia.es`).
   - **Términos del mandato SEPA** — Stripe genera el texto legal por ti
     y lo muestra automáticamente al paciente antes de aceptar el pago.
4. **Espera la aprobación**: tarda entre 1 hora y 2 días hábiles.
   Recibirás un email cuando esté activo. Mientras tanto, SEPA aparecerá
   como "en revisión" en el dashboard.

### 2.3. Configurar la divisa y países aceptados

1. Dentro de la configuración de **Adeudos SEPA directos**:
   - **Divisa**: euro (EUR). No cambiar.
   - **Países**: marca los 36 países SEPA (España, Francia, Alemania,
     Portugal, Italia…). Si sólo quieres aceptar pacientes residentes
     en España, deja sólo **España**.
2. Guarda cambios.

### 2.4. Desactivar métodos que NO vamos a usar (reduce confusión)

En la misma pantalla, **desactiva** los siguientes métodos para que no
aparezcan en el Payment Element:

| Método | Motivo |
|--------|--------|
| Klarna, Afterpay | Financiación BNPL — no aplica a servicios médicos recurrentes. |
| iDEAL | Específico de Países Bajos. No tenemos pacientes holandeses. |
| Bancontact | Específico de Bélgica. |
| Sofort | Alemania — deprecado en favor de SEPA. |
| Giropay | Alemania — deprecado. |
| PayPal | Gestión paralela de disputas, complicaciones contables. |
| Cash App Pay | USA-only. |
| Multibanco | Portugal — sólo si tenemos pacientes portugueses, hoy no. |

Dejar activos **sólo**: `Tarjeta`, `SEPA Direct Debit`, `Apple Pay` y
`Google Pay` (los dos últimos son wallets sobre tarjeta, no cuestan extra).

### 2.5. Probar el flujo en Sandbox antes de live

> Importante: antes de dar SEPA por activo en producción, verifica el
> flujo en modo test.

1. Cambia al **modo test** (esquina superior izquierda).
2. Ve a tu portal en staging (o localhost:3000) y compra un bono como
   paciente de prueba.
3. En el Payment Element deberías ver una pestaña "SEPA Direct Debit".
4. Usa el IBAN de test: `DE89370400440532013000` (devuelve éxito) o
   `DE62370400440532013001` (devuelve fondos insuficientes).
5. Verifica en el dashboard de Stripe que el PaymentIntent queda en
   estado `processing` (no `succeeded`).

---

## 3. Cambios que la clínica debe comunicar a los pacientes

Cuando actives SEPA en producción, añade un aviso discreto al lado del
botón "Pagar" en `/portal/pagos` (tarea técnica del próximo sprint):

> **Info**: Si pagas con transferencia bancaria (SEPA), tu bono se activará
> en 2-5 días hábiles. Para activación inmediata, usa tarjeta.

Justificación legal: los usuarios deben saber que SEPA es asíncrono. Si no
se comunica, Stripe puede considerarlo "expectativa engañosa" y suspender
la capacidad.

---

## 4. Qué NO necesitas hacer

Para que SEPA funcione en tu portal **ya no hace falta**:

- ✅ Modificar código del Payment Element — está configurado con
  `automatic_payment_methods.enabled = true` y aparecerá SEPA
  automáticamente cuando Stripe lo active.
- ✅ Cambiar el webhook — ya procesa `payment_intent.processing` y
  `payment_intent.succeeded` correctamente (`supabase/functions/stripe-webhook`).
- ✅ Crear mandato — Stripe gestiona el texto legal del mandato SEPA
  internamente y lo muestra al paciente antes de cobrar.

---

## 5. Resumen ejecutivo (copiar/pegar a Almudena)

> **Para activar SEPA (transferencia bancaria) en Stripe**:
>
> 1. Entra en <https://dashboard.stripe.com/settings/payment_methods>
>    en modo en vivo.
> 2. Activa **"Adeudos SEPA directos"** y completa los datos.
> 3. Desactiva Klarna, Afterpay, iDEAL, Bancontact, Sofort, Giropay,
>    PayPal, Cash App, Multibanco (no los usamos).
> 4. Espera email de aprobación (1-2 días hábiles).
> 5. Cuando aparezca activo, haz una compra de prueba pequeña
>    (ej. bono de 3 sesiones) con tu propio IBAN para confirmar que
>    el flujo funciona.
>
> El código ya está preparado; no hace falta tocar nada.

---

**Fecha de la tarea**: 22-abr-2026
**Responsable técnico**: Alvar (alvar.castan@gmail.com) — disponible si
Stripe rechaza la solicitud o pide información adicional.
