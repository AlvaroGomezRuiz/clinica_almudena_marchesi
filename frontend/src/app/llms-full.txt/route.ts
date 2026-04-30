import { NextResponse } from 'next/server';

import {
  CLINIC_ADDRESS,
  CLINIC_CONTACT_EMAIL,
  CLINIC_PUBLIC_PHONE_DISPLAY,
  CLINIC_PUBLIC_PRESENCIAL_HOURS_SUMMARY_ES,
  CLINIC_PUBLIC_SITE_URL,
} from '@/lib/clinic';
import { CLINIC_PRIMARY_KEYWORDS } from '@/lib/seo/primary-keywords';
import { getGeoDiscoveryBrief } from '@/lib/seo/geo-discovery-brief';

export const dynamic = 'force-static';

function text(body: string): NextResponse {
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

export async function GET(): Promise<NextResponse> {
  const base = CLINIC_PUBLIC_SITE_URL.replace(/\/+$/, '');
  const kws = CLINIC_PRIMARY_KEYWORDS.join(' · ');

  return text(
    [
      '# llms-full.txt — Índice ampliado para motores generativos',
      '',
      '## Objetivo',
      'Contenido público informativo sobre clínica de psicología en Moncloa / Chamberí (Madrid).',
      'No indica trato clínico ni reemplaza consulta profesional. No hay datos de pacientes.',
      '',
      `## Consultas típicas (sólo informativo): ${kws}`,
      '',
      '## NAP (web pública; verificar con ficha local)',
      `Dirección: ${CLINIC_ADDRESS} (CP 28015, Madrid).`,
      `Tel: ${CLINIC_PUBLIC_PHONE_DISPLAY} · ${CLINIC_CONTACT_EMAIL}`,
      `Presencial: ${CLINIC_PUBLIC_PRESENCIAL_HOURS_SUMMARY_ES}`,
      'Cobertura informativa: Madrid (incl. barrio de Almagro en la capital, Chamartín; no Ciudad Real).',
      `Registro: ${base}/registro-paciente`,
      '',
      '## Descubrimiento estructurado (IA)',
      `${base}/ai/geo-facts.json (NAP+geo+servicios+limits; ficha mínima RAG)`,
      `${base}/ai/summary.json (NAP+geo+metadoc técnico; extendido)`,
      `${base}/sitemap.xml · ${base}/llms.txt`,
      '',
      '## Páginas (URLs absolutas)',
      `${base}/ (inicio)`,
      `${base}/sobre-mi`,
      `${base}/enfoque`,
      `${base}/servicios`,
      `${base}/contacto`,
      `${base}/registro-paciente`,
      '',
      '## Legal',
      `${base}/privacidad`,
      `${base}/cookies`,
      `${base}/aviso-legal`,
      '',
      '## Notas',
      '- Cita, mensajes o pagos: portal con autenticación (excluido de este índice con robots).',
      '',
      '## Brief ampliado (SEO semántico + interpretación local)',
      getGeoDiscoveryBrief(base),
      '',
    ].join('\n')
  );
}

