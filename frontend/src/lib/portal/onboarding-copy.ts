/**
 * Copy de onboarding (gate de pago / primera compra), tono alineado a fase 10.
 */

/** Secciones del menú lateral del portal (bienvenida). */
export const PORTAL_NAV_SECTIONS: readonly {
  readonly title: string;
  readonly description: string;
}[] = [
  {
    title: 'Inicio',
    description:
      'Resumen de tu próxima cita, avisos rápidos y acceso al estado general del portal.',
  },
  {
    title: 'Citas',
    description:
      'Consulta tus citas programadas, historial y el flujo para reservar o reprogramar según disponibilidad.',
  },
  {
    title: 'Bonos y pagos',
    description:
      'Compra bonos de sesiones, revisa pagos con Stripe y el estado de tus bonos activos.',
  },
  {
    title: 'Mensajes',
    description:
      'Canal seguro con la consulta: consultas breves, coordinación y avisos que no van por email.',
  },
  {
    title: 'Recursos',
    description:
      'Material recomendado (lecturas, ejercicios o enlaces) que la terapeuta comparte contigo.',
  },
  {
    title: 'Ajustes',
    description:
      'Datos de cuenta, preferencias de contacto y opciones de privacidad/notificaciones.',
  },
] as const;

export const PORTAL_BIENVENIDA_PASO_TARIFAS = 'Tarifas y bonos' as const;

export const PORTAL_BIENVENIDA_PASO_PAGO = 'Pago seguro (Stripe)' as const;

export const PORTAL_BIENVENIDA_PASO_CITA = 'Reserva de cita' as const;

export const PORTAL_BIENVENIDA_PASO_PORTAL = 'Portal al completo' as const;

export const PORTAL_SUCCESS_NEXT_BONO =
  'Tu bono ya figura en la cuenta. El siguiente paso lógico es reservar una franja.';

export const PORTAL_SUCCESS_EMAIL_TIP =
  'Si hiciste el pago con tarjeta, puedes recibir en breve un recibo o factura (según corresponda) al correo de la cuenta.';
