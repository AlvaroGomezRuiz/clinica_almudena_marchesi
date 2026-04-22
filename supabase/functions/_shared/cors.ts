// Cabeceras CORS compartidas por todas las Edge Functions
// Restringido al origen de producción + localhost dev
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "https://clinica-almudena.vercel.app",
  "https://ampsicologia.es",
  "https://www.ampsicologia.es",
  "https://amclinicapsicologia.es",
  "https://www.amclinicapsicologia.es",
  Deno.env.get("FRONTEND_URL") ?? "",
].filter(Boolean);

export function buildCorsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function handleOptions(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: buildCorsHeaders(req.headers.get("origin")),
    });
  }
  return null;
}
