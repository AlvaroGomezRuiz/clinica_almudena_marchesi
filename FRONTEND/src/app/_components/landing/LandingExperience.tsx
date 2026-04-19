"use client";

import Link from "next/link";
import { ReactLenis } from "@studio-freight/react-lenis";
import { motion, useReducedMotion } from "framer-motion";
import Script from "next/script";

import TiltCard from "./TiltCard";
import WordReveal from "./WordReveal";
import { sectionReveal, staggerChildren } from "./motion";

type LandingCopy = {
  nav: {
    brand: string;
    items: Array<{ href: string; label: string }>;
    portalButton: string;
  };
  hero: {
    badge: string;
    imageAlt: string;
    imageSrc: string;
    description: string;
    primaryCta: string;
    secondaryCta: string;
  };
  enfoque: {
    titleLine1: string;
    titleLine2: string;
    cards: Array<{ icon: string; title: string; body: string }>;
  };
  moncloa: {
    eyebrow: string;
    place: string;
    title: string;
    body: string;
    imageAlt: string;
    imageSrc: string;
    bullets: string[];
    cta: string;
  };
  portal: {
    title: string;
    body: string;
    markers: string[];
    steps: Array<{ number: string; title: string; body: string }>;
    infoTitle: string;
    infoBody: string;
    primaryCta: string;
    compliance: string;
  };
  finalCta: {
    title: string;
    body: string;
    primary: string;
    secondary: string;
  };
  footer: {
    locationEyebrow: string;
    locationBody: string;
    contactEyebrow: string;
    contactBody: string;
    brand: string;
    copyright: string;
    legal: { legal: string; privacy: string; cookies: string; badge: string };
  };
};

