import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

// Server Component: decide a qué paso mandar al usuario según cuánto de su
// registro ya completó. No hay pantalla propia acá — siempre redirige.
export default async function RootPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("nombre")
    .eq("id", user.id)
    .single();
  if (!profile?.nombre) redirect("/onboarding/nombre");

  // 1 = el "efectivo" automático (ver CLAUDE.md) — más que eso significa
  // que ya pasó por la selección de medios de pago del onboarding.
  const { count: paymentMethodsCount } = await supabase
    .from("payment_methods")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if ((paymentMethodsCount ?? 0) <= 1) redirect("/onboarding/medios-pago");

  const { data: couple } = await supabase
    .from("couples")
    .select("current_cycle_id")
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
    .maybeSingle();
  // Normalmente current_cycle_id solo existe tras emparejarse de verdad
  // (PRD §5.7). También queda seteado si activó "probar sin pareja" —
  // ver enable_solo_testing en 0009_solo_testing.sql (temporal, quitar
  // antes de lanzar).
  if (!couple?.current_cycle_id) redirect("/onboarding/emparejar");

  redirect("/hoy");
}
