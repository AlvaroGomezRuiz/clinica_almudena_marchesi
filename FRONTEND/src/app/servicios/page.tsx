import type { Metadata } from 'next';
import Link from 'next/link';
import ScrollReveal from '@/components/public/ScrollReveal';
import CTASection from '@/app/sections/CTASection';
import {
  CLINIC_SESSION_DURATION_MIN,
  CLINIC_SESSION_PRICE_LABEL,
} from '@/lib/clinic';

export const metadata: Metadata = {
  title: 'Servicios | Almudena Marchesi — Psicología Clínica',
  description:
    'Terapia individual, de pareja, infanto-juvenil y online. Consulta tarifas y bonos para tu proceso terapéutico en Moncloa, Madrid.',
};

const SERVICES = [
  {
    tag: 'Adultos',
    title: 'Terapia Individual',
    body: 'Un espacio seguro para profundizar en el autoconocimiento, gestionar la ansiedad, el duelo o las dificultades relacionales desde un enfoque clínico integrador.',
    price: CLINIC_SESSION_PRICE_LABEL,
    duration: `${CLINIC_SESSION_DURATION_MIN}min`,
    href: '/registro-paciente?plan=individual',
    cta: 'Reservar Cita',
    featured: true,
  },
  {
    tag: 'Relaciones',
    title: 'Terapia de Pareja',
    body: 'Restaurar la comunicación y el vínculo, navegando los conflictos desde la empatía y la responsabilidad compartida.',
    price: '90€',
    duration: '90min',
    href: '/registro-paciente?plan=pareja',
    cta: 'Consultar disponibilidad',
    featured: false,
  },
  {
    tag: 'Infancia',
    title: 'Infanto-Juvenil',
    body: 'Acompañamiento en el desarrollo emocional de niños y adolescentes. Orientación a padres y trabajo terapéutico mediante el juego y la expresión creativa.',
    price: CLINIC_SESSION_PRICE_LABEL,
    duration: `${CLINIC_SESSION_DURATION_MIN}min`,
    href: '/registro-paciente?plan=individual',
    cta: 'Pedir información',
    featured: false,
  },
  {
    tag: 'Online',
    title: 'Terapia Online',
    body: 'La misma calidad clínica desde la comodidad de tu hogar. Ideal para personas con movilidad reducida o falta de tiempo.',
    price: CLINIC_SESSION_PRICE_LABEL,
    duration: 'Plataforma cifrada',
    href: '/registro-paciente?plan=individual',
    cta: 'Agendar Online',
    featured: false,
  },
] as const;

const BONOS = [
  {
    name: 'Bono 5 Sesiones',
    label: 'Continuidad',
    price: '275€',
    savings: 'Ahorra 25€',
    validity: 'Válido durante 4 meses',
    href: '/registro-paciente?plan=bono5',
  },
  {
    name: 'Bono 10 Sesiones',
    label: 'Transformación',
    price: '530€',
    savings: 'Ahorra 70€',
    validity: 'Válido durante 8 meses',
    href: '/registro-paciente?plan=bono10',
  },
] as const;