const COPY: LandingCopy = {
  nav: {
    brand: "Almudena Marchesi",
    items: [
      { href: "#enfoque", label: "Enfoque" },
      { href: "#servicios", label: "Servicios" },
      { href: "#sobre-mi", label: "Sobre Mí" },
      { href: "#contacto", label: "Contacto" },
    ],
    portalButton: "Portal Paciente",
  },
  hero: {
    badge: "Psicología Clínica",
    imageAlt: "Almudena Marchesi en su consulta",
    imageSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAEqpbz4F4ShrQ-O9Ie_Vu79dqBPtWMR_1NmWTFmctitMXVBEuFp8ByIQASPhkkEuZQKXLEBZUHrXMiBE4DY2D6ot8mp8SbG2UNj0X-_t425Jvw0JWQR4CrcxmxdBfaGIDJb6R3mySXmv-CP-uXqEpFJbcKpU761uAjBo-kthIfwjy2qebosacxtG68xPwGor_xrlMYyrHNkoQ-lgJZwVbyz-6gnm4OkLH0BEIZ2hOfWw2v_d4yOIUi2xvY3qnmp_CoVne2nXWF_jg",
    description:
      "Acompañamiento profesional en el corazón de Moncloa. Una invitación a la pausa, al entendimiento y a la reconstrucción propia.",
    primaryCta: "Reserva tu primera cita",
    secondaryCta: "Conoce mi enfoque",
  },
  enfoque: {
    titleLine1: "El rigor de la clínica,",
    titleLine2: "la calidez de lo humano.",
    cards: [
      {
        icon: "psychology",
        title: "Escucha Activa",
        body: "Más allá de las palabras. Un silencio fértil donde cada matiz de tu historia encuentra su lugar y significado.",
      },
      {
        icon: "volunteer_activism",
        title: "Sin Juicio",
        body: "Un búnker de seguridad emocional. Tu vulnerabilidad es respetada como la herramienta más potente de cambio.",
      },
      {
        icon: "auto_awesome",
        title: "Ayuda Real",
        body: "Estrategias clínicas basadas en evidencia. No solo entender el porqué, sino construir el cómo hacia tu bienestar.",
      },
    ],
  },
  moncloa: {
    eyebrow: "Ubicación Premium",
    place: "Calle de la Princesa, Moncloa",
    title: "Presencialidad en el centro de Madrid.",
    body: "El entorno influye en el proceso. Mi despacho en Moncloa está diseñado como un santuario urbano: techos altos, luz natural y un silencio absoluto en medio del bullicio de la capital.",
    imageAlt: "Vistas de Moncloa Madrid",
    imageSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB7jr9o_hflr4s2VnNGw6dWSqhqByTuXakJyXkMVyaU9rFYkTcO9cDERZIwZe5axAzGfD9cbyxmLjUVSp1UQJGGweoFEtMYkFd8GN9n2hU7rX-Q1USGSWya4hyW7aml5E3-I_mpvWrRqrGJE0TLDpCmU33rS3E8KlWCp5cWgFDyX4QeBcAuUW-AhTJEVABTpG2V9C5TOjGNmLapfxl4UvXeCkqbPI1FIlLeCOOOytVrGj8vxTFNU5zrS6To4Jm70QQu2OEN_G4KxTA",
    bullets: [
      "Excelente comunicación (Metro Moncloa/Argüelles)",
      "Entorno discreto y profesional",
      "Flexibilidad horaria presencial",
    ],
    cta: "Ver en Google Maps",
  },
  portal: {
    title: "Tu búnker digital seguro.",
    body: "Para garantizar la máxima confidencialidad y una gestión eficiente de tu proceso, utilizamos un **Portal del Paciente** cifrado. El registro es el primer paso obligatorio para acceder a mi agenda y gestionar tus sesiones.",
    markers: [
      "Encriptación de grado militar simplificada para tu paz mental.",
      "Acceso exclusivo y privado a tu historial personal.",
    ],
    steps: [
      { number: "01.", title: "Registro Inicial", body: "Crea tu perfil con tus datos básicos de contacto." },
      { number: "02.", title: "Reserva Directa", body: "Accede a las horas disponibles y elige la que mejor te encaje." },
      { number: "03.", title: "Control Total", body: "Facturas, recordatorios y gestión de citas en un solo lugar." },
    ],
    infoTitle: "Registro Obligatorio",
    infoBody:
      "Para garantizar la confidencialidad y gestionar tus citas, es necesario crear una cuenta de acceso privada antes de cualquier reserva.",
    primaryCta: "Acceder al Portal del Paciente",
    compliance: "Cumplimiento estricto de RGPD y LOPD.",
  },
  finalCta: {
    title: "Inicia tu camino.",
    body: "Dar el primer paso es el acto de valentía más grande que puedes hacer por ti mismo, no tienes que hacerlo solo. Estoy aquí para acompañarte en cada paso hacia tu equilibrio.",
    primary: "Solicitar información",
    secondary: "Enviar un correo",
  },
  footer: {
    locationEyebrow: "Ubicación",
    locationBody: "Calle de la Princesa, 25\n28008, Madrid (Moncloa)",
    contactEyebrow: "Contacto Directo",
    contactBody: "info@almudenamarchesi.es\n+34 912 345 678",
    brand: "Almudena Marchesi",
    copyright:
      "© 2024 Almudena Marchesi Fernández. Licenciada en Psicología. Psicología Clínica. Madrid.",
    legal: { legal: "Aviso Legal", privacy: "Privacidad", cookies: "Cookies", badge: "Colegiada M-XXXXX" },
  },
};

const meshStyle: React.CSSProperties = {
  background:
    "radial-gradient(circle at 20% 20%, rgba(69,99,119,0.22), transparent 55%), radial-gradient(circle at 80% 25%, rgba(197,228,252,0.45), transparent 60%), radial-gradient(circle at 55% 80%, rgba(205,232,226,0.55), transparent 62%)",
};

function MarkdownInline({ text }: { text: string }): JSX.Element {
  // Render mínimo para **negrita** del prototipo, sin introducir librerías.
  const parts = text.split("**");
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <strong key={`${p}-${i}`}>{p}</strong>
        ) : (
          <span key={`${p}-${i}`}>{p}</span>
        )
      )}
    </>
  );
}

