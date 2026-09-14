"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { CheckIcon, CloseIcon } from "@/components/icons";
import { CATEGORIES, categoryChipStyle, findMatchingMethod, paymentMethodLabel } from "@/lib/labels";
import { createClient } from "@/lib/supabase/client";
import { type PaymentMethod, useAppData } from "@/lib/useAppData";

// Depende de la sesión del usuario — nunca se pre-renderiza estático.
export const dynamic = "force-dynamic";

interface Proposal {
  monto: string;
  comercio: string;
  categoria: string;
  medio_pago: string;
}

// PRD §5.5: "Interfaz de chat (no formulario)" — mismo patrón "propongo,
// confirmas" del mockup (design/Main.dc.html), con la moneda (coin.jpg,
// DESIGN_SYSTEM.md §6) como personaje-guía de decisiones de plata.
export default function RegistrarPage() {
  const router = useRouter();
  const app = useAppData();
  const [text, setText] = useState("");
  const [step, setStep] = useState<"escribir" | "confirmar" | "hecho">("escribir");
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
    setStep("hecho");
  }

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", height: "100dvh", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 20px 4px",
        }}
      >
        <h1 className="font-display" style={{ margin: 0, fontSize: 19 }}>
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
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "var(--color-ink)",
          }}
        >
          <CloseIcon />
        </button>
      </header>

      {step === "hecho" ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: "0 28px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: "50%",
              background: "var(--color-tint-green)",
              color: "var(--color-positivo)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CheckIcon />
          </div>
          <p className="font-display" style={{ margin: 0, fontSize: 22 }}>
            ¡Registrado!
          </p>
          <p style={{ margin: 0, fontSize: 13, color: "var(--color-ink-muted)" }}>
            Ya quedó en tu historial.
          </p>
          <button type="button" className="chip" onClick={() => router.back()}>
            Cerrar
          </button>
        </div>
      ) : (
        <>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, padding: "16px 20px", overflowY: "auto" }}>
            <BotMessage>
              ¿Qué gasto quieres registrar? Sirve también para lo que no llegó por correo.
            </BotMessage>

            {step === "confirmar" && proposal && (
              <>
                <UserMessage>{text}</UserMessage>
                <BotMessage>
                  Esto voy a registrar:
                  <ConfirmCard
                    proposal={proposal}
                    onProposalChange={setProposal}
                    paymentMethodId={paymentMethodId}
                    onPaymentMethodChange={setPaymentMethodId}
                    paymentMethods={app.paymentMethods}
                    error={error}
                    loading={loading}
                    onEditar={() => setStep("escribir")}
                    onConfirmar={handleConfirm}
                  />
                </BotMessage>
              </>
            )}
          </div>

          {step === "escribir" && (
            <form
              onSubmit={handleSubmitText}
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 8,
                padding: "10px 16px 18px",
                borderTop: "2px dashed var(--color-chip-border-neutral)",
              }}
            >
              <textarea
                className="input"
                style={{
                  flex: 1,
                  maxWidth: "100%",
                  minHeight: 44,
                  resize: "vertical",
                  background: "var(--color-surface-muted)",
                  border: "none",
                  borderRadius: "var(--radius-pill)",
                }}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Escribe tu gasto — ej: 25 soles almuerzo con Yape"
                autoFocus
                required
              />
              <button
                type="submit"
                className="button-primary"
                disabled={loading || !text.trim()}
                style={{ padding: "12px 18px" }}
              >
                {loading ? "..." : "Enviar"}
              </button>
            </form>
          )}
          {step === "escribir" && error && (
            <p className="error-text" style={{ padding: "0 20px 12px", textAlign: "center" }}>
              {error}
            </p>
          )}
        </>
      )}
    </main>
  );
}

function BotMessage({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
      <Image
        src="/assets/coin.jpg"
        alt=""
        width={26}
        height={26}
        style={{ borderRadius: 8, objectFit: "cover", flex: "none" }}
      />
      <div
        style={{
          maxWidth: "82%",
          padding: "10px 13px",
          borderRadius: 16,
          borderBottomLeftRadius: 4,
          fontSize: 13,
          lineHeight: 1.45,
          background: "var(--color-surface)",
          border: "2px solid var(--color-border)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function UserMessage({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end" }}>
      <div
        style={{
          maxWidth: "82%",
          padding: "10px 13px",
          borderRadius: 16,
          borderBottomRightRadius: 4,
          fontSize: 13,
          lineHeight: 1.45,
          background: "var(--color-accent)",
          color: "var(--color-bg)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function ConfirmCard({
  proposal,
  onProposalChange,
  paymentMethodId,
  onPaymentMethodChange,
  paymentMethods,
  error,
  loading,
  onEditar,
  onConfirmar,
}: {
  proposal: Proposal;
  onProposalChange: (p: Proposal) => void;
  paymentMethodId: string | null;
  onPaymentMethodChange: (id: string) => void;
  paymentMethods: PaymentMethod[];
  error: string | null;
  loading: boolean;
  onEditar: () => void;
  onConfirmar: () => void;
}) {
  return (
    <div
      style={{
        background: "var(--color-surface-muted)",
        border: "2px solid var(--color-border)",
        borderRadius: 14,
        padding: 12,
        display: "grid",
        gap: 9,
        marginTop: 8,
      }}
    >
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ fontSize: 13, color: "var(--color-ink-muted-2)" }}>S/</span>
        <input
          className="input"
          type="number"
          step="0.01"
          min="0"
          value={proposal.monto}
          onChange={(e) => onProposalChange({ ...proposal, monto: e.target.value })}
          style={{ maxWidth: 100, fontSize: 19, fontWeight: 700, padding: "4px 8px" }}
        />
        <input
          className="input"
          value={proposal.comercio}
          onChange={(e) => onProposalChange({ ...proposal, comercio: e.target.value })}
          placeholder="Comercio (opcional)"
          style={{ flex: 1, fontSize: 13, padding: "8px 10px" }}
        />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            className="chip"
            style={{ fontSize: 11, padding: "5px 10px", ...categoryChipStyle(cat, proposal.categoria === cat) }}
            onClick={() => onProposalChange({ ...proposal, categoria: cat })}
          >
            {cat}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {paymentMethods.map((pm) => (
          <button
            key={pm.id}
            type="button"
            className="chip"
            data-selected={paymentMethodId === pm.id}
            style={{ fontSize: 11, padding: "5px 10px" }}
            onClick={() => onPaymentMethodChange(pm.id)}
          >
            {paymentMethodLabel(pm)}
          </button>
        ))}
      </div>

      {error && <p className="error-text" style={{ fontSize: 12, margin: 0 }}>{error}</p>}

      <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
        <button type="button" className="chip" onClick={onEditar} style={{ flex: 1, justifyContent: "center", padding: 11, fontSize: 13 }}>
          Editar
        </button>
        <button
          type="button"
          className="button-primary"
          onClick={onConfirmar}
          disabled={loading}
          style={{ flex: 1, padding: 11, fontSize: 13, boxShadow: "none" }}
        >
          {loading ? "Guardando..." : "Confirmar"}
        </button>
      </div>
    </div>
  );
}
