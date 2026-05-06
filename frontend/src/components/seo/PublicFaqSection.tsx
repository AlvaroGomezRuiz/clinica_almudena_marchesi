'use client';

import { useId, useState, type JSX } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Plus } from 'lucide-react';

import ScrollReveal from '@/components/landing/ScrollReveal';
import { cn } from '@/lib/utils';
import type { ClinicFaqItem } from '@/lib/seo/clinic-faq-content';

interface PublicFaqSectionProps {
  readonly id: string;
  readonly heading: string;
  readonly items: ReadonlyArray<ClinicFaqItem>;
  readonly eyebrow?: string;
  readonly className?: string;
}

/**
 * Bloque FAQ con acordeón (animación + icono) y texto alineado con JSON-LD `FAQPage`.
 * Estructura semántica `dl` / `dt` / `dd` con `aria-expanded` y regiones controladas.
 */
export default function PublicFaqSection({
  id,
  heading,
  items,
  eyebrow = 'Preguntas frecuentes',
  className = 'bg-canvas-alt',
}: PublicFaqSectionProps): JSX.Element {
  const baseId: string = useId();
  const [activeIndex, setActiveIndex] = useState<number | null>(0);
  const prefersReducedMotion: boolean | null = useReducedMotion();

  const handleToggle = (index: number): void => {
    setActiveIndex((prev) => (prev === index ? null : index));
  };

  return (
    <section
      className={cn('py-20 md:py-28 px-6 md:px-12', className)}
      aria-labelledby={id}
    >
      <div className="max-w-3xl mx-auto">
        <ScrollReveal>
          <span className="font-mono text-label-sm uppercase tracking-[0.14em] text-sage-mid dark:text-white/70 mb-4 block text-center">
            {eyebrow}
          </span>
          <h2
            id={id}
            className="font-display text-display-2 text-ink dark:text-white mb-10 text-balance text-center"
          >
            {heading}
          </h2>
        </ScrollReveal>
        <dl
          className="h-fit rounded-lg border border-line dark:border-white/10 p-2 bg-white dark:bg-ink-soft/10 dark:backdrop-blur-md overflow-hidden shadow-sm"
        >
          {items.map((item, index) => {
            const isOpen: boolean = activeIndex === index;
            const questionId: string = `${baseId}-q-${index}`;
            const answerId: string = `${baseId}-a-${index}`;

            return (
              <motion.div
                key={item.question}
                className={cn(
                  'overflow-hidden',
                  index !== items.length - 1 && 'border-b border-line dark:border-white/10',
                )}
              >
                <dt className="m-0">
                  <button
                    type="button"
                    id={questionId}
                    className={cn(
                      'p-4 px-3 w-full cursor-pointer sm:text-base text-xs items-center transition-all font-semibold',
                      'dark:text-white text-ink',
                      'flex gap-3 text-left font-display hover:bg-ink/[0.02] dark:hover:bg-white/[0.02]',
                    )}
                    onClick={() => {
                      handleToggle(index);
                    }}
                    aria-expanded={isOpen}
                    aria-controls={answerId}
                  >
                    <Plus
                      className={cn(
                        'shrink-0 transition-transform ease-in-out w-5 h-5',
                        isOpen ? 'rotate-45' : 'rotate-0',
                        'dark:text-neutral-200 text-neutral-600',
                      )}
                      aria-hidden
                    />
                    {item.question}
                  </button>
                </dt>
                <AnimatePresence initial={false} mode="sync">
                  {isOpen && (
                    <motion.dd
                      key="content"
                      id={answerId}
                      className="m-0"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={
                        prefersReducedMotion
                          ? { duration: 0 }
                          : {
                              duration: 0.3,
                              ease: 'easeInOut',
                              delay: 0.14,
                            }
                      }
                      aria-labelledby={questionId}
                    >
                      <p
                        className={cn(
                          'dark:text-white/90 text-ink/90 p-4 xl:text-base sm:text-sm text-xs pt-0 w-11/12',
                          'font-body leading-relaxed text-pretty m-0',
                        )}
                      >
                        {item.answer}
                      </p>
                    </motion.dd>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </dl>
      </div>
    </section>
  );
}
