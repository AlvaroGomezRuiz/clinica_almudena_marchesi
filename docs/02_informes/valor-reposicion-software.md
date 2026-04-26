# Auditoría de valor del software (revisión honesta)

> **Fecha:** 2026-04-26 · **Revisión 3** (sustituye bandas de informes anteriores si hubiera conflicto: prevalece este + el código en repo).  
> **Alcance:** valor de **reemplazo** del repositorio (código, SQL, Edge) para **una sola** clínica, sin hinchar el techo a modelo “consultora Big Four + reescritura total bajo auditoría 24/7”.

**Excluye (explícitamente):** negocio clínico, marca, cartera de pacientes, DPO externo, DPIA formal, diseño de marca, fotografía, campañas, horas de terapia.

---

## 0. Nota de método (cómo se fijan las cifras)

1. Se parte del **tamaño real** del repositorio (líneas en `frontend/src` ≈ **28.000** para `*.ts` / `*.tsx` en conteo de sistema de archivos; *no* es una métrica de “complejidad lógica pura” pero evita cifras manifiestamente dispares).  
2. Se aplica un **rango de horas** de reimplementación competente (Next + Supabase + RLS + Stripe, sin inventar 800 h de fricción artificial).  
3. Se multiplica por **tarifas de mercado PYME / autónomo** en España (35–55 €/h) para re-posición, no 85 €/h de *strategy deck* a menos que se documente ese presupuesto aparte.  
4. Se separa el valor de **vender el repo** “as is” (casi inexistente como mercado) del valor de **sustituir** el entregable.

---

## 1. Tamaño objetivo del repositorio (abril 2026)

| Área | Método | Orden de magnitud |
|------|--------|-------------------|
| `frontend/src` (`.ts` + `.tsx`) | Conteo de líneas recursivo en PowerShell | **≈ 28.000 líneas** (± rutas con `[` que algunos conteos no expanden) |
| `supabase/migrations` | 50+ ficheros `.sql` | **Varios miles** de líneas de SQL (muchos fixes y stubs de reconciliación) |
| `supabase/functions` + `_shared` | 11 funciones con `index.ts` + shared | **≈ 2.5k–3.5k** líneas TS Deno, según crecimiento |
| `frontend/e2e` | Especificaciones Playwright | **Varios cientos** de líneas (smoke, cierre, a11y, reservas, pago) |

**Honestidad:** en migraciones hay **stubs** o migraciones mínimas de *repair*; el “SQL de producto” no se reparte uniformemente. El LOC de UI tampoco: `types.ts` y `AgendaClient` inflan contadores sin mapear 1:1 a lógica de cifrado nueva.

**Orden de magnitud global aceptable:** **~35k–40k** líneas productivas (TS+TSX+SQL relevante) si se incluyen migraciones y Edge, más documentación en `docs/`.

---

## 2. Desglose en bloques (horas creíbles de re-hacer *desde cero*)

| Bloque de trabajo | Horas razonables (banda) |
|-------------------|--------------------------|
| Modelo de datos + RLS + RPCs núcleo (citas, pacientes, disponibilidad, conflictos) | 100–200 |
| Cifrado, vault, blind index, ajustes RGPD serios y revisión de fugas | 70–140 |
| Stripe: PI, webhooks, idempotencia, bonos, bono manual 0040+0057 | 50–100 |
| UI admin + portal (muchos flujos y accesibilidad) | 140–240 |
| Chat + Realtime + adjuntos + cifrado de mensaje + vistas | 50–100 |
| Email Resend + crons + preferencias de rebote | 30–60 |
| Hardening: rate limits, upload, Geo opcional, CSP, SEO, JSON-LD | 40–80 |
| E2E, documentación, operación, checklist | 30–60 |
| **Suma (centro bajo a centro alto)** | **≈ 500–1000 h** (no 1500) |

**Anchor para “reposición con proveedor medianamente bueno”:** tratar **320–550 h** como el tramo de mercado asumido para cálculo, no el peor caso 800+.

---

## 3. Banda de valor en euros (IVA al margen, España 2026)

| Parámetro | Suelo (conservador) | Centro (defendible) | Techo (aún razonable) |
|-----------|--------------------|--------------------|------------------------|
| Horas × tarifa 35 / 45 / 55 €/h | 11.2k @ 320×35 | 18.0k @ 400×45 | 30.2k @ 550×55 |

### Banda recomendada (texto fijo)

- **Reimplementar** el **mismo alcance funcional** hoy, con tercer equipo competente, sin *gold-plating* de re-auditoría continua: **~11.000 € – 32.000 €** con ancla verbal **frecuente** en **~14.000 € – 24.000 €** (cierre típico PYME).  
- **Teórico 72k €+** de informes viejos **solo** aparece con **(horas >800) × (tarifas 80–90) × reescritura cero riesgo**: **no aplica** a un producto *single-tenant* ya resuelto en un monorepo.

- **Venta aislada del repositorio** a un tercero sin contexto: **~2.500 € – 9.000 €** — el techo bajo no es calidad, es **falta de liquidez de un activo tan específico**.

### Sprint de cierre intenso (si se factura aparte)

- Marginal de **2–3 semanas** a lo intensivo: **~80–140 h × 40–55 €/h → ~3.200 – 7.700 €** adicionales, **no** confundir con el valor de todo el activo.

---

## 4. Conclusión en una frase

El repositorio es un **activo de ingeniería serio** para una clínica **única**; su valor de **reposición razonable** está en la **banda de decenas de miles bajos a medianos**, y **no** razona como venta de licencia *off-the-shelf* a escala nacionales — salvo que haya un comprador *estratégico* con sinergia (poco frecuente).

---

## 5. Dónde no aplica esto (lista taxativa)

| Concepto | Por qué se excluye de la cifra |
|----------|---------------------------------|
| Valor de la práctica (pacientes, recurrencia) | Económicas de clínica; no de código. |
| Horas de psicóloga | Fuera de TI. |
| Cumplimiento *solo* legal (DPIA, bufete) | Presupuestos a parte. |
| Infra recurrente futura 10 años | TCO, no reemplazo una vez. |

*Si el mercado, salarios o el alcance del repo divergen significativamente, re-ejecutar el §1 (LOC) y re-anclar; no reutilizar este texto dentro de 18 meses sin re-medición.*
