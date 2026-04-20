"use client";

import { useId } from "react";
import { motion } from "framer-motion";

import { easeOutExpo } from "./motion";

type AccordionItem = {
  question: string;
  answer: string;
};

type AccordionLiteProps = {
  items: AccordionItem[];
  className?: string;
};

export default function AccordionLite({ items, className }: AccordionLiteProps): JSX.Element {
  const uid = useId();
  return (
    <div className={className}>
      {items.map((it, idx) => {
        const id = `${uid}-${idx}`;
        return (
          <details
            key={id}
            className="group rounded-2xl border border-outline-variant/30 bg-surface-container-lowest/70 backdrop-blur-2xl"
          >
            <summary className="cursor-pointer list-none px-6 py-5 font-headline text-lg text-on-surface flex items-center justify-between gap-6">
              <span>{it.question}</span>
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-primary transition-transform group-open:rotate-45"
              >
                add
              </span>
            </summary>
            <motion.div
              initial={false}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25, ease: easeOutExpo }}
              className="px-6 pb-6 text-on-surface-variant leading-relaxed"
            >
              {it.answer}
            </motion.div>
          </details>
        );
      })}
    </div>
  );
}

