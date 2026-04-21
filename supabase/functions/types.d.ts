// ============================================================================
// Ambient type shims para el TypeScript server de Cursor/VSCode.
// ----------------------------------------------------------------------------
// El código bajo supabase/functions/ corre en Deno (no Node). El TS server
// estándar no conoce el global `Deno` ni los imports via URL de esm.sh.
// Estas declaraciones son SOLO para el IDE — Deno resuelve todo en runtime.
//
// Si tienes la extensión "Deno" (denoland.vscode-deno) instalada y activada
// por .vscode/settings.json, el Deno LSP toma el control y este archivo se
// vuelve redundante (pero inofensivo).
// ============================================================================

// ---------------------------------------------------------------------------
// Deno global namespace — subset mínimo que usamos
// ---------------------------------------------------------------------------
declare namespace Deno {
  interface Env {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    toObject(): Record<string, string>;
  }
  export const env: Env;

  interface ServeHandler {
    (request: Request): Response | Promise<Response>;
  }
  export function serve(handler: ServeHandler): void;
  export function serve(options: { port?: number; hostname?: string }, handler: ServeHandler): void;
}

// ---------------------------------------------------------------------------
// URL imports de esm.sh / deno.land — se resuelven en runtime vía import map
// de deno.json. Declaramos shims amplios para que el TS server no explote.
// Los tipos reales los valida Deno al desplegar.
// ---------------------------------------------------------------------------

// Wildcard para cualquier URL esm.sh (Deno resuelve en runtime).
declare module "https://esm.sh/*" {
  interface SupabaseClientGeneric {
    // deno-lint-ignore no-explicit-any
    [key: string]: any;
  }

  export interface SupabaseClient extends SupabaseClientGeneric {
    // deno-lint-ignore no-explicit-any
    auth: any;
    // deno-lint-ignore no-explicit-any
    from(table: string): any;
    // deno-lint-ignore no-explicit-any
    rpc(fn: string, args?: Record<string, unknown>): any;
  }

  export function createClient(
    url: string,
    key: string,
    options?: Record<string, unknown>,
  ): SupabaseClient;

  // Fallback: cualquier otro export se acepta como unknown.
  // deno-lint-ignore no-explicit-any
  const anyExport: any;
  export default anyExport;
}
