# Valoración del proyecto — Clínica Almudena Marchesi

> **Confidencial**
> **Fecha:** 28 de abril de 2026
> **Elaborado por:** Álvaro Gómez Ruiz, Developed Freelance
> **Para:** Almudena Marchesi Fernández
> **Web entregada:** [https://ampsicologia.es](https://ampsicologia.es)

Este documento hace **tres cosas a la vez**: explica **qué se ha construido** en lenguaje cercano; da **cifras de mercado** para que podáis comparar; y cuenta el **“por qué”** de las decisiones más importantes (seguridad, cobros, datos en Europa). No sustituye a un contrato firmado: es **memoria de valoración**.

Para el uso diario de la web, el documento principal es **`manual-plataforma-cliente.md`**.

---

## 1. Qué se ha construido (tres bloques grandes)

|           Bloque        |                 Qué es para el paciente y para la clínica                  |
|-------------------------|----------------------------------------------------------------------------|
| Web pública             | Escaparate: servicios, confianza, contacto, textos legales y registro      |
| Portal del paciente     | Su “área privada”: citas, pagos, mensajes, material y facturas             |
| Panel de administración | Vuestro “puesto de trabajo digital”: agenda, fichas, facturación, recursos |

### Por qué van los tres en el mismo dominio

|           Alternativa descartada                |                            Inconveniente                         |
|-------------------------------------------------|------------------------------------------------------------------|
| Web de marketing en un sitio y “la app” en otro | Confunde al paciente y debilita el posicionamiento en buscadores |
| Solo web sin portal                             | Sigue habiendo WhatsApp suelto, Excel y errores manuales         |
| Solo portal sin web pública                     | Perdéis visitas que aún no se animan a registrarse               |

---

## 2. Lo “invisible” que más valor tiene

|                 Pieza invisible             |                 En qué ayuda a la clínica                     |
|---------------------------------------------|---------------------------------------------------------------|
| Cifrado de datos muy sensibles              | Menos daño si hubiera una fuga técnica de copias de seguridad |
| Reglas estrictas en base de datos           | Un paciente no lista a otros aunque lo intente desde fuera    |
| Cobros con Stripe                           | No guardáis números de tarjeta “en casa”                      |
| Solo tráfico desde ES / PT / AD             | Menos ruido malicioso desde el resto del mundo                |
| Registros de auditoría                      | Podéis demostrar quién consultó datos delicados               |
| Programas en servidor para cobros y correos | Los secretos no viven en el móvil del paciente                |

---

## 3. Comparativa de mercado (orden de magnitud)

### Presupuestos típicos si se encarga a terceros (España, 2026, referencias sectoriales)

|           Tipo de proveedor          | Banda de precio aproximada | Plazo orientativo |
|--------------------------------------|----------------------------|-------------------|
| Profesional autónomo senior          |    15.000 € – 25.000 €     |   2 a 3 meses     |
| Agencia digital pequeña (ciudad)     |    20.000 € – 35.000 €     |   3 a 4 meses     |
| Agencia mediana                      |    35.000 € – 55.000 €     |   4 a 6 meses     |
| Consultora grande                    | 50.000 € – 100.000 € o más |   6 a 12 meses    |

### Por qué un sistema así cuesta lo que cuesta (desglose conceptual)

|     Parte del trabajo       |   Banda de precio si se contratara suelta |                      Por qué cuesta                    |
|-----------------------------|-------------------------------------------|--------------------------------------------------------|
| Web pública profesional     |             3.000 € – 6.000 €             | Diseño, textos, SEO técnico, rendimiento               |
| Portal con reservas y pagos |             5.000 € – 10.000 €            | Estados, cancelaciones, pruebas reales                 |
| Panel clínico               |             5.000 € – 12.000 €            | Permisos, historias, exportaciones                     |
| Integración de cobros       |             2.000 € – 5.000 €             | Avisos automáticos, idempotencia, bonos                |
| Chat en vivo cifrado        |             3.000 € – 6.000 €             | Tiempo real, adjuntos, privacidad                      |
| Cifrado clínico serio       |             4.000 € – 8.000 €             | Claves, migraciones, pruebas                           |
| RGPD en salud               |             3.000 € – 7.000 €             | Solicitudes, minimización, trazas                      |
| Correos transaccionales     |             2.000 € – 4.000 €             | Plantillas, entregas, deduplicación                    |
| Facturas PDF                |             1.500 € – 3.000 €             | Datos fiscales, numeración                             |
| Hardening de seguridad      |             2.000 € – 5.000 €             | Cabeceras, límites, revisiones                         |
| **Suma orientativa**        |          **30.500 € – 66.000 €**          | Un proyecto integrado suele ser algo menor que la suma |

---

## 4. Esfuerzo de desarrollo (cifras de referencia)

|               Concepto               |             Cifra indicativa               |
|--------------------------------------|--------------------------------------------|
| Fecha de inicio (referencia interna) | 7 de abril de 2026                         |
| Cierre de documentación              | 28 de abril de 2026                        |
| Intensidad declarada                 | Del orden de **tres semanas** muy cargadas |
| Horas totales estimadas              | **~273 h**                                 |
| Migraciones de base de datos         | **66+** ficheros versionados               |
| Pantallas o rutas de la aplicación   | **50+**                                    |
| Programas en servidor (Edge)         | **10+** según carpeta del proyecto         |

### Por qué importan las horas (más allá del número)

|                    Idea                |                       Explicación                            |
|----------------------------------------|--------------------------------------------------------------|
| No es “escribir código” solo           | Hay pruebas, seguridad, despliegue y documentación           |
| Un proyecto clínico barato sin pruebas | Acaba en incidentes, pérdida de confianza y coste de arreglo |

---

## 5. Valor de reposición (si hubiera que rehacerlo desde cero)

| Banda |        Rango        |                Cuándo aplicaría                |
|-------|---------------------|------------------------------------------------|
| Baja  | 12.000 € – 18.000 € | Freelance muy eficiente, menos formalización   |
| Media | 20.000 € – 35.000 € | Pequeña agencia con proyecto manager           |
| Alta  | 40.000 € – 60.000 € | Consultora con redundancia y compliance formal |

No incluye: tiempo de conocer el **matiz clínico** ni decisiones de contenido con la titular.

---

## 6. Precio acordado del proyecto y forma de pago

### Precio del trabajo de plataforma: 5.000 €

|               Pregunta                |                                                  Respuesta                                                       |
|---------------------------------------|------------------------------------------------------------------------------------------------------------------|
| ¿Por qué está por debajo del mercado? | Por la relación profesional previa y porque los costes de terceros (hosting, dominio, comisiones) van **aparte** |
| ¿Qué representan esas horas?          | Ingeniería senior, arquitectura de datos sensibles y pruebas                                                     |

### Equivalencia en sesiones de terapia (ejemplo a 55 €/sesión)

| Concepto                           | Cálculo    |     Resultado     |
|------------------------------------|------------|-------------------|
| Precio total                       | 5.000 €    |                   |
| Menos abonado (ejemplo documental) | – 20 €     |                   |
| Pendiente orientativo              | 4.980 €    |                   |
| Sesiones equivalentes              | 4.980 ÷ 55 | **≈ 91 sesiones** |

### Qué suele incluir el precio cerrado del desarrollo

|                    Incluye                 |      No incluye (salvo acuerdo aparte)     |
|--------------------------------------------|--------------------------------------------|
| Código y despliegue en **ampsicologia.es** | Cuotas mensuales de Vercel, Supabase, etc. |
| Documentación en `docs/`                   | Funcionalidades nuevas no acordadas        |
| Parches de seguridad según lo acordado     | Formación presencial larga                 |

---

## 7. Resumen en una tabla

|             Concepto                |          Cifra o texto         |
|-------------------------------------|--------------------------------|
| Valor de mercado orientativo        | 20.000 € – 40.000 €            |
| Valor de reposición orientativo     | 12.000 € – 35.000 €            |
| Precio acordado del desarrollo      | **5.000 €**                    |
| Ahorro orientativo frente a mercado | Muy alto (orden 75 % – 87 %)   |
| Manual para el día a día            | `manual-plataforma-cliente.md` |

---

*Documento de valoración. No es factura ni contrato por sí solo.*
