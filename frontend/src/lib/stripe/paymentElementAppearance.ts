import type { StripeElementsOptions } from '@stripe/stripe-js';

/** Alineado con `next-themes` + drawer de pago (`PaymentElementDrawer`). */
export type PortalStripeScheme = 'light' | 'dark';

type ElementsAppearance = NonNullable<StripeElementsOptions['appearance']>;

/**
 * Tipografía de marca (coincide con layout / Tailwind `font-display` + cuerpo).
 * Newsreader debe estar cargada en el documento (p. ej. `next/font` en layout).
 */
const FONT_STACK =
  '"Newsreader", "Inter", system-ui, -apple-system, "Segoe UI", sans-serif';

/**
 * Construye el objeto que Stripe documenta como **Parámetro de aspecto**:
 * debe ir en la clave `appearance` de las opciones de `stripe.elements(options)`.
 * Con `@stripe/react-stripe-js`, es el mismo objeto en
 * `<Elements options={{ appearance: … }}>` (ver `PaymentElementDrawer`).
 *
 * El editor del Dashboard sirve para previsualizar y copiar un fragmento;
 * aquí lo versionamos en código para alinearlo con la paleta del portal.
 *
 * Colores tomados de `tailwind.config.ts` (canvas, ink, sage, warm, error).
 *
 * @param scheme — `'light'`: crema + verde sage; `'dark'`: fondo portal + acentos legibles.
 */
export function buildPaymentElementAppearance(
  scheme: PortalStripeScheme,
): ElementsAppearance {
  if (scheme === 'light') {
    return {
      theme: 'stripe',
      labels: 'floating',
      inputs: 'condensed',
      variables: {
        fontFamily: FONT_STACK,
        fontSizeBase: '16px',
        borderRadius: '12px',
        spacingUnit: '4px',
        colorBackground: '#F8F6F1',
        colorText: '#1C1C19',
        colorTextSecondary: '#6B6960',
        colorTextPlaceholder: '#A5A49C',
        colorPrimary: '#4A6355',
        colorDanger: '#a83836',
        colorSuccess: '#4A6355',
        colorWarning: '#8B7355',
        buttonColorBackground: '#4A6355',
        buttonColorText: '#F8F6F1',
      },
    };
  }

  return {
    theme: 'night',
    labels: 'floating',
    inputs: 'condensed',
    variables: {
      fontFamily: FONT_STACK,
      fontSizeBase: '16px',
      borderRadius: '12px',
      spacingUnit: '4px',
      colorBackground: '#1b1b18',
      colorText: '#F8F6F1',
      colorTextSecondary: '#A5A49C',
      colorTextPlaceholder: '#6B6960',
      colorPrimary: '#7A9B8A',
      colorDanger: '#fa746f',
      colorSuccess: '#7A9B8A',
      colorWarning: '#ffb74a',
      buttonColorBackground: '#7A9B8A',
      buttonColorText: '#1C1C19',
    },
  };
}
