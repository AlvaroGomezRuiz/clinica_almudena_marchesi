import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Cookies — Almudena Marchesi Fernández, Psicóloga',
  description:
    'Información sobre las cookies utilizadas en el sitio web de Almudena Marchesi Fernández, psicóloga sanitaria en Madrid.',
};

export default function CookiesPage() {
  return (
    <div className="bg-canvas min-h-screen pt-36 pb-24 px-6 md:px-12">
      <article className="max-w-3xl mx-auto prose-clinical">
        <header className="mb-14">
          <span className="font-mono text-label-sm uppercase tracking-[0.14em] text-sage-mid mb-4 block">
            Cumplimiento LSSI-CE
          </span>
          <h1 className="font-display text-display-1 text-ink italic mb-4 text-balance">
            Política de Cookies
          </h1>
          <p className="text-body-lg text-ink-soft leading-relaxed">
            Este sitio web utiliza cookies estrictamente necesarias para el
            funcionamiento del servicio. No se utilizan cookies de rastreo,
            publicitarias ni de terceros analíticos.
          </p>
        </header>

        <section className="space-y-10 text-ink-soft leading-relaxed">
          <div>
            <h2 className="font-display text-xl text-ink mb-4">
              1. ¿Qué son las cookies?
            </h2>
            <p>
              Las cookies son pequeños archivos de texto que se almacenan en su
              dispositivo cuando visita un sitio web. Permiten que el sitio
              recuerde información sobre su visita, como su idioma de preferencia
              o su estado de autenticación, facilitando la navegación y haciéndola
              más eficiente.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl text-ink mb-4">
              2. Cookies que utilizamos
            </h2>
            <p className="mb-4">
              Este sitio web utiliza exclusivamente cookies{' '}
              <strong className="text-ink">técnicas y de sesión</strong>,
              necesarias para el funcionamiento del portal de pacientes:
            </p>

            <div className="overflow-x-auto rounded-apple border border-line">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-canvas-alt border-b border-line">
                    <th className="text-left px-4 py-3 font-mono text-label-sm uppercase tracking-wider text-sage-mid font-medium">
                      Cookie
                    </th>
                    <th className="text-left px-4 py-3 font-mono text-label-sm uppercase tracking-wider text-sage-mid font-medium">
                      Tipo
                    </th>
                    <th className="text-left px-4 py-3 font-mono text-label-sm uppercase tracking-wider text-sage-mid font-medium">
                      Duración
                    </th>
                    <th className="text-left px-4 py-3 font-mono text-label-sm uppercase tracking-wider text-sage-mid font-medium">
                      Finalidad
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  <tr>
                    <td className="px-4 py-3 font-mono text-xs text-ink">
                      auth_token
                    </td>
                    <td className="px-4 py-3">Técnica</td>
                    <td className="px-4 py-3">Sesión / 30 días</td>
                    <td className="px-4 py-3">
                      Autenticación del usuario. Token JWT cifrado con HttpOnly,
                      Secure y SameSite=Strict.
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono text-xs text-ink">
                      __next
                    </td>
                    <td className="px-4 py-3">Técnica</td>
                    <td className="px-4 py-3">Sesión</td>
                    <td className="px-4 py-3">
                      Cookie interna del framework Next.js para la gestión de la
                      navegación y la hidratación del lado del cliente.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 className="font-display text-xl text-ink mb-4">
              3. Cookies de terceros
            </h2>
            <p>
              Este sitio web{' '}
              <strong className="text-ink">no utiliza cookies de terceros</strong>.
              No se emplean servicios de analítica (Google Analytics, etc.), redes
              publicitarias, ni píxeles de seguimiento. Su navegación en este sitio
              no es rastreada ni compartida con terceros.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl text-ink mb-4">
              4. Gestión de cookies
            </h2>
            <p>
              Puede configurar su navegador para rechazar todas las cookies o para
              que le avise cuando se envía una cookie. Sin embargo, si rechaza las
              cookies técnicas, no podrá acceder al portal de pacientes, ya que la
              cookie de autenticación es necesaria para mantener su sesión activa
              de forma segura.
            </p>
            <p className="mt-3">
              Puede obtener más información sobre cómo gestionar cookies en su
              navegador consultando la ayuda del mismo:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-sm mt-2">
              <li>
                <a
                  href="https://support.google.com/chrome/answer/95647"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sage underline underline-offset-2"
                >
                  Google Chrome
                </a>
              </li>
              <li>
                <a
                  href="https://support.mozilla.org/es/kb/Borrar%20cookies"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sage underline underline-offset-2"
                >
                  Mozilla Firefox
                </a>
              </li>
              <li>
                <a
                  href="https://support.apple.com/es-es/guide/safari/sfri11471/mac"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sage underline underline-offset-2"
                >
                  Apple Safari
                </a>
              </li>
              <li>
                <a
                  href="https://support.microsoft.com/es-es/microsoft-edge/eliminar-cookies-en-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sage underline underline-offset-2"
                >
                  Microsoft Edge
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-xl text-ink mb-4">5. Contacto</h2>
            <p>
              Para cualquier consulta sobre esta política de cookies, puede
              contactar con Almudena Marchesi Fernández en{' '}
              <strong className="text-ink">contacto@almudenamarche.si</strong>.
            </p>
          </div>

          <div className="pt-8 border-t border-line">
            <p className="font-mono text-label-sm text-sage-mid">
              Última actualización: 19 de abril de 2026
            </p>
          </div>
        </section>
      </article>
    </div>
  );
}

