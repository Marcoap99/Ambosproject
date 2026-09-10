# Supabase

Proyecto cloud ya existe (`project_ref=ymzqgtkvopoqgbvhkitu`), conectado vía MCP server (ver `.mcp.json` en la raíz del repo). En M1 el schema (§6 del PRD) y las políticas RLS se aplican contra ese proyecto directamente, usando las herramientas del MCP — no dependemos de `supabase start` local (Docker no está disponible en el sandbox remoto de Claude Code).

`migrations/` guarda copia versionada de cada migración aplicada, para que el historial quede en git aunque la ejecución real pase por el MCP o por `supabase db push` desde una máquina con Docker.

Variables de entorno esperadas en `.env.local` (nunca commiteadas — ver `.gitignore`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (solo server-side, nunca expuesta al cliente)
