'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

interface PrivacyContextValue {
  /** Si true, los datos clínicos deben quedar desenfocados. */
  isPrivacyActive: boolean;
  /** Alternar manualmente el modo privacidad. */
  togglePrivacy: () => void;
}

const PrivacyContext = createContext<PrivacyContextValue>({
  isPrivacyActive: false,
  togglePrivacy: () => {},
});

export function usePrivacy(): PrivacyContextValue {
  return useContext(PrivacyContext);
}

/**
 * PrivacyProvider — "Modo Pánico" Anti-Vigía.
 *
 * Activa automáticamente el desenfoque de datos clínicos cuando:
 *   - El usuario cambia de pestaña (visibilitychange → hidden)
 *   - La ventana pierde el foco (window.onblur)
 *
 * Se desactiva cuando el usuario vuelve a la pestaña/ventana,
 * o manualmente con el botón de privacidad.
 */
export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [isPrivacyActive, setIsPrivacyActive] = useState(false);

  const togglePrivacy = useCallback(() => {
    setIsPrivacyActive((prev) => !prev);
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setIsPrivacyActive(true);
      } else {
        // Al volver a la pestaña, desactivar automáticamente
        setIsPrivacyActive(false);
      }
    };

    const handleBlur = () => {
      setIsPrivacyActive(true);
    };

    const handleFocus = () => {
      setIsPrivacyActive(false);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Aplicar/quitar la clase global en <body> para el CSS de desenfoque
  useEffect(() => {
    if (isPrivacyActive) {
      document.body.classList.add('privacy-blur');
    } else {
      document.body.classList.remove('privacy-blur');
    }
    return () => {
      document.body.classList.remove('privacy-blur');
    };
  }, [isPrivacyActive]);

  return (
    <PrivacyContext.Provider value={{ isPrivacyActive, togglePrivacy }}>
      {children}
    </PrivacyContext.Provider>
  );
}
