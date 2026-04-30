import type { Metadata } from 'next';

import { CLINIC_CONTACT_EMAIL, CLINIC_PUBLIC_SITE_HOST_LABEL } from '@/lib/clinic';
import { buildPublicPageMetadata } from '@/lib/seo/build-public-page-metadata';
import { buildLegalWebPageJsonLd } from '@/lib/seo/legal-web-page-json-ld';
import { LEGAL_DOCUMENT_VERSION, LEGAL_LAST_UPDATED_ES } from '@/lib/seo/legal-version';

export const metadata: Metadata = buildPublicPageMetadata({
  path: '/privacidad',
  title: `Política de Privacidad — RGPD y datos de salud | ${CLINIC_PUBLIC_SITE_HOST_LABEL}`,
  description:
    'Tratamiento de datos personales y datos de salud conforme al RGPD (UE) 2016/679 y Ley 41/2002 básica de autonomía del paciente. Responsable: Almudena Marchesi Fernández.',
  keywords: [
    'privacidad',
    'RGPD',
    'datos de salud',
    'Ley 41/2002',
    'psicóloga Madrid',
    'AEPD',
    'cifrado AES-256',
  ],
  ogType: 'article',
  includeGeoHints: false,
});

const webPageJsonLd = buildLegalWebPageJsonLd({
  path: '/privacidad',
  name: 'Política de Privacidad',
  description:
    'Política de protección de datos personales y de salud conforme al Reglamento (UE) 2016/679.',
});

