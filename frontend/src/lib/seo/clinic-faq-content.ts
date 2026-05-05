import {
  CLINIC_ADDRESS,
  CLINIC_CONTACT_EMAIL,
  CLINIC_PROFESSIONAL_LICENSE,
  CLINIC_PUBLIC_PRESENCIAL_HOURS_SUMMARY_ES,
  CLINIC_PUBLIC_PHONE_DISPLAY,
  CLINIC_PUBLIC_SITE_URL,
  CLINIC_SESSION_DURATION_MIN,
  CLINIC_TARIFAS_SESION_RESUMEN,
} from '@/lib/clinic';

/** Pregunta/respuesta para bloques FAQ y JSON-LD (mismo texto en DOM y en `FAQPage`). */
export interface ClinicFaqItem {
  readonly question: string;
  readonly answer: string;
}

const siteHost: string = (() => {
  try {
    return new URL(CLINIC_PUBLIC_SITE_URL).host;
  } catch {
    return 'ampsicologia.es';
  }
})();

/**
 * FAQs de la home: visión general, acceso, cobertura geográfica.
 * Horarios y NAP detallados: página Contacto.
 */
export const homePageFaq: ReadonlyArray<ClinicFaqItem> = [
  {
    question: '¿Dónde está la consulta de psicología en Madrid?',
    answer: `Psicología clínica con consulta presencial en Moncloa–Chamberí (Madrid, CP 28015): ${CLINIC_ADDRESS}. Terapia individual, de pareja e infanto-juvenil; también online con cita. Mapa, cómo llegar y datos de contacto están en la página de contacto de ${siteHost}.`,
  },
  {
    question: '¿Atiende solo en la zona de Moncloa y Chamberí?',
    answer:
      'La consulta presencial está en el entorno Moncloa–Chamberí. Suelen acudir personas de otros barrios y distritos (por ejemplo, Centro, Tetuán, Fuencarral–El Pardo, Chamartín o el barrio de Almagro en Madrid, sin confundir con otras localidades homónimas) y, con cita, terapia online con enlace acordado.',
  },
  {
    question: '¿Cómo pido cita o consulto tarifas al día?',
    answer: `Para pedir cita o consultar cualquier duda sobre tarifas, escríbeme o llámame directamente utilizando los datos de la página de contacto en ${siteHost}.`,
  },
  {
    question: '¿Ofrece terapia online además de presencial?',
    answer:
      'Sí. La terapia online se realiza con enlace seguro acordado (p. ej. Google Meet) y la misma política operativa que el resto de servicios (incluida la ventana de cancelación descrita en el aviso legal y en el flujo de reserva).',
  },
  {
    question: '¿Qué problemas o motivos de consulta atiende la clínica?',
    answer:
      'Se trabaja con un enfoque clínico integrador en adultos, terapia de pareja e infanto-juvenil, abordando entre otros motivos como ansiedad, bajo estado de ánimo, estrés, duelo y dificultades en las relaciones. Cada caso se valora de forma individualizada en la primera sesión.',
  },
  {
    question: '¿Cómo contacto por teléfono o correo?',
    answer: `Puedes llamar o escribir al ${CLINIC_PUBLIC_PHONE_DISPLAY} y al correo ${CLINIC_CONTACT_EMAIL}. Tus datos y consultas se tratarán con total privacidad y confidencialidad.`,
  },
  {
    question: '¿Atiende urgencias psiquiátricas o crisis 24 h?',
    answer:
      'No. La consulta no sustituye a un servicio de urgencias ni a un dispositivo de salud mental de emergencia. En situación de riesgo inmediato debes acudir a emergencias o contactar con los recursos de crisis de tu comunidad autónoma.',
  },
];

/** Tarifas, duración, modalidades y política. */
export const serviciosPageFaq: ReadonlyArray<ClinicFaqItem> = [
  {
    question: '¿Cuáles son las tarifas por sesión?',
    answer: `Las tarifas orientativas son: ${CLINIC_TARIFAS_SESION_RESUMEN}. Si tienes cualquier duda, consúltame directamente.`,
  },
  {
    question: '¿Cuánto dura una sesión?',
    answer: `Las sesiones presenciales y online están planteadas en torno a ${CLINIC_SESSION_DURATION_MIN} minutos, salvo que se acuerde otra duración o formato con criterio clínico y de agenda.`,
  },
  {
    question: '¿En qué se diferencia la terapia individual, de pareja e infanto-juvenil?',
    answer:
      'La terapia individual se centra en la persona adulta; la de pareja en la relación y la comunicación entre miembros; el enfoque infanto-juvenil adapta el marco a la edad y el contexto familiar. En todos los casos se prioriza un marco clínico basado en evidencia y ajustado a tu situación.',
  },
  {
    question: '¿Cómo funciona la cancelación o el cambio de cita?',
    answer:
      'La cancelación o el cambio de cita debe comunicarse con más de 48 horas de antelación al inicio de la sesión, salvo condiciones excepcionales.',
  },
  {
    question: '¿Cuáles son las formas de pago?',
    answer: `El pago se realizará según lo acordemos en nuestro primer contacto (efectivo, transferencia, etc.).`,
  },
];

