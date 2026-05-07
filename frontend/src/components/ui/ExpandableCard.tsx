'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import PremiumCard from './PremiumCard';
import TextAnimation from './scroll-text';

interface ExpandableCardProps {
  id: string;
  title: string;
  subtitle?: string;
  description: React.ReactNode;
  previewText?: React.ReactNode;
  tags?: string[];
  className?: string;
}

export default function ExpandableCard({
  id,
  title,
  subtitle,
  description,
  previewText,
  tags,
  className = '',
}: ExpandableCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
      <motion.div
        layoutId={`card-${id}`}
        onClick={() => setIsOpen(true)}
        className={`cursor-pointer h-full ${className}`}
        role="button"
        tabIndex={0}
        aria-label={`Ver detalles de ${title}`}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsOpen(true); }}}
      >
        <PremiumCard tilt={false} className="h-full" active={isOpen}>
          <div className="flex flex-col h-full p-8 md:p-10 group items-center text-center justify-center">
            {subtitle && (
              <motion.span
                layoutId={`subtitle-${id}`}
                className="font-mono text-label-sm uppercase tracking-[0.14em] text-sage-mid mb-3 block"
              >
                {subtitle}
              </motion.span>
            )}
            
            <TextAnimation
              as="h3"
              text={title}
              classname="font-display text-display-3 text-ink text-balance mb-4"
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { ease: 'linear' },
                },
              }}
            />

            {/* Preview texto cortado */}
            <TextAnimation
              as="div"
              text={typeof previewText === 'string' ? previewText : typeof description === 'string' ? description : ''}
              classname="font-body text-[0.95rem] leading-relaxed text-ink-soft line-clamp-3 mb-6"
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.2 },
                },
              }}
            />

            <div className="mt-auto flex justify-center items-center pt-4 border-t border-line w-full">
              {tags && tags.length > 0 && (
                <div className="flex gap-2 flex-wrap justify-center">
                  {tags.slice(0, 2).map((tag) => (
                    <span key={tag} className="text-xs bg-sage-wash text-sage px-2 py-1 rounded-md">
                      {tag}
                    </span>
                  ))}
                  {tags.length > 2 && (
                    <span className="text-xs bg-canvas-alt text-ink-muted px-2 py-1 rounded-md">
                      +{tags.length - 2}
                    </span>
                  )}
                </div>
              )}
              <span className="text-sage text-xs font-body font-medium ml-auto opacity-60 group-hover:opacity-100 transition-opacity">
                Leer más
              </span>
            </div>
          </div>
        </PremiumCard>
      </motion.div>

      {mounted && createPortal(
        <AnimatePresence>
          {isOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-12">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={() => setIsOpen(false)}
              />
              
              <motion.div
                layoutId={`card-${id}`}
                className="relative w-full max-w-3xl max-h-[90vh] shadow-2xl z-10 flex flex-col outline-none rounded-3xl"
              >
                <PremiumCard tilt={false} active={true} className="h-full w-full overflow-y-auto">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="absolute top-4 right-4 z-20 w-10 h-10 flex items-center justify-center bg-canvas hover:bg-canvas-alt rounded-full text-ink transition-colors border border-line"
                    aria-label="Cerrar modal"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>

                  <div className="p-8 md:p-12 flex flex-col items-center text-center">
                    {subtitle && (
                      <span className="font-mono text-label-sm uppercase tracking-[0.14em] text-sage-mid mb-4 block">
                        {subtitle}
                      </span>
                    )}
                    
                    <h3 className="font-display text-4xl md:text-5xl text-ink text-balance mb-8">
                      {title}
                    </h3>

                    <div className="font-body text-lg leading-relaxed text-ink-soft space-y-4 text-left max-w-2xl">
                      {description}
                    </div>
                    
                    {tags && tags.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="mt-10 flex gap-2 flex-wrap justify-center pt-6 border-t border-line w-full"
                      >
                        {tags.map((tag) => (
                          <span key={tag} className="text-sm bg-sage-wash text-sage px-3 py-1.5 rounded-md font-medium">
                            {tag}
                          </span>
                        ))}
                      </motion.div>
                    )}
                  </div>
                </PremiumCard>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
