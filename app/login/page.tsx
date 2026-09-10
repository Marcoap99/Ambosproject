"use client";

import { createClient } from "@/lib/supabase/client";

// Depende de la sesión del usuario — nunca se pre-renderiza estático.
export const dynamic = "force-dynamic";

// Scope pedido de una sola vez en el registro (PRD §5.1 + decisión de
// auth en CLAUDE.md) — el pipeline que lo usa recién se activa en M3.
const GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

export default function LoginPage() {
  async function handleLogin() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        scopes: GMAIL_READONLY_SCOPE,
        queryParams: { access_type: "offline", prompt: "consent" },
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <main style={{ padding: 24, textAlign: "center" }}>
      <h1 className="font-display">Ambos</h1>
      <p style={{ color: "var(--color-ink-muted)" }}>
        Gastos compartidos de pareja, sin anotar nada a mano.
      </p>
      <button className="button-primary" onClick={handleLogin}>
        Continuar con Google
      </button>
    </main>
  );
}