export default function ServiciosPage() {
  return (
    <div className="bg-canvas overflow-x-hidden">
      {/* Hero */}
      <section className="pt-32 pb-16 md:pt-40 md:pb-24 px-6 md:px-12">
        <div className="max-w-screen-xl mx-auto">
          <ScrollReveal>
            <span className="font-mono text-label-sm uppercase tracking-[0.14em] text-sage-mid mb-5 block">
              Servicios
            </span>
          </ScrollReveal>
          <ScrollReveal delay={0.08}>
            <h1 className="font-display text-display-1 text-ink max-w-4xl text-balance mb-6">
              Un espacio a{' '}
              <span className="italic">medida</span>{' '}
              de tu proceso.
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={0.16}>
            <p className="text-body-lg text-ink-soft max-w-2xl leading-relaxed text-pretty">
              Cada proceso es único. Ofrezco diferentes modalidades de terapia
              adaptadas a tus necesidades actuales, con el rigor clínico y la
              calidez que tu bienestar requiere.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Services Grid */}
      <section className="pb-20 md:pb-32 px-6 md:px-12">
        <div className="max-w-screen-xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6">
          {SERVICES.map((service, i) => (
            <ScrollReveal
              key={service.title}
              delay={i * 0.06}
              className={i === 0 ? 'md:col-span-7' : i === 1 ? 'md:col-span-5' : 'md:col-span-6'}
            >
              <article
                className={`glass-card dark:glass-card-dark h-full flex flex-col justify-between group p-8 md:p-10 ${
                  service.featured ? 'ring-1 ring-sage/15 dark:ring-sage/30' : ''
                }`}
              >
                <div>
                  <span className="inline-block font-mono text-label-sm uppercase tracking-[0.1em] text-sage bg-sage-wash px-3 py-1 rounded-pill mb-5">
                    {service.tag}
                  </span>
                  <h2 className="font-display text-display-3 text-ink mb-3">
                    {service.title}
                  </h2>
                  <p className="text-ink-soft leading-relaxed font-body text-[0.92rem] mb-6">
                    {service.body}
                  </p>
                </div>
                <div className="flex items-end justify-between gap-4 pt-4 border-t border-line">
                  <div>
                    <span className="font-display text-3xl text-ink font-light">{service.price}</span>
                    <span className="text-ink-muted text-sm ml-1 font-body">/{service.duration}</span>
                  </div>
                  <Link
                    href={service.href}
                    className="font-body text-sm font-medium text-sage flex items-center gap-1.5 group/link hover:gap-2.5 transition-all duration-300"
                  >
                    {service.cta}
                    <span className="material-symbols-outlined text-lg transition-transform group-hover/link:translate-x-0.5">
                      arrow_forward
                    </span>
                  </Link>
                </div>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* Bonos */}
      <section className="py-24 md:py-36 px-6 md:px-12 bg-canvas-sage dark:bg-canvas-alt relative overflow-hidden transition-colors duration-500">
        <div className="max-w-screen-xl mx-auto relative z-10">
          <ScrollReveal className="text-center mb-14">
            <span className="font-mono text-label-sm uppercase tracking-[0.14em] text-sage-mid mb-4 block">
              Bonos
            </span>
            <h2 className="font-display text-display-2 text-ink mb-4 text-balance">
              Compromiso con tu Bienestar
            </h2>
            <p className="text-ink-soft max-w-xl mx-auto text-pretty">
              Los procesos terapéuticos requieren constancia. He diseñado
              bonos con tarifas reducidas para facilitar la continuidad.
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {BONOS.map((bono, i) => (
              <ScrollReveal key={bono.name} delay={i * 0.1}>
                <div
                  className="glass-card dark:glass-card-dark h-full flex flex-col items-center text-center p-8 md:p-10 transition-all duration-500"
                >
                  <span className="font-mono text-label-sm uppercase tracking-widest text-sage-mid mb-3">
                    {bono.label}
                  </span>
                  <h3 className="font-display text-display-3 text-ink mb-4">{bono.name}</h3>
                  <div className="mb-4">
                    <span className="font-display text-5xl text-ink font-light">{bono.price}</span>
                    <p className="text-sage font-body font-medium text-sm mt-1">{bono.savings}</p>
                  </div>
                  <p className="text-ink-muted text-sm mb-6 font-body">
                    {bono.validity}. Aplicable a Terapia Individual y Online.
                  </p>
                  <Link href={bono.href} className="btn-primary w-full text-center">
                    Adquirir {bono.name.split(' ').pop()}
                  </Link>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>

        {/* Ambient blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-sage/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none" aria-hidden="true" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-warm/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 pointer-events-none" aria-hidden="true" />
      </section>

      {/* FAQ-ish guidance */}
      <section className="py-20 md:py-28 px-6 md:px-12">
        <div className="max-w-screen-xl mx-auto text-center">
          <ScrollReveal>
            <h2 className="font-display text-display-3 text-ink mb-4 italic">
              ¿No sabes qué modalidad es la mejor para ti?
            </h2>
            <p className="text-ink-soft mb-8 max-w-lg mx-auto text-pretty">
              Escríbeme sin compromiso y valoraremos juntos tu caso para encontrar
              el camino que mejor se adapte a tu situación.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contacto" className="btn-primary text-center">
                Contactar ahora
              </Link>
              <Link href="/sobre-mi" className="btn-secondary text-center">
                Conocer más sobre mí
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <CTASection />
    </div>
  );
}
