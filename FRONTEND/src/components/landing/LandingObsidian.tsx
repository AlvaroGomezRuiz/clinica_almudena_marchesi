"use client";

import Link from "next/link";
import { ReactLenis } from "@studio-freight/react-lenis";
import { motion } from "framer-motion";

type LandingObsidianProps = {
  heroTitle?: string;
};

const easeOutExpo = [0.16, 1, 0.3, 1] as const;

const pageEnter = {
  initial: { opacity: 0, scale: 0.985 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.55, ease: easeOutExpo } },
};

export default function LandingObsidian({
  heroTitle = "Reconecta con tu paz interior",
}: LandingObsidianProps): JSX.Element {
  return (
    <ReactLenis root options={{ lerp: 0.08, smoothWheel: true }}>
      <motion.main
        className="relative min-h-[100svh] bg-black text-white selection:bg-white/20 selection:text-white"
        initial={pageEnter.initial}
        animate={pageEnter.animate}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <motion.div
            aria-hidden="true"
            className="absolute -top-32 left-1/2 h-[640px] w-[840px] -translate-x-1/2 rounded-full blur-3xl opacity-70"
            style={{
              background:
                "radial-gradient(circle at 30% 30%, rgba(56,189,248,0.28), transparent 55%), radial-gradient(circle at 70% 20%, rgba(45,212,191,0.20), transparent 60%), radial-gradient(circle at 55% 70%, rgba(129,140,248,0.18), transparent 60%)",
            }}
            animate={{ x: [-10, 10, -10], y: [0, 14, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='.35'/%3E%3C/svg%3E\")",
            }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-b from-black via-black/70 to-black"
          />
        </div>

        <section className="relative mx-auto flex min-h-[100svh] max-w-screen-2xl flex-col justify-center px-6 pb-20 pt-32 md:px-12">
          <div className="max-w-3xl">
            <motion.p
              className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold tracking-[0.22em] text-white/80 backdrop-blur-2xl"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5, ease: easeOutExpo }}
            >
              PSICOLOGÍA CLÍNICA · MADRID / MONCLOA
            </motion.p>

            <motion.h1
              className="mt-8 font-headline text-5xl font-light leading-[0.92] tracking-[-0.04em] text-white md:text-7xl lg:text-8xl"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16, duration: 0.6, ease: easeOutExpo }}
            >
              {heroTitle}
            </motion.h1>

            <motion.p
              className="mt-7 max-w-2xl text-base leading-relaxed text-white/70 md:text-lg"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22, duration: 0.55, ease: easeOutExpo }}
            >
              Tu bienestar mental es nuestra prioridad. Un espacio clínico y humano en el corazón de Moncloa para
              pausar, comprender y reconstruir con calma.
            </motion.p>

            <motion.div
              className="mt-10 flex flex-col gap-4 sm:flex-row"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, duration: 0.55, ease: easeOutExpo }}
            >
              <Link
                href="/registro-paciente"
                className="group relative inline-flex min-h-[48px] items-center justify-center rounded-full bg-white px-7 py-4 text-sm font-bold text-black backdrop-blur-2xl transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                <span className="absolute -inset-[1px] rounded-full bg-gradient-to-r from-cyan-300/40 via-teal-300/25 to-indigo-300/35 opacity-0 blur-md transition-opacity group-hover:opacity-100" />
                <span className="absolute -inset-px rounded-full bg-gradient-to-r from-white/10 via-white/0 to-white/10 opacity-100" />
                <span className="relative">Reserva tu primera sesión</span>
              </Link>

              <Link
                href="/servicios"
                className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-white/15 bg-white/5 px-7 py-4 text-sm font-semibold text-white/90 backdrop-blur-2xl transition-colors hover:bg-white/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                Ver servicios
              </Link>
            </motion.div>
          </div>
        </section>
      </motion.main>
    </ReactLenis>
  );
}

