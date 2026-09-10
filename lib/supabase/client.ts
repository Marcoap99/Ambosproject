import { createBrowserClient } from "@supabase/ssr";

// Cliente para Client Components. Las credenciales van en variables de
// entorno NEXT_PUBLIC_* (ver .env.local.example) — nunca hardcodeadas.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
