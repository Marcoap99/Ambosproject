import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// gmail_credentials no tiene policies de RLS para 'authenticated' (deny-by-
// default, ver 0008_gmail_credentials.sql) — ni el dueño puede leer su fila
// directo desde el cliente. Este endpoint es la única forma de que Ajustes
// (§5.8) muestre si Gmail ya quedó conectado, usando la service role.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data } = await admin
    .from("gmail_credentials")
    .select("watch_expiration")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({
    connected: !!data,
    watchExpiration: data?.watch_expiration ?? null,
  });
}
