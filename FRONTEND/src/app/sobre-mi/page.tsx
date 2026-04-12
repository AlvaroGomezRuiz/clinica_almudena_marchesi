import Image from 'next/image';

import { CLINIC_ADDRESS } from '@/lib/clinic';

export default function SobreMiPage() {
  return (
    <div className="bg-background text-on-surface selection:bg-primary-container selection:text-on-primary-container">
      <main className="pt-32 pb-24 overflow-x-hidden">
        {/* Hero Section: Editorial Intro */}
        <section className="max-w-screen-2xl mx-auto px-12 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center mb-32">
          <div className="lg:col-span-5 space-y-8">
            <p className="text-primary font-label tracking-[0.2em] text-xs uppercase">
              Psicología Clínica
            </p>
            <h1 className="text-6xl lg:text-7xl text-on-surface leading-[1.1] tracking-tight">
              Tu acompañante en el{' '}
              <span className="italic text-primary">camino</span> del cambio.
            </h1>
            <p className="text-lg text-on-surface-variant leading-relaxed font-body max-w-lg">
              Licenciada en Psicología con una profunda vocación por el
              bienestar humano. Mi consulta en el corazón de Moncloa es un
              espacio seguro diseñado para la introspección y el crecimiento
              personal.
            </p>
          </div>
          <div className="lg:col-span-7 relative">
            <div className="aspect-[4/5] md:aspect-[16/10] overflow-hidden rounded-xl shadow-xl relative z-10">
              <Image
                alt="Professional portrait of Almudena Marchesi in a brightly lit, serene therapy room with soft warm tones and wooden details"
                className="w-full h-full object-cover"
                data-alt="Professional portrait of Almudena Marchesi in a brightly lit, serene therapy room with soft warm tones and wooden details"
                fill
                priority
                sizes="(min-width: 1024px) 60vw, 100vw"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDn_0SLcoW4tb7uIeQTJCjkX3_d9oPmSlmszCmaIuoJHAcVme8rKZQJXJl5oC8H9f5csc8RM3GqFa_4bEHsSs-g5ly3cruiFsgk6eif8TtjrSHYGW__hKeS2wu31uIUBa902v7g3gRbQw7ShPPZYykWaDzT77tu2Jnbr9jDq3UPU1Bf6kRjCYNGWjv-8A0mquWSnm1ESxKld-YYCB2RfWxSg8jusG9V4K2KqJgbRgyg8BvilZYllei3FSNAzRXmYdUVkmqCoKrnJr4"
              />
            </div>
            <div className="absolute -bottom-8 -right-8 w-48 h-48 bg-secondary-container/30 rounded-full blur-3xl -z-10"></div>
          </div>
        </section>

        {/* Philosophy Section: Asymmetric Layout */}
        <section className="bg-surface-container-low py-32 mb-32">
          <div className="max-w-screen-2xl mx-auto px-12 grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
            <div className="order-2 lg:order-1 relative flex justify-center">
              <div className="grid grid-cols-2 gap-4 w-full">
                <div className="pt-12">
                  <Image
                    alt="Detail of a cozy reading corner in a Madrid therapy office with a comfortable armchair and soft morning light through a large window"
                    className="w-full aspect-[3/4] object-cover rounded-xl shadow-lg"
                    data-alt="Detail of a cozy reading corner in a Madrid therapy office with a comfortable armchair and soft morning light through a large window"
                    height={800}
                    sizes="(min-width: 1024px) 25vw, 50vw"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuC9MgPaCTLFDcgHLjA6yzpSMOReupNlnRGhVVJ3HJDdCYIwA5cQpkDA1ym9KX0WE40KmVjxMUYqB62DsUfKE0j0VxsXF9tpBVIKXOpOLA5E-6YvWKLwjRo93QDDLj0z6W5-K1UWeA3O5G-MoqRIGhVqqxlfmAN4-AORUbJ0occga-nFMZnz9aljJUMfIX9wKswKjxS2lNSgnmmm9rq-4F4H4c1An2WHMxfwqqOugwNmhQ3Q0eIK7aJAepczhFLIKyzXpuj26lKH0QA"
                    width={600}
                  />
                </div>
                <div>
                  <Image
                    alt="A collection of psychology books and a small plant on a light wood shelf, representing academic knowledge and life"
                    className="w-full aspect-[3/4] object-cover rounded-xl shadow-lg"
                    data-alt="A collection of psychology books and a small plant on a light wood shelf, representing academic knowledge and life"
                    height={800}
                    sizes="(min-width: 1024px) 25vw, 50vw"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBvMvJ-_A6rFrfY6EsMMkcpEp0HmL2KMbxapK0vedI2vvDJgPQnV5Or5GQqA_EfGyDMKc_yhcl3__J7OHPxQlpOozQFmxzNza-H_jiRcEvcFj1eHUZJHaAnD9MKlcQbkNzuHP-BwM7xfbs0g_mj26CoKVWSopstKAIcSoJF45dMZyDSIdYJ4JQW3MtrjkXxK30Kty1t9ZfqO5vsE8fVw-U3JJaCTHLGr_329BUAmgtOLRAeaxYH2KXKzbVw8agqsx5yBkWy37cOafE"
                    width={600}
                  />
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2 space-y-8">
              <h2 className="text-4xl text-primary leading-tight">
                La Filosofía del Acompañamiento
              </h2>
              <div className="space-y-6 text-on-surface-variant text-lg leading-relaxed font-body">
                <p>
                  Entiendo la terapia no como un proceso directivo, sino como
                  una travesía compartida. Mi papel no es el de una experta
                  distante que da soluciones, sino el de una{' '}
                  <strong>compañera de viaje</strong> que aporta herramientas y
                  luz en los momentos de incertidumbre.
                </p>
                <p>
                  En mi consulta en Moncloa, Madrid, priorizo la autenticidad y
                  la calidez. Creo firmemente que el vínculo terapéutico es la
                  herramienta más poderosa para la sanación. Cada persona es un
                  universo único, y mi enfoque se adapta a la singularidad de tu
                  historia.
                </p>
              </div>
              <div className="pt-4">
                <span className="inline-block px-6 py-3 border border-primary/20 rounded-full text-primary font-medium italic">
                  &quot;El encuentro de dos personas es como el contacto de dos
                  sustancias químicas: si hay alguna reacción, ambas se
                  transforman.&quot;
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Credentials & Experience: Bento Style Grid */}
        <section className="max-w-screen-2xl mx-auto px-12 mb-32">
          <div className="mb-16 text-center">
            <h2 className="text-4xl mb-4">Formación y Experiencia</h2>
            <div className="w-16 h-1 bg-primary mx-auto opacity-20"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Academic Card */}
            <div className="bg-surface-container-lowest p-10 rounded-xl shadow-[0_4px_20px_rgba(75,100,95,0.04)] border border-outline-variant/10 group hover:translate-y-[-4px] transition-all duration-300">
              <div className="w-14 h-14 bg-primary-container rounded-full flex items-center justify-center mb-8 group-hover:bg-primary group-hover:text-on-primary transition-colors duration-300">
                <span className="material-symbols-outlined text-2xl">
                  school
                </span>
              </div>
              <h3 className="text-2xl mb-4">Grado Académico</h3>
              <p className="text-on-surface-variant font-body leading-relaxed mb-6">
                Licenciada en Psicología Clínica con especialización en enfoques
                integradores. Formación continua en las últimas corrientes
                terapéuticas.
              </p>
              <ul className="space-y-3 text-sm font-label text-on-surface-variant">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full" />{' '}
                  Universidad Complutense de Madrid
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full" />{' '}
                  Máster en Psicología General Sanitaria
                </li>
              </ul>
            </div>

            {/* Clinical Card */}
            <div className="bg-surface-container-lowest p-10 rounded-xl shadow-[0_4px_20px_rgba(75,100,95,0.04)] border border-outline-variant/10 group hover:translate-y-[-4px] transition-all duration-300">
              <div className="w-14 h-14 bg-secondary-container rounded-full flex items-center justify-center mb-8 group-hover:bg-secondary group-hover:text-on-secondary transition-colors duration-300">
                <span className="material-symbols-outlined text-2xl">
                  medical_services
                </span>
              </div>
              <h3 className="text-2xl mb-4">Recorrido Clínico</h3>
              <p className="text-on-surface-variant font-body leading-relaxed mb-6">
                Más de 10 años de experiencia acompañando a adultos y
                adolescentes en diversos contextos clínicos en la ciudad de
                Madrid.
              </p>
              <ul className="space-y-3 text-sm font-label text-on-surface-variant">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-secondary rounded-full" />{' '}
                  Práctica privada en Moncloa
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-secondary rounded-full" />{' '}
                  Colaboración en centros de salud mental
                </li>
              </ul>
            </div>

            {/* Methodology Card */}
            <div className="bg-surface-container-lowest p-10 rounded-xl shadow-[0_4px_20px_rgba(75,100,95,0.04)] border border-outline-variant/10 group hover:translate-y-[-4px] transition-all duration-300">
              <div className="w-14 h-14 bg-tertiary-container rounded-full flex items-center justify-center mb-8 group-hover:bg-tertiary group-hover:text-on-tertiary transition-colors duration-300">
                <span className="material-symbols-outlined text-2xl">
                  psychology
                </span>
              </div>
              <h3 className="text-2xl mb-4">Metodología</h3>
              <p className="text-on-surface-variant font-body leading-relaxed mb-6">
                Enfoque humanista integrador, combinando técnicas
                cognitivo-conductuales con terapias de tercera generación según
                las necesidades.
              </p>
              <ul className="space-y-3 text-sm font-label text-on-surface-variant">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-tertiary rounded-full" />{' '}
                  Terapia de Aceptación y Compromiso
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-tertiary rounded-full" />{' '}
                  Mindfulness aplicado a la clínica
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="max-w-4xl mx-auto px-12 text-center py-20 bg-primary-container/20 rounded-3xl mb-24">
          <h2 className="text-3xl mb-6">¿Comenzamos el camino?</h2>
          <p className="text-on-surface-variant text-lg mb-10 max-w-xl mx-auto">
            Si buscas un espacio donde sentirte escuchado y comprendido sin
            juicios, te invito a agendar una primera sesión informativa.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              className="bg-primary text-on-primary px-8 py-4 rounded-full font-medium shadow-lg hover:shadow-xl transition-all text-center"
              href="/registro-paciente"
            >
              Solicitar Cita
            </a>
            <a
              className="bg-surface-container-lowest text-primary px-8 py-4 rounded-full font-medium border border-primary/10 hover:bg-surface-bright transition-all text-center"
              href="/servicios"
            >
              Saber más sobre el proceso
            </a>
          </div>
        </section>
      </main>

      {/* Footer Component */}
      <footer className="bg-[#f4f4ef] w-full rounded-t-[5px]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 px-12 py-16 max-w-screen-2xl mx-auto">
          <div className="space-y-4">
            <span className="font-serif text-lg text-[#4b645f]">
              Almudena Marchesi
            </span>
            <p className="text-stone-500 text-sm leading-6 tracking-wide">
              Psicología Clínica y acompañamiento terapéutico en el distrito de
              Moncloa-Aravaca.
            </p>
          </div>
          <div className="flex flex-col space-y-3">
            <h4 className="font-medium text-[#6a5d4e] mb-2 uppercase text-[10px] tracking-widest">
              Legal &amp; Dirección
            </h4>
            <a
              className="text-stone-500 hover:text-[#4b645f] text-sm hover:translate-x-1 transition-transform duration-300"
              href="#"
            >
              Aviso Legal
            </a>
            <a
              className="text-stone-500 hover:text-[#4b645f] text-sm hover:translate-x-1 transition-transform duration-300"
              href="#"
            >
              Privacidad
            </a>
            <a
              className="text-stone-500 hover:text-[#4b645f] text-sm hover:translate-x-1 transition-transform duration-300"
              href="#"
            >
              Cookies
            </a>
            <span className="text-stone-500 text-sm mt-4 italic">
              {CLINIC_ADDRESS}
            </span>
          </div>
          <div className="flex flex-col space-y-4">
            <h4 className="font-medium text-[#6a5d4e] mb-2 uppercase text-[10px] tracking-widest">
              Contacto
            </h4>
            <p className="text-stone-500 text-sm">
              ¿Tienes alguna duda o quieres concertar una cita?
            </p>
            <a
              className="text-[#4b645f] font-medium hover:underline transition-all"
              href="mailto:info@almudenamarchesi.com"
            >
              info@almudenamarchesi.com
            </a>
            <p className="text-stone-500 text-sm">
              © 2024 Almudena Marchesi Fernández. Psicología Clínica Moncloa,
              Madrid.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
