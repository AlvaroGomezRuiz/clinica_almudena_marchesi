'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Check, X, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

type ConsentState = 'granted' | 'denied' | 'custom' | null;

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true, // always true
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    // Check if user has already made a choice
    const savedConsent = localStorage.getItem('cookie-consent') as ConsentState;
    if (!savedConsent) {
      // Delay showing banner slightly for better UX
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const handleOpenCookies = () => {
      setIsVisible(true);
      setShowPreferences(true);
    };
    window.addEventListener('open-cookie-preferences', handleOpenCookies);
    return () => window.removeEventListener('open-cookie-preferences', handleOpenCookies);
  }, []);

  const updateGtagConsent = (analytics: boolean, marketing: boolean) => {
    if (typeof window !== 'undefined' && typeof (window as any).gtag === 'function') {
      (window as any).gtag('consent', 'update', {
        analytics_storage: analytics ? 'granted' : 'denied',
        ad_storage: marketing ? 'granted' : 'denied',
        ad_user_data: marketing ? 'granted' : 'denied',
        ad_personalization: marketing ? 'granted' : 'denied',
      });
    }
  };

  const handleAcceptAll = () => {
    updateGtagConsent(true, true);
    localStorage.setItem('cookie-consent', 'granted');
    localStorage.setItem('cookie-preferences', JSON.stringify({ analytics: true, marketing: true }));
    setIsVisible(false);
  };

  const handleRejectAll = () => {
    updateGtagConsent(false, false);
    localStorage.setItem('cookie-consent', 'denied');
    localStorage.setItem('cookie-preferences', JSON.stringify({ analytics: false, marketing: false }));
    setIsVisible(false);
  };

  const handleSavePreferences = () => {
    updateGtagConsent(preferences.analytics, preferences.marketing);
    localStorage.setItem('cookie-consent', 'custom');
    localStorage.setItem('cookie-preferences', JSON.stringify(preferences));
    setIsVisible(false);
    setShowPreferences(false);
  };

  if (!isVisible && !showPreferences) return null;

  return (
    <AnimatePresence>
      {isVisible && !showPreferences && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6"
        >
          <div className="mx-auto max-w-5xl rounded-2xl border border-stone-200/50 bg-white/90 p-6 shadow-2xl backdrop-blur-xl dark:border-stone-800/50 dark:bg-stone-900/90 md:flex md:items-center md:justify-between md:gap-8">
            <div className="mb-6 md:mb-0 md:flex-1">
              <div className="mb-2 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-stone-700 dark:text-stone-300" />
                <h2 className="text-lg font-medium text-stone-900 dark:text-stone-100">
                  Tu privacidad es prioritaria
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                Utilizamos cookies propias y de terceros para garantizar el correcto funcionamiento de la clínica digital, analizar nuestro tráfico y mejorar tu experiencia. Al hacer clic en "Aceptar todas", consientes el uso de todas las cookies. También puedes configurarlas a tu medida o rechazarlas.{' '}
                <Link href="/cookies" className="underline underline-offset-2 hover:text-stone-900 dark:hover:text-stone-200">
                  Leer política
                </Link>.
              </p>
            </div>
            
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                onClick={() => setShowPreferences(true)}
                className="flex items-center justify-center gap-2 whitespace-nowrap rounded-full border border-stone-200 px-5 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
              >
                <Settings className="h-4 w-4" />
                Configurar
              </button>
              <button
                onClick={handleRejectAll}
                className="whitespace-nowrap rounded-full border border-stone-200 px-5 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
              >
                Rechazar
              </button>
              <button
                onClick={handleAcceptAll}
                className="whitespace-nowrap rounded-full bg-stone-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
              >
                Aceptar todas
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {showPreferences && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-stone-900"
          >
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h3 className="text-xl font-medium text-stone-900 dark:text-stone-100">
                  Configuración de Cookies
                </h3>
                <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                  Selecciona qué tipo de cookies deseas permitir.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowPreferences(false);
                  if (!localStorage.getItem('cookie-consent')) setIsVisible(true);
                }}
                className="rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-medium text-stone-900 dark:text-stone-100">Estrictamente necesarias</h4>
                  <p className="text-sm text-stone-500 dark:text-stone-400">
                    Imprescindibles para que la web funcione (reservas, acceso a tu cuenta, seguridad). No se pueden desactivar.
                  </p>
                </div>
                <div className="flex h-6 w-11 items-center rounded-full bg-stone-900 p-1 opacity-60 dark:bg-stone-100">
                  <div className="h-4 w-4 translate-x-5 rounded-full bg-white dark:bg-stone-900" />
                </div>
              </div>

              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-medium text-stone-900 dark:text-stone-100">Análisis y rendimiento</h4>
                  <p className="text-sm text-stone-500 dark:text-stone-400">
                    Nos ayudan a entender cómo usas la web de forma anónima para poder mejorar el servicio (Google Analytics).
                  </p>
                </div>
                <button
                  onClick={() => setPreferences(p => ({ ...p, analytics: !p.analytics }))}
                  className={`flex h-6 w-11 items-center rounded-full p-1 transition-colors ${
                    preferences.analytics ? 'bg-stone-900 dark:bg-stone-100' : 'bg-stone-200 dark:bg-stone-700'
                  }`}
                >
                  <div
                    className={`h-4 w-4 rounded-full bg-white transition-transform dark:bg-stone-900 ${
                      preferences.analytics ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-medium text-stone-900 dark:text-stone-100">Marketing</h4>
                  <p className="text-sm text-stone-500 dark:text-stone-400">
                    Se utilizan para rastrear a los visitantes en las páginas web para mostrar anuncios relevantes (ej. Google Ads).
                  </p>
                </div>
                <button
                  onClick={() => setPreferences(p => ({ ...p, marketing: !p.marketing }))}
                  className={`flex h-6 w-11 items-center rounded-full p-1 transition-colors ${
                    preferences.marketing ? 'bg-stone-900 dark:bg-stone-100' : 'bg-stone-200 dark:bg-stone-700'
                  }`}
                >
                  <div
                    className={`h-4 w-4 rounded-full bg-white transition-transform dark:bg-stone-900 ${
                      preferences.marketing ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3 border-t border-stone-100 pt-6 dark:border-stone-800">
              <button
                onClick={handleRejectAll}
                className="rounded-full border border-stone-200 px-5 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
              >
                Rechazar todas
              </button>
              <button
                onClick={handleSavePreferences}
                className="rounded-full bg-stone-900 px-6 py-2 text-sm font-medium text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
              >
                Guardar preferencias
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