export default function LandingExperience(): JSX.Element {
  const reduceMotion = useReducedMotion();

  const Root = reduceMotion ? ("div" as const) : ReactLenis;
  const rootProps = reduceMotion ? {} : { root: true, options: { lerp: 0.08, smoothWheel: true } };

  const siteUrl =
    typeof window === "undefined"
      ? undefined
      : window.location?.origin;

  return (
    <Root {...rootProps}>
      <div className="bg-background text-on-background font-body selection:bg-primary-container selection:text-on-primary-container">
        <Script
          id="ld-json-clinica-almudena"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              {
                "@context": "https://schema.org",
                "@type": "LocalBusiness",
                name: COPY.nav.brand,
                url: siteUrl,
                address: {
                  "@type": "PostalAddress",
                  streetAddress: "Calle de la Princesa, 25",
                  postalCode: "28008",
                  addressLocality: "Madrid",
                  addressRegion: "Madrid",
                  addressCountry: "ES",
                },
              },
              null,
              0
            ),
          }}
        />
        <a className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60] focus:rounded-lg focus:bg-surface-container-lowest focus:px-4 focus:py-2 focus:shadow" href="#main">
          Saltar al contenido principal
        </a>

        {/* TopNavBar (Premium Zen glass) */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-outline-variant/15">
          <div className="flex justify-between items-center px-6 md:px-12 py-6 max-w-screen-2xl mx-auto">
            <div className="text-xl font-serif tracking-widest uppercase text-primary">
              {COPY.nav.brand}
            </div>
            <nav aria-label="Navegación principal" className="hidden md:flex gap-10 items-center">
              {COPY.nav.items.map((it) => (
                <a
                  key={it.href}
                  className="text-secondary font-headline tracking-tight hover:text-primary transition-colors duration-400 ease-in-out"
                  href={it.href}
                >
                  {it.label}
                </a>
              ))}
              <Link
                className="bg-primary text-on-primary px-6 py-2 rounded-full font-label text-sm uppercase tracking-wider hover:bg-primary-dim transition-all"
                href="/login"
              >
                {COPY.nav.portalButton}
              </Link>
            </nav>
            <div className="md:hidden">
              <button
                aria-label="Abrir menú"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-outline-variant/25 bg-surface-container-lowest/70 backdrop-blur-2xl text-primary"
                type="button"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-3xl">menu</span>
              </button>
            </div>
          </div>
        </header>

        <main id="main">
          {/* Hero (Wow + mesh + jewel) */}
          <section className="relative min-h-[100svh] flex items-center pt-28 px-6 md:px-12 overflow-hidden bg-surface">
            <div className="pointer-events-none absolute inset-0">
              <motion.div
                aria-hidden="true"
                className="absolute -top-24 left-1/2 h-[720px] w-[920px] -translate-x-1/2 rounded-full blur-3xl opacity-80"
                style={meshStyle}
                animate={reduceMotion ? undefined : { x: [-10, 12, -10], y: [0, 16, 0] }}
                transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
              />
              <div aria-hidden="true" className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle, rgba(75,100,95,0.18) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
            </div>

            <div className="max-w-screen-2xl mx-auto w-full grid md:grid-cols-2 gap-12 items-center">
              <motion.div
                className="z-10 order-2 md:order-1"
                initial="hidden"
                whileInView="show"
                viewport={{ once: false, amount: 0.6 }}
                variants={staggerChildren}
              >
                <motion.span
                  variants={sectionReveal}
                  className="inline-block px-4 py-1 border border-primary/20 rounded-full text-xs font-label uppercase tracking-widest text-primary mb-6 bg-surface-container-lowest/60 backdrop-blur-2xl"
                >
                  {COPY.hero.badge}
                </motion.span>

                <motion.h1
                  variants={sectionReveal}
                  className="font-headline text-5xl md:text-7xl lg:text-8xl text-on-background leading-[1.06] mb-8 tracking-tighter font-light italic"
                >
                  Reconecta con tu paz interior
                </motion.h1>

                <WordReveal
                  className="text-lg md:text-xl text-on-surface-variant max-w-lg mb-10 leading-relaxed"
                  text={COPY.hero.description}
                />

                <motion.div variants={sectionReveal} className="flex flex-col sm:flex-row gap-4">
                  <a
                    className="group relative bg-primary text-on-primary px-8 py-4 rounded-xl font-label font-bold text-center transition-all transform hover:-translate-y-1"
                    href="#portal"
                  >
                    <span className="absolute -inset-[2px] rounded-xl bg-gradient-to-r from-tertiary-container/70 via-primary-container/70 to-tertiary-fixed/70 opacity-0 blur-md transition-opacity group-hover:opacity-100" />
                    <span className="relative">{COPY.hero.primaryCta}</span>
                  </a>
                  <a
                    className="border border-outline-variant text-on-background px-8 py-4 rounded-xl font-label font-bold text-center hover:bg-surface-container transition-all backdrop-blur-2xl"
                    href="#enfoque"
                  >
                    {COPY.hero.secondaryCta}
                  </a>
                </motion.div>

                <motion.div variants={sectionReveal} className="mt-12 inline-flex items-center gap-2 text-sm text-on-surface-variant/80">
                  <span className="material-symbols-outlined text-primary">south</span>
                  Desliza para descubrir
                </motion.div>
              </motion.div>

              <motion.div
                className="relative order-1 md:order-2"
                initial="hidden"
                whileInView="show"
                viewport={{ once: false, amount: 0.35 }}
                variants={sectionReveal}
              >
                <div className="aspect-[4/5] rounded-[2rem] overflow-hidden shadow-2xl relative z-10 transform md:rotate-2">
                  <img
                    alt={COPY.hero.imageAlt}
                    className="h-full w-full object-cover"
                    loading="eager"
                    src={COPY.hero.imageSrc}
                  />
                </div>
                <div aria-hidden="true" className="absolute -bottom-10 -left-10 w-64 h-64 bg-primary-container/30 rounded-full blur-3xl -z-0" />
                <div aria-hidden="true" className="absolute -top-10 -right-10 w-48 h-48 bg-secondary-container/20 rounded-full blur-2xl -z-0" />
              </motion.div>
            </div>
          </section>

          {/* Enfoque + Servicios (storytelling por bloques + cards con tilt) */}
          <section className="py-24 md:py-32 px-6 md:px-12 bg-surface-container-low relative overflow-hidden" id="enfoque">
            <div className="max-w-screen-2xl mx-auto">
              <motion.div
                className="mb-20"
                initial="hidden"
                whileInView="show"
                viewport={{ once: false, amount: 0.5 }}
                variants={sectionReveal}
              >
                <h2 className="font-headline text-3xl md:text-5xl text-on-background mb-4">
                  {COPY.enfoque.titleLine1}
                  <br />
                  {COPY.enfoque.titleLine2}
                </h2>
                <div className="w-24 h-1 bg-primary/30" />
              </motion.div>

              {/* Storytelling: 3 bloques (copy real) */}
              <div className="max-w-3xl flex flex-col gap-10">
                <WordReveal className="text-xl md:text-2xl text-on-surface-variant leading-relaxed" text={COPY.enfoque.cards[0]?.body ?? ""} />
                <WordReveal className="text-xl md:text-2xl text-on-surface-variant leading-relaxed" text={COPY.enfoque.cards[1]?.body ?? ""} />
                <WordReveal className="text-xl md:text-2xl text-on-surface-variant leading-relaxed" text={COPY.enfoque.cards[2]?.body ?? ""} />
              </div>

              <div id="servicios" className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 scroll-mt-28">
                {COPY.enfoque.cards.map((c) => (
                  <TiltCard key={c.title} className="rounded-3xl border border-outline-variant/20 bg-surface-container-lowest/70 backdrop-blur-2xl shadow-editorial transition-transform will-change-transform">
                    <motion.div
                      className="p-10 flex flex-col gap-6"
                      initial="hidden"
                      whileInView="show"
                      viewport={{ once: false, amount: 0.45 }}
                      variants={staggerChildren}
                    >
                      <motion.div variants={sectionReveal} className="w-14 h-14 bg-primary-container rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-on-primary-container text-3xl">{c.icon}</span>
                      </motion.div>
                      <motion.h3 variants={sectionReveal} className="font-headline text-2xl font-bold">
                        {c.title}
                      </motion.h3>
                      <motion.p variants={sectionReveal} className="text-on-surface-variant leading-relaxed">
                        {c.body}
                      </motion.p>
                    </motion.div>
                  </TiltCard>
                ))}
              </div>
            </div>
          </section>

          {/* Moncloa */}
          <section className="py-24 md:py-32 px-6 md:px-12 bg-surface" id="sobre-mi">
            <div className="max-w-screen-2xl mx-auto grid md:grid-cols-12 gap-12 items-center">
              <motion.a
                className="md:col-span-7 rounded-[2rem] overflow-hidden h-[400px] md:h-[600px] group relative"
                href="#"
                initial="hidden"
                whileInView="show"
                viewport={{ once: false, amount: 0.35 }}
                variants={sectionReveal}
              >
                <img
                  alt={COPY.moncloa.imageAlt}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  loading="lazy"
                  src={COPY.moncloa.imageSrc}
                />
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-on-background/40 to-transparent" />
                <div className="absolute bottom-8 left-8 text-white">
                  <p className="font-label text-sm uppercase tracking-widest opacity-80">{COPY.moncloa.eyebrow}</p>
                  <p className="font-headline text-2xl">{COPY.moncloa.place}</p>
                </div>
              </motion.a>

              <motion.div
                className="md:col-span-5 md:pl-8"
                initial="hidden"
                whileInView="show"
                viewport={{ once: false, amount: 0.4 }}
                variants={staggerChildren}
              >
                <motion.h2 variants={sectionReveal} className="font-headline text-4xl md:text-5xl text-on-background mb-8 leading-tight">
                  {COPY.moncloa.title}
                </motion.h2>
                <motion.p variants={sectionReveal} className="text-lg text-on-surface-variant mb-8 leading-relaxed">
                  {COPY.moncloa.body}
                </motion.p>
                <motion.ul variants={sectionReveal} className="flex flex-col gap-4 mb-10">
                  {COPY.moncloa.bullets.map((b) => (
                    <li key={b} className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary">check_circle</span>
                      <span className="text-on-surface">{b}</span>
                    </li>
                  ))}
                </motion.ul>
                <motion.a variants={sectionReveal} className="inline-flex items-center gap-2 font-label font-bold text-primary group" href="#">
                  {COPY.moncloa.cta}
                  <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </motion.a>
              </motion.div>
            </div>
          </section>

          {/* Portal */}
          <section className="py-24 md:py-32 px-6 md:px-12 bg-secondary/5 relative" id="portal">
            <motion.div
              className="max-w-4xl mx-auto text-center"
              initial="hidden"
              whileInView="show"
              viewport={{ once: false, amount: 0.35 }}
              variants={staggerChildren}
            >
              <motion.span variants={sectionReveal} className="material-symbols-outlined text-6xl text-primary mb-8" data-weight="fill">
                verified_user
              </motion.span>
              <motion.h2 variants={sectionReveal} className="font-headline text-4xl md:text-6xl text-on-background mb-8 italic">
                {COPY.portal.title}
              </motion.h2>
              <motion.p variants={sectionReveal} className="text-xl text-on-surface-variant mb-8 leading-relaxed">
                <MarkdownInline text={COPY.portal.body} />
              </motion.p>

              <motion.div variants={sectionReveal} className="flex flex-col items-center gap-4 mb-12">
                {COPY.portal.markers.map((m) => (
                  <div key={m} className="flex items-center gap-4 text-on-surface-variant max-w-2xl">
                    <span className="material-symbols-outlined text-primary">verified</span>
                    <p className="text-left font-body">{m}</p>
                  </div>
                ))}
              </motion.div>

              <motion.div variants={sectionReveal} className="grid md:grid-cols-3 gap-6 mb-12 text-left">
                {COPY.portal.steps.map((s) => (
                  <div key={s.number} className="bg-surface p-6 rounded-xl border border-outline-variant/20">
                    <div className="text-primary font-bold text-3xl mb-2">{s.number}</div>
                    <p className="font-bold mb-1">{s.title}</p>
                    <p className="text-sm text-on-surface-variant">{s.body}</p>
                  </div>
                ))}
              </motion.div>

              <motion.div variants={sectionReveal} className="max-w-2xl mx-auto mb-12 p-6 bg-surface-container-high rounded-xl flex gap-4 text-left border-l-4 border-primary">
                <span className="material-symbols-outlined text-primary text-3xl shrink-0">info</span>
                <div>
                  <p className="font-bold text-on-surface mb-1">{COPY.portal.infoTitle}</p>
                  <p className="text-sm text-on-surface-variant leading-relaxed">{COPY.portal.infoBody}</p>
                </div>
              </motion.div>

              <motion.div variants={sectionReveal}>
                <Link
                  className="bg-on-background text-surface px-12 py-5 rounded-full font-label font-bold text-lg hover:bg-primary transition-all inline-flex items-center gap-3 mx-auto"
                  href="/login"
                >
                  {COPY.portal.primaryCta}
                  <span className="material-symbols-outlined">login</span>
                </Link>
                <p className="mt-6 text-sm text-on-surface-variant italic">{COPY.portal.compliance}</p>
              </motion.div>
            </motion.div>
          </section>

          {/* Final CTA */}
          <section className="py-32 px-6 md:px-12 bg-primary text-on-primary text-center" id="contacto">
            <motion.div
              className="max-w-2xl mx-auto"
              initial="hidden"
              whileInView="show"
              viewport={{ once: false, amount: 0.45 }}
              variants={staggerChildren}
            >
              <motion.h2 variants={sectionReveal} className="font-headline text-5xl md:text-7xl mb-10 leading-tight">
                {COPY.finalCta.title}
              </motion.h2>
              <motion.p variants={sectionReveal} className="text-xl opacity-90 mb-12">
                <span className="text-primary-container font-body">{COPY.finalCta.body}</span>
              </motion.p>
              <motion.div variants={sectionReveal} className="flex flex-col sm:flex-row gap-6 justify-center">
                <a className="bg-on-primary text-primary px-10 py-5 rounded-xl font-label font-extrabold text-xl hover:scale-105 transition-transform" href="#portal">
                  {COPY.finalCta.primary}
                </a>
                <a className="border-2 border-on-primary text-on-primary px-10 py-5 rounded-xl font-label font-bold text-xl hover:bg-on-primary/10 transition-all" href="mailto:info@almudenamarchesi.es">
                  {COPY.finalCta.secondary}
                </a>
              </motion.div>
            </motion.div>
          </section>

          {/* Footer */}
          <footer className="w-full border-t border-primary/10 bg-surface-container-low">
            <div className="max-w-screen-2xl mx-auto px-6 md:px-12 pt-16 pb-8 grid md:grid-cols-2 gap-12 border-b border-primary/5">
              <div className="flex flex-col gap-4">
                <p className="font-label text-xs uppercase tracking-widest text-on-surface-variant opacity-70">{COPY.footer.locationEyebrow}</p>
                <p className="font-headline text-xl text-on-surface italic whitespace-pre-line">{COPY.footer.locationBody}</p>
              </div>
              <div className="flex flex-col gap-4">
                <p className="font-label text-xs uppercase tracking-widest text-on-surface-variant opacity-70">{COPY.footer.contactEyebrow}</p>
                <p className="font-headline text-xl text-on-surface italic whitespace-pre-line">{COPY.footer.contactBody}</p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center px-6 md:px-12 py-12 gap-8 max-w-screen-2xl mx-auto font-body text-sm leading-relaxed text-primary">
              <div className="flex flex-col gap-4 text-center md:text-left">
                <div className="font-serif text-lg text-primary">{COPY.footer.brand}</div>
                <p className="max-w-xs text-secondary/80">{COPY.footer.copyright}</p>
              </div>
              <div className="flex gap-8 flex-wrap justify-center">
                <a className="text-secondary/80 hover:text-primary transition-all" href="#">{COPY.footer.legal.legal}</a>
                <a className="text-secondary/80 hover:text-primary transition-all" href="#">{COPY.footer.legal.privacy}</a>
                <a className="text-secondary/80 hover:text-primary transition-all" href="#">{COPY.footer.legal.cookies}</a>
                <span className="text-secondary/80 border border-primary/20 px-3 py-1 rounded-full">{COPY.footer.legal.badge}</span>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </Root>
  );
}

