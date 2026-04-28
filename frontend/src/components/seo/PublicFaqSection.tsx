import type { JSX } from 'react';

import ScrollReveal from '@/components/landing/ScrollReveal';
import type { ClinicFaqItem } from '@/lib/seo/clinic-faq-content';

interface PublicFaqSectionProps {
  readonly id: string;
  readonly heading: string;
  readonly items: ReadonlyArray<ClinicFaqItem>;
  readonly eyebrow?: string;
  readonly className?: string;
}

/**
 * Bloque FAQ accesible (dl/dt/dd) + animación consistente con el resto de landings.
 * El texto debe coincidir con el JSON-LD `FAQPage` inyectado en la misma URL.
 */
export default function PublicFaqSection({
  id,
  heading,
  items,
  eyebrow = 'Preguntas frecuentes',
  className = 'bg-canvas-alt',
}: PublicFaqSectionProps): JSX.Element {
  return (
    <section
      className={`py-20 md:py-28 px-6 md:px-12 ${className}`}
      aria-labelledby={id}
    >
      <div className="max-w-3xl mx-auto">
        <ScrollReveal>
          <span className="font-mono text-label-sm uppercase tracking-[0.14em] text-sage-mid mb-4 block text-center">
            {eyebrow}
          </span>
          <h2
            id={id}
            className="font-display text-display-2 text-ink mb-10 text-balance text-center"
          >
            {heading}
          </h2>
        </ScrollReveal>
        <dl className="space-y-0 rounded-2xl border border-line bg-canvas/80 dark:bg-canvas-alt/80 overflow-hidden">
          {items.map((item, i) => (
            <ScrollReveal key={item.question} delay={0.04 * (i + 1)}>
              <div className="border-b border-line last:border-0 p-5 md:p-6">
                <dt className="font-display text-lg text-ink mb-2.5 text-balance">
                  {item.question}
                </dt>
                <dd className="font-body text-[0.95rem] text-ink-soft leading-relaxed text-pretty m-0">
                  {item.answer}
                </dd>
              </div>
            </ScrollReveal>
          ))}
        </dl>
      </div>
    </section>
  );
}
