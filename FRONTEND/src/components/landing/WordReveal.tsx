"use client";

import { motion } from "framer-motion";

import { easeOutExpo } from "./motion";

type WordRevealProps = {
  text: string;
  className?: string;
};

function normalizeSpaces(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

export default function WordReveal({ text, className }: WordRevealProps): JSX.Element {
  const words = normalizeSpaces(text).split(" ").filter(Boolean);

  return (
    <motion.p
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: false, amount: 0.7 }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.018, ease: easeOutExpo } },
      }}
    >
      {words.map((w, idx) => (
        <motion.span
          // eslint-disable-next-line react/no-array-index-key
          key={`${w}-${idx}`}
          className="inline-block will-change-transform"
          variants={{
            hidden: { opacity: 0, y: 10, filter: "blur(2px)" },
            show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.35, ease: easeOutExpo } },
          }}
        >
          {w}
          {idx < words.length - 1 ? " " : ""}
        </motion.span>
      ))}
    </motion.p>
  );
}

