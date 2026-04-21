"use client";

// ============================================================================
// Next.js Global Error Boundary
// ----------------------------------------------------------------------------
// Captura errores de renderizado de React que escapan a los error boundaries
// de cada segmento. Sentry exige este archivo en App Router para enviar los
// errores SSR de componentes de cliente.
// ============================================================================

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps): JSX.Element {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: { area: "global-error" },
      fingerprint: ["global-error", error.name],
    });
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          margin: 0,
          padding: "2rem",
          background: "#fafaf9",
          color: "#1c1917",
        }}
      >
        <div style={{ maxWidth: "28rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.5rem" }}>
            Algo ha ido mal
          </h1>
          <p style={{ fontSize: "0.95rem", color: "#57534e", marginBottom: "1.5rem" }}>
            Se ha producido un error inesperado. Ya lo hemos registrado y lo
            revisaremos. Puedes intentar recargar la página.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "0.625rem 1.25rem",
              fontSize: "0.9rem",
              fontWeight: 500,
              borderRadius: "0.5rem",
              border: "1px solid #44403c",
              background: "#1c1917",
              color: "#fafaf9",
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
