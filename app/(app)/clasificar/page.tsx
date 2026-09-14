"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { FloatingAddButton } from "@/components/FloatingAddButton";
import { LoadingScreen } from "@/components/LoadingScreen";
import { PeopleIcon, PersonIcon } from "@/components/icons";
import { splitLabel } from "@/lib/balance";
import { getLocalDateString } from "@/lib/date";
import { CATEGORIES, categoryChipStyle, classificationChipStyle, paymentMethodLabel } from "@/lib/labels";
import { createClient } from "@/lib/supabase/client";
import { type PaymentMethod, useAppData } from "@/lib/useAppData";

// Depende de la sesión del usuario — nunca se pre-renderiza estático.
export const dynamic = "force-dynamic";

interface Movement {
  id: string;
  merchant: string | null;
  amount: number;
  timestamp: string;
  payment_method_id: string | null;
  classification: "personal" | "pareja" | null;
  split_ratio: number;
  category: string | null;
}

export default function ClasificarPage() {
  const router = useRouter();
  const app = useAppData();
  const [movements, setMovements] = useState<Movement[] | null>(null);

  async function loadMovements(userId: string) {
    const supabase = createClient();
    const today = getLocalDateString();
    const { data } = await supabase
      .from("movements")
      .select("id, merchant, amount, timestamp, payment_method_id, classification, split_ratio, category")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .gte("timestamp", `${today}T00:00:00`)
      .lte("timestamp", `${today}T23:59:59.999`)
      .order("timestamp", { ascending: false });
    setMovements(data ?? []);
  }

  useEffect(() => {
    if (!app.userId) return;
    // Carga inicial estándar (fetch-en-effect, igual patrón que /hoy y
    // /onboarding/emparejar); la regla experimental del compiler la marca
    // inconsistentemente en componentes chicos, comprobado con un repro.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadMovements(app.userId);
  }, [app.userId]);

  async function updateMovement(id: string, patch: Partial<Movement>) {
    setMovements((prev) =>
      prev ? prev.map((m) => (m.id === id ? { ...m, ...patch } : m)) : prev,
    );
    const supabase = createClient();
    const dbPatch: Record<string, unknown> = { ...patch };
    if (patch.classification !== undefined) dbPatch.classified_at = new Date().toISOString();
    await supabase.from("movements").update(dbPatch).eq("id", id);
  }

  if (app.loading || movements === null) return <LoadingScreen />;

  const allClassified = movements.length > 0 && movements.every((m) => m.classification !== null);

  return (
    <main style={{ padding: 24, maxWidth: 480, margin: "0 auto", paddingBottom: 96 }}>
      <h1 className="font-display" style={{ textAlign: "center" }}>
        Clasificar
      </h1>

      {movements.length === 0 && (
        <div style={{ textAlign: "center", marginTop: 32 }}>
          <p style={{ color: "var(--color-ink-muted)" }}>
            No detectamos gastos hoy — ¿se te pasó algo?
          </p>
          <Link href="/registrar" className="button-primary">
            Registrarlo a mano
          </Link>
        </div>
      )}

      {movements.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
          <Image
            src="/assets/coin.jpg"
            alt=""
            width={34}
            height={34}
            style={{ borderRadius: 10, objectFit: "cover", flex: "none" }}
          />
          <p className="font-display" style={{ margin: 0, fontSize: 16, lineHeight: 1.25 }}>
            Esto es tuyo, hoy.
            <br />
            ¿Fue personal o de los dos?
          </p>
        </div>
      )}

      <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
        {movements.map((m) => (
          <MovementCard
            key={m.id}
            movement={m}
            paymentMethods={app.paymentMethods}
            onChange={(patch) => updateMovement(m.id, patch)}
          />
        ))}
      </div>

      {movements.length > 0 && (
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <p style={{ fontSize: 12, color: "var(--color-ink-muted)", marginBottom: 12 }}>
            {movements.filter((m) => m.classification !== null).length} de {movements.length} clasificados
          </p>
          <button
            className="button-primary"
            disabled={!allClassified}
            onClick={() => router.push("/saldo")}
          >
            Ver saldo
          </button>
        </div>
      )}
      <FloatingAddButton />
    </main>
  );
}

function MovementCard({
  movement,
  paymentMethods,
  onChange,
}: {
  movement: Movement;
  paymentMethods: PaymentMethod[];
  onChange: (patch: Partial<Movement>) => void;
}) {
  const time = new Date(movement.timestamp).toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const paymentMethod = paymentMethods.find((pm) => pm.id === movement.payment_method_id);

  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "2px solid var(--color-border)",
        borderRadius: "var(--radius-card)",
        padding: 14,
        display: "grid",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <strong>{movement.merchant || "Gasto"}</strong>
          <div style={{ fontSize: 13, color: "var(--color-ink-muted)" }}>{time}</div>
        </div>
        <strong className="tabular-nums">S/{movement.amount.toFixed(2)}</strong>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          className="chip"
          style={{ flex: 1, justifyContent: "center", ...classificationChipStyle("personal", movement.classification === "personal") }}
          onClick={() => onChange({ classification: "personal" })}
        >
          <PersonIcon /> Personal
        </button>
        <button
          type="button"
          className="chip"
          style={{ flex: 1, justifyContent: "center", ...classificationChipStyle("pareja", movement.classification === "pareja") }}
          onClick={() => onChange({ classification: "pareja", split_ratio: movement.split_ratio ?? 0.5 })}
        >
          <PeopleIcon /> Pareja
        </button>
      </div>

      {movement.classification === "pareja" && (
        <div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={Math.round(movement.split_ratio * 100)}
            onChange={(e) => onChange({ split_ratio: Number(e.target.value) / 100 })}
            style={{ width: "100%" }}
          />
          <p style={{ fontSize: 13, color: "var(--color-ink-muted-2)", textAlign: "center" }}>
            {splitLabel(movement.split_ratio, true)}
          </p>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            className="chip"
            onClick={() => onChange({ category: movement.category === cat ? null : cat })}
            style={{ fontSize: 12, padding: "5px 10px", ...categoryChipStyle(cat, movement.category === cat) }}
          >
            {cat}
          </button>
        ))}
      </div>

      {paymentMethod && (
        <p style={{ fontSize: 12, color: "var(--color-ink-disabled)" }}>
          Pagado con {paymentMethodLabel(paymentMethod)}
        </p>
      )}
    </div>
  );
}
