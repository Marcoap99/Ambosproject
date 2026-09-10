"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { calculateBalance, totalCompartido, type MovementForBalance } from "@/lib/balance";
import { getLocalDateString } from "@/lib/date";
import { createClient } from "@/lib/supabase/client";
import { useAppData } from "@/lib/useAppData";

// Depende de la sesión del usuario — nunca se pre-renderiza estático.
export const dynamic = "force-dynamic";

export default function SaldoPage() {
  const router = useRouter();
  const app = useAppData();
  const [movements, setMovements] = useState<(MovementForBalance & { timestamp: string })[] | null>(
    null,
  );

  async function loadBalance(coupleId: string, cycleId: string) {
    const supabase = createClient();
    // RLS ya filtra: lo mío siempre, lo de mi pareja solo si ya lo clasificó
    // (§7.4) — este select nunca puede exponer algo sin clasificar del otro.
    const { data } = await supabase
      .from("movements")
      .select("amount, classification, split_ratio, payer_user_id, deleted_at, timestamp")
      .eq("couple_id", coupleId)
      .eq("cycle_id", cycleId)
      .eq("classification", "pareja")
      .is("deleted_at", null);
    setMovements(data ?? []);
  }

  useEffect(() => {
    if (!app.coupleId || !app.cycleId) return;
    // Carga inicial estándar (fetch-en-effect, igual patrón que /hoy y
    // /onboarding/emparejar); la regla experimental del compiler la marca
    // inconsistentemente en componentes chicos, comprobado con un repro.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadBalance(app.coupleId, app.cycleId);
  }, [app.coupleId, app.cycleId]);

  if (app.loading || movements === null || !app.userId) return null;

  const { net, label } = calculateBalance(movements, app.userId);

  const today = getLocalDateString();
  const todayMovements = movements.filter((m) => m.timestamp.startsWith(today));
  const totalHoy = totalCompartido(todayMovements);

  return (
    <main style={{ padding: 24, maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
      <h1 className="font-display">Saldo</h1>

      <p style={{ color: "var(--color-ink-muted)" }}>Hoy compartieron</p>
      <p className="tabular-nums" style={{ fontSize: 28, fontWeight: 700 }}>
        S/{totalHoy.toFixed(2)}
      </p>

      <div
        style={{
          marginTop: 24,
          padding: 20,
          borderRadius: "var(--radius-card)",
          background: net === 0 ? "var(--color-tint-green)" : net > 0 ? "var(--color-tint-coral)" : "var(--color-tint-teal)",
        }}
      >
        <p style={{ fontSize: 18, fontWeight: 600 }}>{label}</p>
      </div>

      <button
        type="button"
        className="chip"
        style={{ marginTop: 24 }}
        onClick={() => router.push("/historial")}
      >
        Ver historial
      </button>
    </main>
  );
}
