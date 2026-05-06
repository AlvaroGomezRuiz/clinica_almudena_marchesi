'use client';

import React, { useRef } from 'react';
import { motion, useInView, Variants } from 'framer-motion';

interface TextAnimationProps {
  text: string;
  classname?: string;
  as?: React.ElementType;
  variants?: Variants;
  letterAnime?: boolean;
  lineAnime?: boolean;
  direction?: 'up' | 'down' | 'left' | 'right';
}

export default function TextAnimation({
  text,
  classname = '',
  as: Tag = 'h1',
  variants,
  letterAnime = false,
  lineAnime = false,
  direction = 'up',
}: TextAnimationProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false, margin: '-10% 0px' });

  const defaultVariants: Variants = {
    hidden: { 
      opacity: 0, 
      y: direction === 'up' ? 20 : direction === 'down' ? -20 : 0,
      x: direction === 'left' ? 20 : direction === 'right' ? -20 : 0
    },
    visible: {
      opacity: 1,
      y: 0,
      x: 0,
      transition: { ease: 'easeOut', duration: 0.8 },
    },
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const appliedVariants = variants || defaultVariants;

  if (letterAnime) {
    const letters = text.split('');
    return (
      <Tag ref={ref} className={classname}>
        <motion.span
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          className="inline-block"
        >
          {letters.map((letter, index) => (
            <motion.span
              key={index}
              variants={appliedVariants}
              className="inline-block"
              style={{ whiteSpace: letter === ' ' ? 'pre' : 'normal' }}
            >
              {letter}
            </motion.span>
          ))}
        </motion.span>
      </Tag>
    );
  }

  if (lineAnime) {
    const lines = text.split('\n');
    return (
      <Tag ref={ref} className={classname}>
        <motion.span
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          className="block"
        >
          {lines.map((line, index) => (
            <motion.span key={index} variants={appliedVariants} className="block">
              {line}
            </motion.span>
          ))}
        </motion.span>
      </Tag>
    );
  }

  const words = text.split(' ');
  return (
    <Tag ref={ref} className={classname}>
      <motion.span
        variants={containerVariants}
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
        className="inline-block"
      >
        {words.map((word, index) => (
          <motion.span
            key={index}
            variants={appliedVariants}
            className="inline-block mr-[0.25em]"
          >
            {word}
          </motion.span>
        ))}
      </motion.span>
    </Tag>
  );
}
