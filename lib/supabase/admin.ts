import { createClient } from "@supabase/supabase-js";

// Cliente con la service role key — bypassea RLS por completo. Solo para
// código de servidor que necesita tocar datos que el usuario mismo no
// puede ver (gmail_credentials, ver migración 0008). Nunca importar esto
// desde un Client Component ni exponer SUPABASE_SERVICE_ROLE_KEY como
// variable NEXT_PUBLIC_*.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
