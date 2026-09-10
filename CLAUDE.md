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
| M2 | 🟢 hecho | Check-in, registro manual (Gemini), Clasificar, Saldo, Historial, Liquidar (con comprobante en Storage), Ciclos |
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

## Decisiones de implementación tomadas sin preguntar (M2)

- **Tabla `check_ins`** (migración 0004): el PRD describe el check-in diario y la racha de 7 días (§5.2) pero no la modela en §6. Se agregó `check_ins(user_id, fecha, tuvo_gastos)` — sin esto no se puede calcular la racha ni el banner de día de gracia sin adivinar en el cliente.
- **Parseo de gastos con Gemini, no Claude** (`app/api/parse-expense`): decisión de costo de Marco para el MVP — "no quiero gastar aún". Usa `gemini-flash-lite-latest` (nivel gratuito de **Google AI Studio**, no Vertex AI/Cloud Console — esa puerta sí pide tarjeta) vía REST directo (`fetch`, sin SDK adicional). La key va en `GEMINI_API_KEY`. Sacarla en `aistudio.google.com/apikey`. Si más adelante se quiere volver a Claude (mejor calidad de extracción, sigue siendo barato — ver conversación), es un cambio de un solo archivo: reintroducir `@anthropic-ai/sdk` y adaptar `route.ts` al patrón de tool-use que ya se había validado antes.
- **Voz → texto**: el PRD (§4.1) sugiere Web Speech API para dictar el gasto. Se dejó fuera de este primer corte de M2 (solo texto por ahora) — se puede agregar después como mejora progresiva sin tocar el resto del flujo.
- **"Resumen general" de Ciclos sin filtro de mes/año todavía**: PRD §5.7 pide un resumen agregado filtrable por mes/año a la fecha. Se construyó el dashboard del ciclo abierto (gasto por categoría, días abiertos, récord) y la lista de ciclos liquidados con su comprobante — el resumen histórico agregado con filtro de fecha se deja pendiente de un pase de pulido, no bloquea el uso diario de la app.
- **Regla de lint `react-hooks/set-state-in-effect` (React Compiler beta de Next 16)**: se comprobó con un repro mínimo que marca el patrón estándar "fetch en `useEffect` + `setState`" de forma inconsistente — lo deja pasar en componentes con más código (`/hoy`, `/onboarding/emparejar`) pero lo marca en componentes chicos (`/clasificar`, `/saldo`) con el mismo patrón exacto. Se desactivó puntualmente con `eslint-disable-next-line` + comentario en esos 2 archivos. Si en un futuro update de Next/eslint-config-next esto se estabiliza, se puede quitar el disable y confirmar que ya no dispara.

## M2 — validado en vivo contra el proyecto real (2026-09-10)

Prueba de extremo a extremo con 4 usuarios de prueba (email/password, sin pasar por Google) directo contra Supabase real: emparejamiento, privacidad §7.4, saldo bidireccional §7.1, check-in, liquidar ciclo. Se encontraron y arreglaron 3 problemas reales en el camino:

1. **Bug de emparejamiento** (reportado por Marco probando con su pareja): si ambos generaban su propio código en vez de que uno usara el del otro, quedaban atascados. Fix en migración 0006.
2. **Bug en `liquidar_ciclo`**: variable local `couple_id` colisionaba con la columna del mismo nombre → "column reference ambiguous". Fix en migración 0007 (renombrada a `v_couple_id`).
3. **Migración 0004 (`check_ins`) nunca se había aplicado** contra el proyecto real — se me pasó pedírsela a Marco cuando se construyó M2. No era un bug de código, solo un paso saltado.

Los 3 fixes se re-probaron después de aplicados y quedaron confirmados funcionando.

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
