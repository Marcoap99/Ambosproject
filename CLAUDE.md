# Ambos — estado del build

Este archivo es el resumen de decisiones ya tomadas, para no releer PRD.md/DESIGN_SYSTEM.md completos en cada sesión. Fuente de verdad funcional sigue siendo `PRD.md` (spec) y `DESIGN_SYSTEM.md` (tokens) — este archivo nunca los reemplaza, solo evita repetir el trabajo de derivarlos.

## Stack confirmado

- **Frontend/PWA**: Next.js (App Router, TypeScript), manifest + service worker.
- **Backend/DB**: Supabase (Postgres + Auth). Ya existe un proyecto cloud (`project_ref=ymzqgtkvopoqgbvhkitu`), conectado vía MCP server (`.mcp.json`) — M1 aplica el schema/RLS directo contra ese proyecto. Docker no está disponible en el sandbox remoto de Claude Code, así que no dependemos de `supabase start` local.
- **Captura de correo**: Gmail API `users.watch()` + Google Cloud Pub/Sub. Se activa recién en M3 (ver milestones).
- **Parseo NL**: Claude API para registro manual por chat (monto/categoría/medio).
- **Push**: Web Push estándar (VAPID).
- **Deploy**: Vercel + Supabase cloud — recién al cerrar M2, no antes.

## Auth (decisión M1)

Un solo OAuth de Google en el registro, pidiendo el scope `gmail.readonly` de una sola vez (como dice PRD §5.1 — no hay un segundo permiso pedido después). Los tokens quedan guardados (cifrados) pero **sin usarse** hasta M3: nadie llama `users.watch()` ni procesa correos antes de eso. Así no hay dos pantallas de permiso ni retrabajo de auth a mitad de camino.

## Milestones

| # | Estado | Qué incluye |
|---|---|---|
| M0 | 🟢 hecho | Scaffolding Next.js 16 + TS, PWA manifest, tokens de diseño, esqueleto Supabase, MCP de Supabase conectado al proyecto cloud |
| M1 | ⬜ | Migraciones completas (§6 del PRD) + RLS que fuerza §7.4 a nivel de BD, emparejamiento con invite code, `lib/balance.ts` con tests (§7.1–7.3), Google OAuth con scope Gmail |
| M2 | ⬜ | Check-in ("Hoy"), Clasificar (Personal/Pareja, slider split, categoría), registro manual por chat (Claude API), Saldo, Ciclos+Liquidar, Historial — todo con `source=manual`, sin Gmail |
| M3 | ⬜ | Pipeline Gmail: `watch()` + Pub/Sub + parseo → `Movement`, descarte silencioso sin confianza (§5.3) |
| M4 | ⬜ | Push VAPID (recordatorio 8pm), borrar cuenta (§8), estados vacíos/loading, remover copa de vino de `hug.jpg` si se decide regenerar |

## Reglas duras — nunca romper

1. **§7.1 Saldo bidireccional**: siempre se calcula sumando los `Movement` reales de los dos usuarios del `Couple` desde la base de datos. **Cero constantes hardcodeadas** tipo `PARTNER_ALREADY_SHARED`/`NET` — eso fue un hack exclusivo del wireframe de una sola pantalla, no existe en el build real.
2. **§7.4 Privacidad**: un usuario nunca ve los `Movement` sin clasificar (`classification IS NULL`) de su pareja. Se aplica con **RLS en Supabase**, no solo con un filtro en el frontend — es una regla de datos, no de UI.

## Cómo comunicar con Marco

No es developer — no preguntarle cosas técnicas (nombres de tablas, RLS, versiones de librerías). Explicar en plano qué se construyó y qué implica para el producto. Reservar preguntas para decisiones de producto/UX reales, nunca de implementación.

## Decisiones de implementación tomadas sin preguntar (M1)

Estas son inferencias técnicas razonables sobre huecos del PRD, no cambios de producto — documentadas acá para que quede registro, sin molestar a Marco con ellas:

- **"Efectivo" como medio de pago**: el PRD lo pide priorizado en el registro manual (§5.5) pero no está en el enum de `PaymentMethod.tipo` del onboarding (§5.1/§6). Se agregó `efectivo` al enum y se auto-crea ese `PaymentMethod` para cada usuario nuevo (no es seleccionable en onboarding, simplemente ya existe).

## Convenciones

- Idioma de UI: español (único idioma del MVP).
- Moneda: siempre PEN, sin multi-moneda.
- Commits en español o inglés técnico simple, uno por unidad de trabajo coherente (no uno por archivo).
