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
| M1 | 🟢 hecho | Migraciones (§6) + RLS que fuerza §7.4 a nivel de BD, emparejamiento con invite code, `lib/balance.ts` con tests (§7.1–7.3), login con Google (scope Gmail pedido, pipeline sin activar), onboarding (nombre, medios de pago, emparejar) |
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
- **Detección de "onboarding completo"**: como no hay una columna explícita de progreso, `app/page.tsx` infiere el paso pendiente por lo que ya existe en BD (nombre vacío → falta nombre; solo el `PaymentMethod` "efectivo" → falta esa selección; sin `couple.user_b_id` → falta emparejar). Si en algún milestone se necesita un estado de onboarding más explícito, agregar una columna en vez de seguir infiriendo.

## M1 — validado en vivo contra el proyecto real (2026-09-10)

Los 3 pasos manuales (Google OAuth en Supabase, `.env.local`, migraciones) ya se hicieron. Se verificó extremo a extremo sin loguearse con una cuenta real:
- `/` sin sesión redirige a `/login` (307).
- El botón "Continuar con Google" golpea `/auth/v1/authorize` de Supabase, que devuelve 302 a `accounts.google.com` con el `client_id` real y `scope=email profile https://www.googleapis.com/auth/gmail.readonly` — Google OAuth está bien conectado de punta a punta.
- RLS confirmada activa: `GET /rest/v1/users` sin sesión devuelve `[]` (antes de RLS habría devuelto error o todas las filas).

`.env.local` tiene las credenciales reales — **no está commiteado** (ver `.gitignore`), solo vive en este sandbox para poder probar la app.

## Convenciones

- Idioma de UI: español (único idioma del MVP).
- Moneda: siempre PEN, sin multi-moneda.
- Commits en español o inglés técnico simple, uno por unidad de trabajo coherente (no uno por archivo).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
