/**
 * Misma lógica que en el front (`labelMetodoPago` / resumen pago) para cadenas
 * almacenadas en `pagos.metodo` (tipos de Stripe, etc.).
 */
export function metodoPagoLabel(metodo: string | null | undefined): string {
  if (metodo == null || String(metodo).trim() === "") return "—";
  const m = String(metodo).toLowerCase();
  if (m === "card" || m === "amex" || m === "visa" || m === "mastercard") {
    return "Tarjeta";
  }
  if (m === "bizum") return "Bizum";
  if (m === "link") return "Tarjeta o Stripe Link";
  if (m === "sepa_debit") return "Domiciliación SEPA";
  if (m === "klarna") return "Klarna";
  if (m === "efectivo") return "Efectivo";
  if (m === "tarjeta") return "Tarjeta";
  if (m === "transferencia") return "Transferencia";
  if (m === "regalo") return "Regalo";
  if (m === "apple_pay") return "Apple Pay";
  if (m === "google_pay" || m === "googlepay") return "Google Pay";
  if (m === "stripe" || m === "checkout") return "Pago en línea (Stripe)";
  return String(metodo);
}
