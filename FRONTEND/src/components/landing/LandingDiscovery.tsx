"use client";

import Image from "next/image";
import Link from "next/link";
import { ReactLenis } from "@studio-freight/react-lenis";
import { motion, useReducedMotion } from "framer-motion";

import { sectionReveal, staggerChildren } from "./motion";

type LandingCopy = {
  nav: {
    brand: string;
    items: Array<{ href: string; label: string }>;
    portalButton: string;
  };
  hero: {
    badge: string;
    headlinePrefix: string;
    headlineEmphasis: string;
    headlineSuffix: string;
    description: string;
    primaryCta: string;
    secondaryCta: string;
    imageAlt: string;
    imageSrc: string;
  };
  enfoque: {
    titleLine1: string;
    titleLine2: string;
    cards: Array<{ icon: string; title: string; body: string }>;
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
    headlinePrefix: "Un espacio donde ",
    headlineEmphasis: "ser",
    headlineSuffix: ", sin ser juzgado.",
    description:
      "Acompañamiento profesional en el corazón de Moncloa. Una invitación a la pausa, al entendimiento y a la reconstrucción propia.",
    primaryCta: "Reserva tu primera cita",
    secondaryCta: "Conoce mi enfoque",
    imageAlt: "Almudena Marchesi en su consulta",
    imageSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAEqpbz4F4ShrQ-O9Ie_Vu79dqBPtWMR_1NmWTFmctitMXVBEuFp8ByIQASPhkkEuZQKXLEBZUHrXMiBE4DY2D6ot8mp8SbG2UNj0X-_t425Jvw0JWQR4CrcxmxdBfaGIDJb6R3mySXmv-CP-uXqEpFJbcKpU761uAjBo-kthIfwjy2qebosacxtG68xPwGor_xrlMYyrHNkoQ-lgJZwVbyz-6gnm4OkLH0BEIZ2hOfWw2v_d4yOIUi2xvY3qnmp_CoVne2nXWF_jg",
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
};

const meshStyle: React.CSSProperties = {
  background:
    "radial-gradient(circle at 15% 20%, rgba(69,99,119,0.25), transparent 55%), radial-gradient(circle at 85% 25%, rgba(197,228,252,0.55), transparent 60%), radial-gradient(circle at 55% 85%, rgba(205,232,226,0.65), transparent 62%)",
};

export default function LandingDiscovery(): JSX.Element {
  const reduceMotion = useReducedMotion();

  const Root = reduceMotion ? ("div" as const) : ReactLenis;
  const rootProps = reduceMotion ? {} : { root: true, options: { lerp: 0.08, smoothWheel: true } };

  return (
    <Root {...rootProps}>
      <div className="bg-background text-on-background font-body selection:bg-primary-container selection:text-on-primary-container">
        <a
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60] focus:rounded-lg focus:bg-surface-container-lowest focus:px-4 focus:py-2 focus:shadow"
          href="#main"
        >
          Saltar al contenido principal
        </a>

        <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-outline-variant/15">
          <div className="flex justify-between items-center px-6 md:px-12 py-6 max-w-screen-2xl mx-auto">
            <div className="text-xl font-serif tracking-widest uppercase text-primary">{COPY.nav.brand}</div>
            <nav aria-label="Navegación principal" className="hidden md:flex gap-10 items-center">
              {COPY.nav.items.map((it) => (
                <a
                  key={it.href}
                  className="text-secondary font-['Noto_Serif'] tracking-tight hover:text-primary transition-colors duration-400 ease-in-out"
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
                <span aria-hidden="true" className="material-symbols-outlined text-3xl">
                  menu
                </span>
              </button>
            </div>
          </div>
        </header>

        <main id="main">
          <section className="relative min-h-[100svh] flex items-center pt-28 px-6 md:px-12 overflow-hidden bg-surface">
            <div className="pointer-events-none absolute inset-0">
              <motion.div
                aria-hidden="true"
                className="absolute -top-24 left-1/2 h-[820px] w-[1120px] -translate-x-1/2 rounded-full blur-3xl opacity-90"
                style={meshStyle}
                animate={reduceMotion ? undefined : { x: [-14, 14, -14], y: [0, 18, 0], rotate: [0, 2, 0] }}
                transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 opacity-[0.07]"
                style={{
                  backgroundImage:
                    "radial-gradient(circle, rgba(75,100,95,0.18) 1px, transparent 1px)",
                  backgroundSize: "22px 22px",
                }}
              />
            </div>

            <div className="max-w-screen-2xl mx-auto w-full grid md:grid-cols-2 gap-12 items-center">
              <motion.div
                className="z-10 order-2 md:order-1"
                initial={reduceMotion ? undefined : "hidden"}
                whileInView={reduceMotion ? undefined : "show"}
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
                  className="font-headline text-center md:text-left text-6xl md:text-7xl lg:text-8xl text-on-background leading-[1.08] mb-8 tracking-tighter italic"
                >
                  {COPY.hero.headlinePrefix}
                  <span className="font-bold not-italic">{COPY.hero.headlineEmphasis}</span>
                  {COPY.hero.headlineSuffix}
                </motion.h1>

                <motion.p
                  variants={sectionReveal}
                  className="text-lg md:text-xl text-on-surface-variant max-w-lg mb-10 leading-relaxed"
                >
                  {COPY.hero.description}
                </motion.p>

                <motion.div variants={sectionReveal} className="flex flex-col sm:flex-row gap-4">
                  <a
                    className="group relative bg-primary text-on-primary px-8 py-4 rounded-xl font-label font-bold text-center transition-all transform hover:-translate-y-1"
                    href="#portal"
                  >
                    <span
                      aria-hidden="true"
                      className="absolute -inset-[2px] rounded-xl bg-gradient-to-r from-tertiary-container/70 via-primary-container/70 to-tertiary-fixed/70 opacity-0 blur-md transition-opacity group-hover:opacity-100"
                    />
                    <span className="relative">{COPY.hero.primaryCta}</span>
                  </a>
                  <a
                    className="border border-outline-variant text-on-background px-8 py-4 rounded-xl font-label font-bold text-center hover:bg-surface-container transition-all backdrop-blur-2xl"
                    href="#enfoque"
                  >
                    {COPY.hero.secondaryCta}
                  </a>
                </motion.div>
              </motion.div>

              <motion.div
                className="relative order-1 md:order-2"
                initial={reduceMotion ? undefined : "hidden"}
                whileInView={reduceMotion ? undefined : "show"}
                viewport={{ once: false, amount: 0.35 }}
                variants={sectionReveal}
              >
                <div className="aspect-[4/5] rounded-[2rem] overflow-hidden shadow-2xl relative z-10 transform md:rotate-2">
                  <Image alt={COPY.hero.imageAlt} className="h-full w-full object-cover" loading="eager" src={COPY.hero.imageSrc} width={1920} height={2400} priority />
                </div>
                <div aria-hidden="true" className="absolute -bottom-10 -left-10 w-64 h-64 bg-primary-container/30 rounded-full blur-3xl -z-0" />
                <div aria-hidden="true" className="absolute -top-10 -right-10 w-48 h-48 bg-secondary-container/20 rounded-full blur-2xl -z-0" />
              </motion.div>
            </div>
          </section>

          <section className="py-24 md:py-32 px-6 md:px-12 bg-surface-container-low relative overflow-hidden" id="enfoque">
            <div className="max-w-screen-2xl mx-auto">
              <motion.div
                className="mb-20"
                initial={reduceMotion ? undefined : "hidden"}
                whileInView={reduceMotion ? undefined : "show"}
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

              <div id="servicios" className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 scroll-mt-28">
                {COPY.enfoque.cards.map((c) => (
                  <motion.article
                    key={c.title}
                    className="rounded-3xl border border-outline-variant/20 bg-surface-container-lowest/70 backdrop-blur-2xl shadow-editorial"
                    initial={reduceMotion ? undefined : { opacity: 0, y: 22, scale: 0.98 }}
                    whileInView={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: false, amount: 0.45 }}
                    transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div className="p-10 flex flex-col gap-6">
                      <div className="w-14 h-14 bg-primary-container rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-on-primary-container text-3xl">{c.icon}</span>
                      </div>
                      <h3 className="font-headline text-2xl font-bold">{c.title}</h3>
                      <p className="text-on-surface-variant leading-relaxed">{c.body}</p>
                    </div>
                  </motion.article>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
    </Root>
  );
}

