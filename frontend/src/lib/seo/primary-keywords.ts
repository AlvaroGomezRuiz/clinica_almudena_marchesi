/**
 * Términos de intención local reutilizables en `metadata`, JSON-LD y `summary.json`.
 * Mantener alineado con NAP reales (Moncloa / Chamberí, Meléndez Valdés).
 */
export const CLINIC_PRIMARY_KEYWORDS = [
  'clínica psicología Moncloa',
  'psicólogo Moncloa Madrid',
  'psicóloga clínica Moncloa',
  'psicología clínica Chamberí',
  'terapia de pareja Moncloa',
  'psicóloga Chamberí 28015',
  'terapia psicológica Madrid',
  'consulta psicología Meléndez Valdés',
  'ansiedad y depresión Madrid',
  'psicólogo barrio de Almagro Madrid',
  'terapia online psicólogo Madrid',
  'psicóloga general sanitaria Madrid',
  'M-38427 psicóloga',
  'duelo y estrés Madrid',
  'terapia infanto juvenil Madrid',
] as const;

/**
 * Array mutable para el tipo `Metadata.keywords` (Next no acepta readonly anidado estricto).
 */
export function clinicPrimaryKeywordsList(): string[] {
  return [...CLINIC_PRIMARY_KEYWORDS];
}

/**
 * Un solo `Text` en schema.org (propiedad `keywords` de negocio local).
 */
export function clinicPrimaryKeywordsText(): string {
  return CLINIC_PRIMARY_KEYWORDS.join(', ');
}
