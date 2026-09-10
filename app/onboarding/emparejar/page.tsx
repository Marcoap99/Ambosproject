"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

// Depende de la sesión del usuario — nunca se pre-renderiza estático.
export const dynamic = "force-dynamic";

type CoupleState =
  | { status: "loading" }
  | { status: "none" }
  | { status: "waiting"; inviteCode: string };

export default function EmparejarPage() {
  const [state, setState] = useState<CoupleState>({ status: "loading" });
  const [redeemCode, setRedeemCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  // createClient() se llama dentro de cada handler/effect (no al nivel del
  // render) para no ejecutarse durante el SSR de este Client Component.

  useEffect(() => {
    void loadCouple();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadCouple() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login");
      return;
    }

    const { data: couple } = await supabase
      .from("couples")
      .select("invite_code, user_b_id")
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
      .maybeSingle();

    if (!couple) {
      setState({ status: "none" });
      return;
    }
    if (!couple.user_b_id) {
      setState({ status: "waiting", inviteCode: couple.invite_code });
      return;
    }
    router.push("/hoy");
  }

  async function handleCreate() {
    setError(null);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("create_couple");
    if (rpcError) {
      setError("No pudimos crear tu código. Intenta de nuevo.");
      return;
    }
    await loadCouple();
  }

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("redeem_invite_code", {
      p_code: redeemCode.trim().toUpperCase(),
    });
    if (rpcError) {
      // Error genérico a propósito — PRD §5.1 deja código inválido/expirado fuera del MVP.
      setError("Este código ya no funciona.");
      return;
    }
    router.push("/hoy");
  }

  if (state.status === "loading") return null;

  if (state.status === "waiting") {
    const waMessage = encodeURIComponent(
      `Únete a Ambos conmigo — usa este código al registrarte: ${state.inviteCode}`,
    );
    return (
      <main style={{ padding: 24, textAlign: "center" }}>
        <h1 className="font-display">Comparte tu código</h1>
        <p style={{ fontSize: 32, letterSpacing: 4, fontWeight: 700 }} className="tabular-nums">
          {state.inviteCode}
        </p>
        <a
          className="button-primary"
          href={`https://wa.me/?text=${waMessage}`}
          target="_blank"
          rel="noreferrer"
        >
          Compartir por WhatsApp
        </a>
        <p style={{ color: "var(--color-ink-muted)", marginTop: 16 }}>
          En cuanto tu pareja lo use, quedan conectados automáticamente.
        </p>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, textAlign: "center" }}>
      <h1 className="font-display">Empareja tu cuenta</h1>
      <button className="button-primary" onClick={handleCreate}>
        Generar código de invitación
      </button>
      <p style={{ margin: "20px 0", color: "var(--color-ink-muted)" }}>o</p>
      <form onSubmit={handleRedeem} style={{ display: "grid", gap: 12, placeItems: "center" }}>
        <input
          className="input"
          value={redeemCode}
          onChange={(e) => setRedeemCode(e.target.value)}
          placeholder="Tengo un código"
          required
        />
        <button type="submit" className="button-primary">
          Unirme
        </button>
      </form>
      {error && <p className="error-text">{error}</p>}
    </main>
  );
}
