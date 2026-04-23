# Auditoría de valor del software (revisión honesta)

> **Fecha:** 23 de abril de 2026 · **Revisión 2** (corrige bandas de la primera versión).  
> **Alcance:** código del monorepo medido en disco + criterio de mercado **realista** (freelance / pequeño proveedor España), no tarifa “consultora enterprise” ni venta de startup.  
> **Excluye:** marca, pacientes, ingresos recurrentes, activos legales fuera del repo.

---

## 0. Corrección respecto a la primera versión del informe

La banda **32.000 € – 72.000 €** era **demasiado alta** para este proyecto concreto.

**Por qué estaba mal:**

- Se partió de **600–1.170 h** como si un **segundo equipo** fuera a reescribir todo desde cero con fricción máxima y control de calidad tipo auditoría externa continua. Eso es un modelo de “seguro todo riesgo”, no el coste habitual de un **producto single-tenant** ya resuelto en un solo codebase.
- Se aplicó tarifa **55–85 €/h** mezclando consultoría senior pura con trabajo de implementación; en la práctica, muchas horas de UI, SQL y integraciones se facturan (o se internalizan) **por debajo** de ese rango en PYMEs y autónomos.
- **No se contrastó con el tamaño real del código** antes de fijar horas.

Este documento **sustituye** esas cifras por otras **ancladas al repo** y a un rango de mercado defendible.

---

## 1. Qué es este producto (sin hinchar el pecho)

Una aplicación **a medida para una sola clínica**: web pública, portal paciente, admin, Postgres con RLS, cifrado de datos sensibles, Stripe, emails, chat realtime, PDFs, documentación y endurecimiento de seguridad.

Es **mucho más** que un WordPress con plugin de citas, pero **no** es un ERP hospitalario multi-centro ni un producto SaaS con roadmap comercial y equipo de ventas.

---

## 2. Mediciones objetivas del repositorio (abril 2026)

Conteo aproximado con herramientas locales (`Get-Content`, líneas no vacías por fichero):

| Área | Ficheros (aprox.) | Líneas (aprox.) |
|------|-------------------|-----------------|
| `frontend/src` (`*.ts` / `*.tsx`) | ~167 | **~25.500** |
| `supabase/migrations` (`*.sql`) | 89 | **~5.900** |
| `supabase/functions` (`*.ts`, recursivo) | ~17 | **~3.000** |
| `frontend/e2e` (`*.ts`) | ~7 | **~300** |

**Notas honestas sobre esas cifras:**

- En migraciones hay **decenas de ficheros stub** de unas pocas líneas (historial CLI); el SQL “de producto” está concentrado en **~40 migraciones** serias, no en 89 piezas iguales de complejidad.
- `types.ts` y componentes grandes (`AgendaClient`, `ChatPanel`, ficha admin) suben LOC **sin** equivaler a la misma densidad de lógica de negocio que una RPC nueva de cifrado; el LOC solo orienta **orden de magnitud**.

**Orden de magnitud global:** del orden de **30.000–35.000 líneas** de código productivo (TS/TSX/SQL relevante), más documentación en `docs/`.

---

## 3. Traducción a horas (modelo conservador, no “película de miedo”)

Para **rehacer** algo equivalente (mismo alcance funcional, sin copiar/pegar este repo), una estimación **razonable** para un full-stack competente en Next + Supabase sería:

| Bloque | Horas creíbles |
|--------|----------------|
| Modelo datos + RLS + RPCs núcleo (citas, pacientes, disponibilidad) | 90–160 |
| Cifrado, vault, blind index, correcciones RGPD serias | 60–120 |
| Stripe + webhooks + idempotencia + bonos | 45–85 |
| Portales UI admin + paciente (muchas pantallas) | 120–200 |
| Chat + storage + adjuntos + realtime | 40–75 |
| Emails Resend + cron + preferencias | 30–55 |
| SEO/GEO técnico, CSP, rate limits, hardening | 35–65 |
| E2E/a11y parcial, docs operativas | 25–50 |
| **Total** | **≈ 445–810 h** |

La primera versión del informe se quedaba en la **parte alta** de un rango parecido y además subía tarifa: por eso explotaba a **30k+**.

Aquí se usa el **centro–bajo** del rango horario para “reposición con proveedor medianamente eficiente”, no el peor caso:

- **Horas ancla para valor de mercado:** **~320–520 h** de trabajo humano efectivo (mezcla implementación + revisión; parte del mecanográfico acelerado con IA en el proyecto real).

---

## 4. Tarifa y bandas en euros (IVA fuera; mercado España 2026)

**Tarifa de mercado “real”** para este tipo de trabajo (mezcla senior en decisiones críticas + implementación):

- **35–55 €/h** como autónomo / pequeño estudio que compite por PYME (no Big Four).

**Producto (reposición encargada a terceros):**

| Escenario | Cálculo orientativo | Resultado |
|-----------|---------------------|------------|
| Suelo | 320 h × 35 €/h | **~11.200 €** |
| Centro | 400 h × 45 €/h | **~18.000 €** |
| Techo razonable | 520 h × 55 €/h | **~28.600 €** |

### Banda recomendada (sincera)

- **Si mañana pagas a alguien para reimplementar el mismo alcance** (sin contar duplicar errores ni pagar abogados externos): **~10.000 € – 24.000 €**, siendo lo más defendible el intervalo **~12.000 € – 20.000 €**.
- **Si vendieras solo el código “as is”** (sin garantía, sin conocimiento tácito, poco mercado para “comprar repo de clínica ajena”): **~2.500 € – 8.000 €** — aquí el valor es bajo **no** porque el código sea malo, sino porque **casi nadie compra** este tipo de activo fuera de contexto.

### Qué pasó con “72.000 €”

Solo se llega ahí si se mezclan **>800 h** con **tarifa consultora 80–90 €/h** y se asume rehacer **todo** con proceso tipo auditoría continua. Eso **no describe** el tamaño ni el contexto de este repo: sería **honestamente inflado** para una sola clínica y un solo producto.

---

## 5. Los 15 días intensivos (qué representan en dinero)

No “valen” el proyecto entero. Como **marginal** de un sprint de cierre (asumiendo muchas horas diarias y parte de coordinación):

- **~80–140 h** × **40–55 €/h** → **~3.200 € – 7.700 €** de trabajo incremental facturable en mercado autónomo, **además** del tiempo ya invertido antes en el repositorio.

---

## 6. Qué sigue sin incluir este documento

- Abogado, DPIA formal, DPO, seguros.
- Diseño gráfico, fotografía, campañas.
- Infra recurrente (Vercel, Supabase, Stripe, dominios).
- Valor del negocio clínico (eso es otro orden de magnitud y otra disciplina).

---

## 7. Conclusión en una frase

Este repo es **un activo técnico serio de PYME**: por encima de unos pocos miles de euros si lo valoras por **coste de reposición razonable**, y **por debajo de ~25.000 €** si se evita inflar horas y tarifas de consultora grande; **no** razona vender el código suelto por decenas de miles, y la versión anterior del informe **sobreestimaba** esa parte.
