"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { LoadingScreen } from "@/components/LoadingScreen";
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
  const [switchingToRedeem, setSwitchingToRedeem] = useState(false);
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
      .select("invite_code, user_b_id, current_cycle_id")
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
      .maybeSingle();

    if (!couple) {
      setState({ status: "none" });
      return;
    }
    if (!couple.user_b_id && !couple.current_cycle_id) {
      setState({ status: "waiting", inviteCode: couple.invite_code });
      return;
    }
    router.push("/hoy");
  }

  async function handleSkipPairing() {
    setError(null);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("enable_solo_testing");
    if (rpcError) {
      setError("No se pudo activar el modo de prueba. Intenta de nuevo.");
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

  if (state.status === "loading") return <LoadingScreen />;

  if (state.status === "waiting" && !switchingToRedeem) {
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
        <button
          type="button"
          onClick={() => setSwitchingToRedeem(true)}
          style={{
            marginTop: 24,
            border: "none",
            background: "none",
            color: "var(--color-ink-muted-2)",
            textDecoration: "underline",
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          ¿Tu pareja ya tiene un código? Ingrésalo acá
        </button>
        <p style={{ marginTop: 32, fontSize: 12, color: "var(--color-ink-disabled)" }}>
          Modo de prueba temporal
        </p>
        <button
          type="button"
          onClick={handleSkipPairing}
          className="chip"
          style={{ marginTop: 4 }}
        >
          Probar la app sin pareja por ahora
        </button>
        {error && <p className="error-text">{error}</p>}
      </main>
    );
  }

  return (
    <main style={{ padding: 24, textAlign: "center" }}>
      <h1 className="font-display">Empareja tu cuenta</h1>
      {!switchingToRedeem && (
        <>
          <button className="button-primary" onClick={handleCreate}>
            Generar código de invitación
          </button>
          <p style={{ margin: "20px 0", color: "var(--color-ink-muted)" }}>o</p>
        </>
      )}
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
      {switchingToRedeem && (
        <button
          type="button"
          onClick={() => setSwitchingToRedeem(false)}
          style={{
            marginTop: 16,
            border: "none",
            background: "none",
            color: "var(--color-ink-muted-2)",
            textDecoration: "underline",
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          Volver a mi código
        </button>
      )}
    </main>
  );
}
