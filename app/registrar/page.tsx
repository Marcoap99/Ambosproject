"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { CATEGORIES, findMatchingMethod, paymentMethodLabel } from "@/lib/labels";
import { createClient } from "@/lib/supabase/client";
import { useAppData } from "@/lib/useAppData";

// Depende de la sesión del usuario — nunca se pre-renderiza estático.
export const dynamic = "force-dynamic";

interface Proposal {
  monto: string;
  comercio: string;
  categoria: string;
  medio_pago: string;
}

export default function RegistrarPage() {
  const router = useRouter();
  const app = useAppData();
  const [text, setText] = useState("");
  const [step, setStep] = useState<"escribir" | "confirmar">("escribir");
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(null);

  async function handleSubmitText(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/parse-expense", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    setLoading(false);
    if (!res.ok) {
      setError("No pudimos entender el gasto. Intenta describirlo de otra forma.");
      return;
    }

    const data = await res.json();
    const match = findMatchingMethod(app.paymentMethods, data.medio_pago);
    setPaymentMethodId(match?.id ?? app.paymentMethods[0]?.id ?? null);
    setProposal({
      monto: String(data.monto ?? ""),
      comercio: data.comercio ?? "",
      categoria: data.categoria ?? "Otro",
      medio_pago: data.medio_pago ?? "efectivo",
    });
    setStep("confirmar");
  }

  async function handleConfirm() {
    if (!proposal || !app.userId || !app.coupleId || !app.cycleId) return;
    const amount = Number(proposal.monto);
    if (!amount || amount <= 0) {
      setError("El monto tiene que ser mayor a 0.");
      return;
    }

    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("movements").insert({
      user_id: app.userId,
      couple_id: app.coupleId,
      cycle_id: app.cycleId,
      merchant: proposal.comercio || null,
      amount,
      source: "manual",
      payment_method_id: paymentMethodId,
      payer_user_id: app.userId,
      category: proposal.categoria === "Otro" ? null : proposal.categoria,
    });

    setLoading(false);
    if (insertError) {
      setError("No pudimos guardar el gasto. Intenta de nuevo.");
      return;
    }
    router.back();
  }

  return (
    <main style={{ padding: 24, maxWidth: 480, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 className="font-display" style={{ margin: 0 }}>
          Registrar gasto
        </h1>
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Cerrar"
          style={{
            width: 32,
            height: 32,
            borderRadius: "999px",
            border: "none",
            background: "var(--color-surface-muted)",
            cursor: "pointer",
          }}
        >
          ✕
        </button>
      </header>

      {step === "escribir" && (
        <form onSubmit={handleSubmitText} style={{ marginTop: 24, display: "grid", gap: 12 }}>
          <p style={{ color: "var(--color-ink-muted)" }}>
            Cuéntame qué gastaste, como si se lo dijeras a tu pareja.
          </p>
          <textarea
            className="input"
            style={{ maxWidth: "100%", minHeight: 80, resize: "vertical" }}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ej: 25 soles almuerzo con Yape"
            autoFocus
            required
          />
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="button-primary" disabled={loading || !text.trim()}>
            {loading ? "Pensando..." : "Continuar"}
          </button>
        </form>
      )}

      {step === "confirmar" && proposal && (
        <div style={{ marginTop: 24, display: "grid", gap: 16 }}>
          <div
            style={{
              background: "var(--color-surface)",
              border: "2px solid var(--color-border)",
              borderRadius: "var(--radius-card)",
              padding: 16,
              display: "grid",
              gap: 14,
            }}
          >
            <label style={fieldLabelStyle}>
              Monto (S/)
              <input
                className="input"
                type="number"
                step="0.01"
                min="0"
                value={proposal.monto}
                onChange={(e) => setProposal({ ...proposal, monto: e.target.value })}
              />
            </label>

            <label style={fieldLabelStyle}>
              Comercio (opcional)
              <input
                className="input"
                value={proposal.comercio}
                onChange={(e) => setProposal({ ...proposal, comercio: e.target.value })}
              />
            </label>

            <div>
              <p style={fieldLabelStyle}>Categoría</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className="chip"
                    data-selected={proposal.categoria === cat}
                    onClick={() => setProposal({ ...proposal, categoria: cat })}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p style={fieldLabelStyle}>Medio de pago</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {app.paymentMethods.map((pm) => (
                  <button
                    key={pm.id}
                    type="button"
                    className="chip"
                    data-selected={paymentMethodId === pm.id}
                    onClick={() => setPaymentMethodId(pm.id)}
                  >
                    {paymentMethodLabel(pm)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && <p className="error-text">{error}</p>}
          <div style={{ display: "flex", gap: 12 }}>
            <button
              type="button"
              className="chip"
              onClick={() => setStep("escribir")}
              style={{ flex: 1 }}
            >
              Volver
            </button>
            <button
              type="button"
              className="button-primary"
              onClick={handleConfirm}
              disabled={loading}
              style={{ flex: 2 }}
            >
              Confirmar
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

const fieldLabelStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  fontSize: 14,
  color: "var(--color-ink-muted-2)",
  fontWeight: 600,
};