/** Metodología, confidencialidad y plazos. */
export const enfoquePageFaq: ReadonlyArray<ClinicFaqItem> = [
  {
    question: '¿Qué entiende por enfoque integrador en psicología clínica?',
    answer:
      'Un enfoque integrador combina el rigor de la psicología clínica y la evidencia científica con una escucha activa y un marco no punitivo. No se trata de aplicar una técnica de moda, sino de ajustar el marco teórico y la intervención a tu historia y a tus objetivos, con transparencia sobre límites y posibilidades.',
  },
  {
    question: '¿La terapia está basada en evidencia?',
    answer:
      'Sí. La práctica se orienta a protocolos e intervenciones con sustento científico, evitando promesas de cura rápida. El plan terapéutico se revisa con el tiempo según respuesta, contexto y recursos de la persona o la pareja.',
  },
  {
    question: '¿Qué rol juega el vínculo terapéutico?',
    answer:
      'La alianza terapéutica (confianza, claridad de objetivos y regularidad) es un predictor clave de resultado. La consulta se plantea como un espacio de seguridad psicológica donde puedas nombrar lo difícil sin juicio, dentro de un marco profesional y deontológico.',
  },
  {
    question: '¿Cuánto suele durar un proceso terapéutico?',
    answer:
      'No hay un número fijo de sesiones: depende de la complejidad del motivo de consulta, tu implicación y el encaje con los objetivos. Al inicio se acuerda una evaluación y, de forma colaborativa, frecuencia y foco; se revisa periódicamente si el enfoque sigue siendo útil.',
  },
  {
    question: '¿Cómo se garantiza la confidencialidad?',
    answer:
      'El contenido de las sesiones y los datos de salud se tratan según la normativa vigente (LOPDGDD y RGPD) aplicando las medidas técnicas y organizativas necesarias. Más detalle: política de privacidad y aviso legal en el sitio web.',
  },
];

/** Formación, colegiación e identidad profesional. */
export const sobreMiPageFaq: ReadonlyArray<ClinicFaqItem> = [
  {
    question: '¿Quién es la responsable de la consulta?',
    answer:
      'La Clínica Almudena Marchesi / AM Psicología es un proyecto liderado por Almudena Marchesi Fernández, psicóloga con formación en psicología clínica y práctica en entorno Moncloa (Madrid), además de terapia online con enlace acordado.',
  },
  {
    question: '¿Está colegiada en el Colegio Oficial de Psicólogos de Madrid?',
    answer: `Sí. El número de colegiación que figura en la documentación y comunicaciones oficiales de la consulta es el ${CLINIC_PROFESSIONAL_LICENSE}. Puedes contrastar el registro en el colegio profesional correspondiente.`,
  },
  {
    question: '¿Qué formación clínica tiene?',
    answer:
      'Formación en Psicología clínica y Máster en Psicología General Sanitaria (trayectoria académica detallada en esta misma página y en el material que compartimos con pacientes en el contexto de la relación clínica).',
  },
  {
    question: '¿En qué idioma se ofrece la terapia?',
    answer:
      'El idioma principal de la consulta es el español. Si necesitas otro idioma, conviene plantearlo en el primer contacto para valorar viabilidad.',
  },
  {
    question: '¿Trabaja con adultos, adolescentes y familias?',
    answer:
      'Sí: enfoque individual, de pareja e infanto-juvenil, según el servicio contratado y la evaluación previa. En menores, la participación de las figuras de crianza se acuerda según criterio clínico y marco legal.',
  },
];

/** NAP, horario publicado en web, accesos y visita. */
export const contactoPageFaq: ReadonlyArray<ClinicFaqItem> = [
  {
    question: '¿Cuál es el horario de atención publicado en la web?',
    answer: `${CLINIC_PUBLIC_PRESENCIAL_HOURS_SUMMARY_ES} En la sección de horario de la página de contacto (${siteHost}) verás el cuadro resumido; las horas concretas de cada cita se acuerdan de forma directa.`,
  },
  {
    question: '¿Cómo puedo contactar para pedir cita?',
    answer: `Puedes llamar al ${CLINIC_PUBLIC_PHONE_DISPLAY} o escribir a ${CLINIC_CONTACT_EMAIL}. También tienes un enlace a Google Maps en la tarjeta de ubicación de esta página para localizar la consulta.`,
  },
  {
    question: '¿Cómo llego en transporte público?',
    answer:
      'Desde el entorno de Moncloa–Chamberí hay buena conexión con metro (por ejemplo, Argüelles, Moncloa, Quevedo o Bilbao, según procedas), autobuses y bici. El detalle de ruta depende de tu origen: usa el enlace «Abrir en Google Maps» de esta página para planificar el trayecto.',
  },
  {
    question: '¿Hay aparcamiento cerca de la consulta?',
    answer:
      'En la zona predominan plazas de aparcamiento en vía pública (regulación según franja y día). Si te desplazas en coche, revisa señalización y tarifas locales. Si necesitas aparcamiento con requisitos concretos, indícalo al reservar.',
  },
  {
    question: '¿La consulta es accesible para movilidad reducida?',
    answer:
      'El acceso a la finca y a la planta de la consulta dispone de medidas de accesibilidad en edificio residencial. Si requieres asistencia específica o adaptaciones, coméntalo al reservar para orientarte con la mayor precisión posible.',
  },
  {
    question: '¿Puedo escribir por WhatsApp?',
    answer:
      'Puedes escribirme por WhatsApp, correo electrónico o teléfono para cualquier duda administrativa o para gestionar tu primera cita. Toda la información sanitaria y clínica se tratará de forma segura conforme a la normativa de privacidad.',
  },
];
