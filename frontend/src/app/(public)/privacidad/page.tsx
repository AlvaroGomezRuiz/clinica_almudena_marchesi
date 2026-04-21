import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Privacidad — Almudena Marchesi Fernández, Psicóloga',
  description:
    'Política de privacidad y protección de datos personales y de salud conforme al RGPD (UE) 2016/679 y la Ley 41/2002 de Autonomía del Paciente.',
};

export default function PrivacidadPage() {
  return (
    <div className="bg-canvas min-h-screen pt-36 pb-24 px-6 md:px-12">
      <article className="max-w-3xl mx-auto prose-clinical">
        <header className="mb-14">
          <span className="font-mono text-label-sm uppercase tracking-[0.14em] text-sage-mid mb-4 block">
            RGPD &middot; Ley 41/2002
          </span>
          <h1 className="font-display text-display-1 text-ink italic mb-4 text-balance">
            Política de Privacidad
          </h1>
          <p className="text-body-lg text-ink-soft leading-relaxed">
            Su privacidad es una prioridad clínica. Este documento explica cómo se
            recogen, tratan y protegen sus datos personales y de salud.
          </p>
        </header>

        <section className="space-y-10 text-ink-soft leading-relaxed">
          <div>
            <h2 className="font-display text-xl text-ink mb-4">
              1. Responsable del tratamiento
            </h2>
            <ul className="space-y-2 text-sm">
              <li>
                <strong className="text-ink">Identidad:</strong> Almudena Marchesi
                Fernández
              </li>
              <li>
                <strong className="text-ink">Colegiación:</strong> Col. M-40804
                (Colegio Oficial de Psicólogos de Madrid)
              </li>
              <li>
                <strong className="text-ink">Dirección:</strong> Calle de Meléndez
                Valdés 22, 1D, 28015 Madrid
              </li>
              <li>
                <strong className="text-ink">Contacto:</strong>{' '}
                contacto@almudenamarche.si
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-xl text-ink mb-4">
              2. Datos personales que recogemos
            </h2>
            <p className="mb-3">
              Recogemos los datos estrictamente necesarios para la prestación del
              servicio terapéutico:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>
                <strong className="text-ink">Datos identificativos:</strong> nombre,
                apellidos, DNI/NIE, fecha de nacimiento.
              </li>
              <li>
                <strong className="text-ink">Datos de contacto:</strong> correo
                electrónico, teléfono.
              </li>
              <li>
                <strong className="text-ink">Datos de salud (categoría especial):</strong>{' '}
                motivo de consulta, historial clínico, notas de sesión, informes
                psicológicos.
              </li>
              <li>
                <strong className="text-ink">Datos técnicos:</strong> dirección IP,
                huella de dispositivo (hash), agente de usuario (anonimizado).
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-xl text-ink mb-4">
              3. Finalidad del tratamiento
            </h2>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>Prestación del servicio de psicología clínica y sanitaria.</li>
              <li>Gestión de citas, facturación y comunicación con el paciente.</li>
              <li>
                Cumplimiento de obligaciones legales (Ley 41/2002, Ley General de
                Sanidad, RGPD).
              </li>
              <li>
                Mantenimiento de la seguridad de la plataforma digital mediante
                auditoría de accesos.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-xl text-ink mb-4">
              4. Base legal del tratamiento
            </h2>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>
                <strong className="text-ink">Consentimiento explícito</strong> (Art.
                6.1.a y 9.2.a del RGPD) para el tratamiento de datos de salud.
              </li>
              <li>
                <strong className="text-ink">Ejecución de contrato</strong> (Art.
                6.1.b del RGPD) para la prestación del servicio terapéutico.
              </li>
              <li>
                <strong className="text-ink">Obligación legal</strong> (Art. 6.1.c
                del RGPD) para el cumplimiento de la Ley 41/2002 de Autonomía del
                Paciente.
              </li>
              <li>
                <strong className="text-ink">Interés legítimo</strong> (Art. 6.1.f
                del RGPD) para la seguridad de la plataforma y prevención de accesos
                no autorizados.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-xl text-ink mb-4">
              5. Conservación de los datos
            </h2>
            <p>
              Los datos de salud se conservarán durante un mínimo de{' '}
              <strong className="text-ink">5 años</strong> desde la última asistencia
              del paciente, conforme al artículo 17.1 de la Ley 41/2002. Los datos
              de facturación se conservarán durante el plazo legal exigido por la
              normativa fiscal (4 años). Los datos técnicos de auditoría se
              conservarán durante 2 años.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl text-ink mb-4">
              6. Medidas de seguridad
            </h2>
            <p className="mb-3">
              Los datos se protegen mediante las siguientes medidas técnicas y
              organizativas:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>Cifrado AES-256 (Fernet) de todos los datos de salud en reposo.</li>
              <li>Transmisión cifrada mediante TLS 1.3.</li>
              <li>
                Auditoría inmutable con cadena de integridad SHA-256 para todos los
                accesos.
              </li>
              <li>
                Sistema de desenfoque automático (&ldquo;Modo Pánico&rdquo;) ante pérdida de foco
                de la ventana.
              </li>
              <li>
                Cierre de sesión automático por inactividad (1 hora para pacientes, 8
                horas para administradores).
              </li>
              <li>Bloqueo de impresión de datos clínicos sensibles.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-xl text-ink mb-4">
              7. Derechos del interesado
            </h2>
            <p className="mb-3">Conforme al RGPD, usted tiene derecho a:</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>
                <strong className="text-ink">Acceso:</strong> Conocer qué datos personales tratamos
                sobre usted.
              </li>
              <li>
                <strong className="text-ink">Rectificación:</strong> Solicitar la corrección de datos
                inexactos.
              </li>
              <li>
                <strong className="text-ink">Supresión:</strong> Solicitar la eliminación de sus datos cuando ya
                no sean necesarios (con las limitaciones legales del Art. 17.1 de la Ley 41/2002).
              </li>
              <li>
                <strong className="text-ink">Limitación:</strong> Solicitar la limitación del tratamiento en
                determinadas circunstancias.
              </li>
              <li>
                <strong className="text-ink">Portabilidad:</strong> Recibir sus datos en un formato estructurado
                y de uso común.
              </li>
              <li>
                <strong className="text-ink">Oposición:</strong> Oponerse al tratamiento de sus datos.
              </li>
            </ul>
            <p className="mt-3">
              Para ejercer estos derechos, contacte con la responsable del tratamiento en{' '}
              <strong className="text-ink">contacto@almudenamarche.si</strong>. Se responderá en un plazo máximo
              de 30 días. Si considera que sus derechos no han sido debidamente atendidos, puede presentar una
              reclamación ante la{' '}
              <strong className="text-ink">Agencia Española de Protección de Datos (AEPD)</strong>, con sede en
              C/ Jorge Juan 6, 28001 Madrid (
              <a
                href="https://www.aepd.es"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sage underline underline-offset-2"
              >
                www.aepd.es
              </a>
              ).
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl text-ink mb-4">
              8. Cesiones y transferencias internacionales
            </h2>
            <p>
              Sus datos no serán cedidos a terceros salvo obligación legal. No se realizan transferencias
              internacionales de datos fuera del Espacio Económico Europeo. El alojamiento de los datos se
              realiza en servidores ubicados dentro de la Unión Europea.
            </p>
          </div>

          <div className="pt-8 border-t border-line">
            <p className="font-mono text-label-sm text-sage-mid">
              Versión: 2026-04-19-v1 &middot; Última actualización: 19 de abril de 2026
            </p>
          </div>
        </section>
      </article>
    </div>
  );
}

