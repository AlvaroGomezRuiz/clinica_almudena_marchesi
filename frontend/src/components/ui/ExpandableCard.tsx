'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PremiumCard from './PremiumCard';

interface ExpandableCardProps {
  id: string;
  title: string;
  subtitle?: string;
  description: React.ReactNode;
  tags?: string[];
  icon?: string;
  imageSrc?: string;
  className?: string;
}

export default function ExpandableCard({
  id,
  title,
  subtitle,
  description,
  tags,
  icon,
  imageSrc,
  className = '',
}: ExpandableCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
      >
        <PremiumCard tilt={false} className="h-full pointer-events-none">
          <div className="flex flex-col h-full p-8 md:p-10 group">
            {imageSrc && (
              <motion.img
                layoutId={`image-${id}`}
                src={imageSrc}
                alt={title}
                className="w-full h-48 object-cover rounded-2xl mb-6"
              />
            )}
            {!imageSrc && icon && (
              <motion.span
                layoutId={`icon-${id}`}
                className="material-symbols-outlined text-4xl text-sage mb-6 block"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {icon}
              </motion.span>
            )}
            
            {subtitle && (
              <motion.span
                layoutId={`subtitle-${id}`}
                className="font-mono text-label-sm uppercase tracking-[0.14em] text-sage-mid mb-3 block"
              >
                {subtitle}
              </motion.span>
            )}
            
            <motion.h3
              layoutId={`title-${id}`}
              className="font-display text-display-3 text-ink text-balance mb-4"
            >
              {title}
            </motion.h3>

            {/* Preview texto cortado */}
            <motion.div
              layoutId={`content-preview-${id}`}
              className="text-left font-body text-[0.95rem] leading-relaxed text-ink-soft line-clamp-3 mb-6"
            >
              {description}
            </motion.div>

            <div className="mt-auto flex justify-between items-center pt-4 border-t border-line">
              {tags && tags.length > 0 && (
                <div className="flex gap-2 flex-wrap max-w-[70%]">
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
              <span className="material-symbols-outlined text-sage transition-transform group-hover:translate-x-1 ml-auto">
                add_circle
              </span>
            </div>
          </div>
        </PremiumCard>
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-12">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            
            <motion.div
              layoutId={`card-${id}`}
              className="relative w-full max-w-3xl max-h-[90vh] bg-surface dark:bg-surface-alt rounded-3xl shadow-2xl overflow-y-auto z-10 flex flex-col"
            >
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 z-20 w-10 h-10 flex items-center justify-center bg-canvas-alt/80 hover:bg-canvas-alt rounded-full text-ink transition-colors"
                aria-label="Cerrar modal"
              >
                <span className="material-symbols-outlined">close</span>
              </button>

              <div className="p-8 md:p-12 flex flex-col">
                {imageSrc && (
                  <motion.img
                    layoutId={`image-${id}`}
                    src={imageSrc}
                    alt={title}
                    className="w-full h-64 md:h-80 object-cover rounded-2xl mb-8"
                  />
                )}
                {!imageSrc && icon && (
                  <motion.span
                    layoutId={`icon-${id}`}
                    className="material-symbols-outlined text-5xl text-sage mb-8 block"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {icon}
                  </motion.span>
                )}
                
                {subtitle && (
                  <motion.span
                    layoutId={`subtitle-${id}`}
                    className="font-mono text-label-sm uppercase tracking-[0.14em] text-sage-mid mb-4 block"
                  >
                    {subtitle}
                  </motion.span>
                )}
                
                <motion.h3
                  layoutId={`title-${id}`}
                  className="font-display text-4xl md:text-5xl text-ink text-balance mb-8"
                >
                  {title}
                </motion.h3>

                <motion.div
                  layoutId={`content-preview-${id}`}
                  className="text-left font-body text-lg leading-relaxed text-ink-soft space-y-4"
                >
                  {description}
                </motion.div>
                
                {tags && tags.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mt-10 flex gap-2 flex-wrap pt-6 border-t border-line"
                  >
                    {tags.map((tag) => (
                      <span key={tag} className="text-sm bg-sage-wash text-sage px-3 py-1.5 rounded-md">
                        {tag}
                      </span>
                    ))}
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
