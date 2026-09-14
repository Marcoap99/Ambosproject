import { NextResponse } from "next/server";

import { revokeToken } from "@/lib/gmail";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Borrar cuenta (PRD §8): borra tokens y datos. Decisión de producto de
// Marco (2026-09-14): como el saldo y el historial son de LA PAREJA, no de
// un usuario solo, borrar tu cuenta disuelve el couple y borra TODO lo
// compartido (ciclos, gastos, comprobantes) para los dos — no solo lo tuyo.
// La cuenta de tu pareja no se borra, pero queda sin couple y sin historial,
// como si tuviera que emparejarse de nuevo desde cero.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const { data: credentials } = await admin
    .from("gmail_credentials")
    .select("refresh_token")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: couple } = await admin
    .from("couples")
    .select("id")
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
    .maybeSingle();

  // Orden: primero el couple (cascada a cycles/movements de AMBOS usuarios),
  // recién después la cuenta del usuario que pidió el borrado.
  if (couple) {
    await admin.from("couples").delete().eq("id", couple.id);
  }

  if (credentials?.refresh_token) {
    try {
      await revokeToken(credentials.refresh_token);
    } catch (err) {
      // Best-effort — igual seguimos y borramos la fila de todas formas.
      console.error("revokeToken falló al borrar cuenta:", err);
    }
  }
  await admin.from("gmail_credentials").delete().eq("user_id", user.id);

  // Cascada desde auth.users → public.users → payment_methods/check_ins/
  // push_subscriptions (todo con "on delete cascade", ver 0001/0004 schema).
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
