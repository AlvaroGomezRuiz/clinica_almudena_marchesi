# Despliegue y operación — Proveedores, checklist y secretos

**Web en producción:** [https://ampsicologia.es](https://ampsicologia.es)
**Última revisión:** 28 de abril de 2026

Este documento es la **lista de proveedores**, **variables que configuran la web** y **comprobaciones antes de dar por cerrado un cambio importante**. La titular puede leer la primera mitad para saber **en qué empresas confiáis**; la segunda mitad es más **técnica**.

---

## Mapa de proveedores (quién hace qué)

| Proveedor (marca) |                 Qué hace por vosotros                     |   Zona habitual   |              Nota para la clínica               |
|-------------------|-----------------------------------------------------------|-------------------|-------------------------------------------------|
| Vercel            | Sirve la web y la hace rápida cerca del usuario           | UE                | Pagáis según plan y tráfico                     |
| Supabase          | Base de datos, cuentas, archivos, programitas de servidor | Frankfurt (UE)    | Ahí viven los datos                             |
| Stripe            | Cobros con tarjeta y métodos modernos                     | Internacional PCI | Comisiones por cobro                            |
| Resend            | Correos transaccionales (confirmaciones, etc.)            | UE típica         | Requiere dominio bien configurado               |
| Sentry            | Registro de errores para diagnóstico                      | UE típica         | Ayuda al técnico, no sustituye el sentido común |
| Upstash (opcional)| Limitar abusos de robots o ataques de prueba              | Global            | Opcional según proyecto                         |

---

## Variables en Vercel (nombres que verá quien despliegue)

|           Nombre de variable         | Tipo de dato  |                     Qué es en cristiano                     |
|--------------------------------------|---------------|-------------------------------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`           | Público       | Dirección del “cerebro de datos”                            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`      | Público       | Llave pública; igualmente no basta para saltarse las reglas |
| `SUPABASE_SERVICE_ROLE_KEY`          | Solo servidor | Llave muy sensible: **no** en WhatsApp ni capturas          |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Público       | Llave pública de cobros                                     |
| `NEXT_PUBLIC_SENTRY_DSN`             | Público       | Identificador del proyecto de errores                       |
| `SENTRY_AUTH_TOKEN`                  | Servidor / CI | Para subir mapas de depuración (si se usan)                 |
| `NEXT_PUBLIC_APP_URL`                | Público       | Debe ser `https://ampsicologia.es`                          |

Hay más variables en el ejemplo `.env` del frontend; quien mantenga el proyecto las rellena.

---

## Secretos en Supabase (programas en el servidor)

|     Nombre del secreto    |                   Para qué sirve                 |
|---------------------------|--------------------------------------------------|
| `STRIPE_SECRET_KEY`       | Operar cobros en nombre de la clínica            |
| `STRIPE_WEBHOOK_SECRET`   | Comprobar que un aviso de Stripe **no es falso** |
| `RESEND_API_KEY`          | Mandar correos desde el servidor                 |
| `RESEND_FROM_EMAIL`       | Dirección “De:” verificada                       |
| `CRON_SECRET`             | Proteger las tareas automáticas (recordatorios)  |
| `SENTRY_DSN`              | Errores de los programas del servidor            |
| `FRONTEND_URL`            | Enlaces correctos dentro de los correos          |
| `FACTURA_EMISOR_*`        | Datos fiscales que salen en el PDF de factura    |

---

## Cómo se publica una nueva versión de la web

```bash
cd frontend
vercel deploy --prod
```

Según el proyecto, a veces basta con **subir cambios a Git** y Vercel construye solo.

### Publicar también los “programitas” del servidor (Edge)

```bash
supabase functions deploy send-email --project-ref <ref>
supabase functions deploy stripe-webhook --project-ref <ref>
supabase functions deploy cron-recordatorios-24h --project-ref <ref>
```

El técnico despliega **todos** los que hayan cambiado en `supabase/functions/`.

---

## Checklist antes de dar por “cerrado” un cambio grande

### Seguridad y cuentas

|                            Comprobación                          | Hecho (sí / no) |
|------------------------------------------------------------------|-----------------|
| Las llaves secretas **solo** en entornos seguros                 |       [ ]       |
| La cuenta de administración tiene **segundo factor**             |       [ ]       |
| Copias de seguridad automáticas de la base activas               |       [ ]       |
| Límites de intentos de login revisados en el panel del proveedor |       [ ]       |

### Cobros (Stripe)

|                          Comprobación                  | Hecho (sí / no) |
|--------------------------------------------------------|-----------------|
| Modo **real** activado solo cuando toque               |       [ ]       |
| La dirección del “webhook” apunta al servidor correcto |       [ ]       |
| El secreto del webhook **coincide** con el de Stripe   |       [ ]       |

### Correo

|               Comprobación             | Hecho (sí / no) |
|----------------------------------------|-----------------|
| Dominio verificado (SPF, DKIM, DMARC)  |       [ ]       |
| Correo de “entrar a la cuenta” probado |       [ ]       |

### Datos y pruebas

|                               Comprobación                            | Hecho (sí / no) |
|-----------------------------------------------------------------------|-----------------|
| Datos de demostración borrados en producción                          |       [ ]       |
| Cifrado listo (preguntar al técnico: función de comprobación en base) |       [ ]       |
| Usuarios reales con contraseñas fuertes                               |       [ ]       |

### Dominio

|                      Comprobación                     | Hecho (sí / no)  |
|-------------------------------------------------------|------------------|
| `ampsicologia.es` apunta a Vercel según su guía       |       [ ]        |
| Las URLs permitidas en el login incluyen vuestra web  |       [ ]        |
| No mezclar `www` y sin `www` sin decidirlo            |       [ ]        |

### Vigilancia

|                   Comprobación                |  Hecho (sí / no)  |
|-----------------------------------------------|-------------------|
| Alertas de errores configuradas               |       [ ]         |
| Ping externo a una URL de “salud del sistema” |       [ ]         |

---

## Si filtra un secreto (actuar ya)

|        Secreto filtrado       |                Dónde generar uno nuevo           |
|-------------------------------|--------------------------------------------------|
| Llave de servicio Supabase    | Panel de Supabase → API                          |
| Llave secreta Stripe          | Panel de Stripe                                  |
| Secreto del webhook           | Crear endpoint nuevo en Stripe                   |
| API Key de Resend             | Panel de Resend                                  |
| Clave maestra de cifrado      | Vault + plan de re-cifrado (solo técnico senior) |

---

## Soporte humano para la clínica

|         Necesidad      |               Dónde está la ayuda escrita                |
|------------------------|----------------------------------------------------------|
| Uso diario de la web   | `docs/03_cliente/manual-plataforma-cliente.md`           |
| Resumen para dirección | `docs/03_cliente/informe-ejecutivo.md`                   |
| Incidencia técnica     | Contacto acordado + hora + pantalla (sin datos clínicos) |
