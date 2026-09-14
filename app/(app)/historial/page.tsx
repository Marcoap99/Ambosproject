"use client";

import { useEffect, useState } from "react";

import { FloatingAddButton } from "@/components/FloatingAddButton";
import { LoadingScreen } from "@/components/LoadingScreen";
import { calculateBalance } from "@/lib/balance";
import { CATEGORIES } from "@/lib/labels";
import { createClient } from "@/lib/supabase/client";
import { useAppData } from "@/lib/useAppData";

// Depende de la sesión del usuario — nunca se pre-renderiza estático.
export const dynamic = "force-dynamic";

interface Movement {
  id: string;
  user_id: string;
  merchant: string | null;
  amount: number;
  timestamp: string;
  classification: "personal" | "pareja" | null;
  split_ratio: number;
  category: string | null;
  cycle_id: string;
}

type Filtro = "todos" | "yo" | "pareja";

export default function HistorialPage() {
  const app = useAppData();
  const [movements, setMovements] = useState<Movement[] | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("todos");

  async function reload(coupleId: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from("movements")
      .select("id, user_id, merchant, amount, timestamp, classification, split_ratio, category, cycle_id")
      .eq("couple_id", coupleId)
      .not("classification", "is", null)
      .is("deleted_at", null)
      .order("timestamp", { ascending: false });
    setMovements(data ?? []);
  }

  useEffect(() => {
    if (!app.coupleId) return;
    // Carga inicial estándar — ver nota en app/saldo/page.tsx sobre esta regla.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload(app.coupleId);
  }, [app.coupleId]);

  async function updateMovement(m: Movement, patch: Partial<Movement>) {
    // Regla de confirmación (§5.6): sacar un gasto de la vista compartida
    // afecta lo que ve la pareja — Personal → Pareja no la necesita.
    if (patch.classification === "personal" && m.classification === "pareja") {
      if (!window.confirm("Esto deja de ser visible para tu pareja en el historial. ¿Seguro?")) return;
    }

    const dbPatch: Record<string, unknown> = { ...patch, classified_at: new Date().toISOString() };
    // Reclasificar a Pareja nunca arrastra un split anterior (§5.6).
    if (patch.classification === "pareja" && m.classification !== "pareja") {
      dbPatch.split_ratio = 0.5;
    }

    const supabase = createClient();
    await supabase.from("movements").update(dbPatch).eq("id", m.id);
    if (app.coupleId) await reload(app.coupleId);
  }

  async function deleteMovement(id: string) {
    if (!window.confirm("¿Borrar este gasto?")) return;
    const supabase = createClient();
    await supabase.from("movements").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (app.coupleId) await reload(app.coupleId);
  }

  if (app.loading || movements === null || !app.userId) return <LoadingScreen />;

  const visibles = movements.filter((m) => {
    if (filtro === "yo") return m.user_id === app.userId;
    if (filtro === "pareja") return m.user_id !== app.userId;
    return true;
  });

  const parejaMovs = movements
    .filter((m) => m.cycle_id === app.cycleId)
    .map((m) => ({
      amount: m.amount,
      classification: m.classification,
      split_ratio: m.split_ratio,
      payer_user_id: m.user_id,
      deleted_at: null,
    }));
  const { net } = calculateBalance(parejaMovs, app.userId);

  return (
    <main style={{ padding: 24, maxWidth: 480, margin: "0 auto", paddingBottom: 96 }}>
      <h1 className="font-display" style={{ textAlign: "center" }}>
        Historial
      </h1>

      <BalanceBar net={net} />

      <div style={{ display: "flex", gap: 8, justifyContent: "center", margin: "16px 0" }}>
        {(["todos", "yo", "pareja"] as const).map((f) => (
          <button
            key={f}
            type="button"
            className="chip"
            data-selected={filtro === f}
            onClick={() => setFiltro(f)}
          >
            {f === "todos" ? "Todos" : f === "yo" ? "Tú" : "Tu pareja"}
          </button>
        ))}
      </div>

      {visibles.length === 0 && (
        <p style={{ textAlign: "center", color: "var(--color-ink-muted)" }}>
          Todavía no hay nada acá.
        </p>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {visibles.map((m) => (
          <HistorialItem
            key={m.id}
            movement={m}
            isOwn={m.user_id === app.userId}
            isEditable={m.user_id === app.userId && m.cycle_id === app.cycleId}
            onChange={(patch) => updateMovement(m, patch)}
            onDelete={() => deleteMovement(m.id)}
          />
        ))}
      </div>

      <FloatingAddButton />
    </main>
  );
}

function BalanceBar({ net }: { net: number }) {
  const scale = Math.max(Math.abs(net) * 1.5, 50);
  const offset = Math.max(-45, Math.min(45, (net / scale) * 45));
  const position = 50 + offset;

  return (
    <div style={{ padding: "0 8px" }}>
      <div
        style={{
          position: "relative",
          height: 8,
          borderRadius: "999px",
          background: "var(--color-border)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -3,
            left: `calc(${position}% - 7px)`,
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: net === 0 ? "var(--color-positivo)" : net > 0 ? "var(--color-accent)" : "var(--color-pareja)",
            border: "3px solid white",
            boxShadow: "0 1px 3px rgba(0,0,0,.2)",
          }}
        />
      </div>
    </div>
  );
}

function HistorialItem({
  movement,
  isOwn,
  isEditable,
  onChange,
  onDelete,
}: {
  movement: Movement;
  isOwn: boolean;
  isEditable: boolean;
  onChange: (patch: Partial<Movement>) => void;
  onDelete: () => void;
}) {
  const date = new Date(movement.timestamp).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
  });

  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "2px solid var(--color-border)",
        borderRadius: "var(--radius-card)",
        padding: 14,
        display: "grid",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <strong>{movement.merchant || "Gasto"}</strong>
          <div style={{ fontSize: 12, color: "var(--color-ink-muted)" }}>
            {isOwn ? "Tú" : "Tu pareja"} · {date}
            {movement.category ? ` · ${movement.category}` : ""}
          </div>
        </div>
        <strong className="tabular-nums">S/{movement.amount.toFixed(2)}</strong>
      </div>

      {isEditable && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <button
            type="button"
            className="chip"
            data-selected={movement.classification === "personal"}
            style={{ fontSize: 12, padding: "5px 10px" }}
            onClick={() => onChange({ classification: "personal" })}
          >
            Personal
          </button>
          <button
            type="button"
            className="chip"
            data-selected={movement.classification === "pareja"}
            style={{ fontSize: 12, padding: "5px 10px" }}
            onClick={() => onChange({ classification: "pareja" })}
          >
            Pareja
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className="chip"
              data-selected={movement.category === cat}
              style={{ fontSize: 12, padding: "5px 10px" }}
              onClick={() => onChange({ category: movement.category === cat ? null : cat })}
            >
              {cat}
            </button>
          ))}
          <button
            type="button"
            onClick={onDelete}
            aria-label="Borrar"
            style={{
              marginLeft: "auto",
              border: "none",
              background: "none",
              color: "var(--color-ink-disabled)",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            Borrar
          </button>
        </div>
      )}
    </div>
  );
}