export default function PrivacidadPage() {
  return (
    <div className="bg-canvas min-h-screen pt-36 pb-24 px-6 md:px-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }}
      />
      <article className="max-w-3xl mx-auto prose-clinical">
        <header className="mb-14">
          <span className="font-mono text-label-sm uppercase tracking-[0.14em] text-sage-mid mb-4 block">
            RGPD · Ley 41/2002
          </span>
          <h1 className="font-display text-display-1 text-ink italic mb-4 text-balance">
            Política de Privacidad
          </h1>
          <p className="text-body-lg text-ink-soft leading-relaxed">
            Su privacidad es una prioridad clínica. Este documento explica cómo se recogen, tratan y
            protegen sus datos personales y, en su caso, datos especialmente protegidos (salud), de
            conformidad con el Reglamento (UE) 2016/679 (RGPD) y la normativa española aplicable,
            incluida la Ley 41/2002, básica reguladora de la autonomía del paciente y de los derechos y
            obligaciones en materia de información y documentación clínica.
          </p>
        </header>

        <section className="space-y-10 text-ink-soft leading-relaxed">
          <div>
            <h2 className="font-display text-xl text-ink mb-4">
              1. Responsable del tratamiento
            </h2>
            <ul className="space-y-2 text-sm">
              <li><strong className="text-ink">Identidad:</strong> Almudena Marchesi Fernández</li>
              <li><strong className="text-ink">NIF:</strong> 04850571D</li>
              <li><strong className="text-ink">Colegiación:</strong> Col. M-40804 (Colegio Oficial de Psicólogos de Madrid)</li>
              <li><strong className="text-ink">Titulación sanitaria:</strong> Psicología General Sanitaria (habilitación y ejercicio conforme a la normativa vigente y registro colegial).</li>
              <li><strong className="text-ink">Dirección:</strong> Calle de Meléndez Valdés 22, 1D, 28015 Madrid</li>
              <li>
                <strong className="text-ink">Contacto:</strong>{' '}
                <a className="text-sage underline underline-offset-2" href={`mailto:${CLINIC_CONTACT_EMAIL}`}>
                  {CLINIC_CONTACT_EMAIL}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-xl text-ink mb-4">
              2. Datos personales que recogemos
            </h2>
            <p className="mb-3">
              Recogemos los datos estrictamente necesarios para la prestación del servicio y la gestión
              del consultorio, a través del registro en el portal, la reserva de citas, la mensajería
              y la relación terapéutica:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li><strong className="text-ink">Datos identificativos:</strong> nombre, apellidos, DNI/NIE, fecha de nacimiento.</li>
              <li><strong className="text-ink">Datos de contacto:</strong> correo electrónico, teléfono, dirección postal, contacto de emergencia.</li>
              <li><strong className="text-ink">Datos de salud (categoría especial art. 9 RGPD):</strong> motivo de consulta, experiencia previa en terapia, medicación psiquiátrica, alergias, información clínica relevante para el proceso terapéutico, notas de sesión, diagnósticos e informes psicológicos.</li>
              <li><strong className="text-ink">Datos económicos y de facturación:</strong> datos necesarios para emitir facturas (importes, fechas, método de pago) y cumplir obligaciones tributarias. Los datos completos de tarjeta bancaria son procesados exclusivamente por Stripe y nunca se almacenan en la plataforma.</li>
              <li><strong className="text-ink">Datos de mensajería:</strong> mensajes enviados a través del chat del portal, incluyendo texto y archivos adjuntos.</li>
              <li><strong className="text-ink">Datos técnicos:</strong> identificadores de sesión, registros de auditoría de acceso a datos sensibles, dirección IP de origen cuando resulte imprescindible para prevenir abusos o incidentes de seguridad.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-xl text-ink mb-4">
              3. Finalidad del tratamiento
            </h2>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>Prestación del servicio de psicología clínica y sanitaria.</li>
              <li>Gestión de citas (reserva, confirmación, cancelación, recordatorios automáticos por email), comunicación clínica y seguimiento asistencial.</li>
              <li>Facturación, cobro mediante pasarela de pago y cumplimiento de obligaciones contables y fiscales.</li>
              <li>Gestión de bonos de sesiones (compra, consumo, expiración).</li>
              <li>Comunicación profesional a través del sistema de mensajería del portal.</li>
              <li>Asignación y acceso a recursos terapéuticos (documentos, audios, vídeos).</li>
              <li>Cumplimiento de obligaciones legales en materia sanitaria y de documentación clínica.</li>
              <li>Seguridad de la plataforma digital: registro de accesos a datos sensibles, trazabilidad de operaciones y prevención de accesos no autorizados.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-xl text-ink mb-4">
              4. Base legal del tratamiento
            </h2>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li><strong className="text-ink">Ejecución contractual</strong> (art. 6.1.b RGPD): gestión de la relación profesional, reserva de citas, pagos y comunicaciones.</li>
              <li><strong className="text-ink">Obligación legal</strong> (art. 6.1.c RGPD): conservación de documentación clínica conforme a la Ley 41/2002, normativa autonómica y obligaciones tributarias.</li>
              <li><strong className="text-ink">Datos de salud</strong> (art. 9.2.h RGPD): tratamiento necesario para la prestación de asistencia sanitaria y gestión de servicios sanitarios, con <strong className="text-ink">consentimiento explícito</strong> del paciente recabado durante el proceso de registro.</li>
              <li><strong className="text-ink">Interés legítimo</strong> (art. 6.1.f RGPD): seguridad de la información, prevención de fraude y trazabilidad de accesos a datos sensibles.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-xl text-ink mb-4">
              5. Conservación de los datos
            </h2>
            <p>
              Los datos clínicos se conservarán durante los plazos establecidos por la Ley 41/2002 y normativa
              autonómica de desarrollo (como mínimo cinco años desde que finalice cada acto asistencial, salvo
              que una norma específica exija otro periodo). Los datos de facturación se conservarán durante los
              plazos legales exigidos por la normativa fiscal (ordinariamente cuatro años). Los mensajes del
              chat se conservan cifrados durante la vigencia de la relación terapéutica. Los registros de
              auditoría de seguridad se conservan durante el tiempo necesario para acreditación ante incidentes.
            </p>
            <p className="mt-3">
              Finalizada la relación y transcurridos los plazos legales, los datos serán anonimizados
              de forma irreversible o suprimidos de manera segura.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl text-ink mb-4">
              6. Medidas de seguridad
            </h2>
            <p className="mb-3">
              Se aplican medidas técnicas y organizativas adecuadas al riesgo que supone el tratamiento
              de datos de salud, incluyendo:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li><strong className="text-ink">Cifrado en reposo:</strong> los datos sensibles (DNI, nombre, teléfono, dirección, notas clínicas, diagnósticos, medicación, mensajes) se almacenan cifrados con AES-256-GCM. La clave de cifrado se gestiona mediante un sistema de bóveda segura (vault), no en el código fuente.</li>
              <li><strong className="text-ink">Cifrado en tránsito:</strong> toda la comunicación entre el navegador y la plataforma se realiza mediante HTTPS/TLS.</li>
              <li><strong className="text-ink">Control de acceso:</strong> autenticación con contraseña robusta (mínimo 12 caracteres), verificación por código OTP, verificación en dos pasos (MFA) disponible para administración. Cada paciente solo puede acceder a sus propios datos mediante políticas de seguridad a nivel de base de datos (Row Level Security).</li>
              <li><strong className="text-ink">Restricción geográfica:</strong> el acceso se limita a conexiones desde España, Portugal y Andorra.</li>
              <li><strong className="text-ink">Auditoría:</strong> cada acceso a un dato sensible queda registrado con identificación del usuario, fecha, hora y campo consultado, mediante un sistema resistente a la manipulación (hash-chain).</li>
              <li><strong className="text-ink">Protección anti-captura:</strong> los datos clínicos se protegen contra capturas de pantalla e impresión no autorizadas mediante medidas de ofuscación en la interfaz.</li>
              <li><strong className="text-ink">Validación de archivos:</strong> todos los archivos subidos se verifican mediante firma binaria (magic bytes) para prevenir inyección de archivos maliciosos.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-xl text-ink mb-4">
              7. Derechos del interesado
            </h2>
            <p className="mb-3">Conforme al RGPD, usted puede ejercer:</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li><strong className="text-ink">Acceso</strong> a sus datos personales.</li>
              <li><strong className="text-ink">Rectificación</strong> de datos inexactos.</li>
              <li><strong className="text-ink">Supresión</strong> cuando proceda, sin perjuicio de los plazos legales de conservación clínica y fiscal.</li>
              <li><strong className="text-ink">Limitación</strong> del tratamiento en los supuestos legalmente previstos.</li>
              <li><strong className="text-ink">Portabilidad</strong> cuando el tratamiento se base en consentimiento o contrato y sea técnicamente viable.</li>
              <li><strong className="text-ink">Oposición</strong> cuando corresponda.</li>
            </ul>
            <p className="mt-3">
              Puede ejercer sus derechos dirigiendo un correo a{' '}
              <strong className="text-ink">{CLINIC_CONTACT_EMAIL}</strong> indicando la petición y acreditando
              su identidad. Se responderá en los plazos legales (máximo un mes). Adicionalmente, el portal
              del paciente incluye una sección de <strong className="text-ink">Ajustes</strong> desde la
              que puede gestionar sus preferencias de notificaciones y solicitar el ejercicio de derechos
              RGPD de forma digital.
            </p>
            <p className="mt-3">
              Si no queda satisfecho, puede presentar reclamación ante la{' '}
              <strong className="text-ink">Agencia Española de Protección de Datos (AEPD)</strong>,{' '}
              <a
                href="https://www.aepd.es"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sage underline underline-offset-2"
              >
                www.aepd.es
              </a>.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl text-ink mb-4">
              8. Cesiones, comunicaciones y transferencias
            </h2>
            <p className="mb-3">
              No cederemos sus datos a terceros salvo obligación legal, necesidad derivada del encargo de
              tratamiento a proveedores que actúen bajo instrucciones (art. 28 RGPD), o consentimiento cuando
              la base jurídica lo exija.
            </p>
            <p>
              Cuando algún proveedor tecnológico esté ubicado fuera del Espacio Económico Europeo, se aplicarán
              las garantías previstas en el Capítulo V del RGPD (decisiones de adecuación, cláusulas tipo u
              otras medidas válidas).
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl text-ink mb-4">
              9. Encargados del tratamiento (proveedores tecnológicos)
            </h2>
            <p className="mb-3">
              Para el funcionamiento de la plataforma intervienen los siguientes proveedores,
              que tratan datos por cuenta del responsable en virtud de contrato de encargo:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li><strong className="text-ink">Supabase (región eu-central-1, Alemania):</strong> base de datos, autenticación, almacenamiento de archivos y funciones de servidor. Los datos clínicos se almacenan cifrados en esta infraestructura dentro de la Unión Europea.</li>
              <li><strong className="text-ink">Vercel (región fra1, Frankfurt, Alemania):</strong> alojamiento y despliegue de la aplicación web.</li>
              <li><strong className="text-ink">Stripe:</strong> pasarela de pago certificada PCI DSS para procesamiento de cobros. Los datos de tarjeta son tratados exclusivamente por Stripe.</li>
              <li><strong className="text-ink">Resend:</strong> envío de correos transaccionales (confirmaciones de cita, recordatorios, bienvenida).</li>
              <li><strong className="text-ink">Sentry (región UE):</strong> monitorización de errores técnicos con eliminación automática de datos personales antes del envío (scrubbing de PII).</li>
            </ul>
            <p className="mt-3">
              La lista de subencargados puede actualizarse; puede solicitar información adicional
              mediante el correo de contacto indicado.
            </p>
          </div>

          <div className="pt-8 border-t border-line">
            <p className="font-mono text-label-sm text-sage-mid">
              Versión {LEGAL_DOCUMENT_VERSION} · Última actualización: {LEGAL_LAST_UPDATED_ES}
            </p>
          </div>
        </section>
      </article>
    </div>
  );
}
