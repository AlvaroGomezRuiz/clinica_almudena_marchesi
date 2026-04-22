'use client';

/**
 * Controla visibilidad de acciones "editar por campo" en bloques de ficha
 * administrativa. Con `showFieldEditButtons === false` los campos sensibles
 * siguen revelables con ojo (RGPD), sin lápiz por campo hasta abrir la sección.
 */
import { createContext, useContext, type ReactNode, type JSX } from 'react';

export interface FichaSectionEditValue {
  readonly showFieldEditButtons: boolean;
}

const defaultValue: FichaSectionEditValue = { showFieldEditButtons: true };

const FichaSectionEditContext = createContext<FichaSectionEditValue>(defaultValue);

export function FichaSectionEditProvider({
  showFieldEditButtons,
  children,
}: {
  readonly showFieldEditButtons: boolean;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <FichaSectionEditContext.Provider value={{ showFieldEditButtons }}>
      {children}
    </FichaSectionEditContext.Provider>
  );
}

export function useFichaSectionEdit(): FichaSectionEditValue {
  return useContext(FichaSectionEditContext);
}
