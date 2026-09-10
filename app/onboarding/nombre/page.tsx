"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { createClient } from "@/lib/supabase/client";

// Depende de la sesión del usuario — nunca se pre-renderiza estático.
export const dynamic = "force-dynamic";

export default function NombrePage() {
  const [nombre, setNombre] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login");
      return;
    }

    const { error: updateError } = await supabase
      .from("users")
      .update({ nombre: nombre.trim() })
      .eq("id", user.id);

    setLoading(false);
    if (updateError) {
      setError("No pudimos guardar tu nombre. Intenta de nuevo.");
      return;
    }
    router.push("/onboarding/medios-pago");
  }

  return (
    <main style={{ padding: 24, textAlign: "center" }}>
      <h1 className="font-display">¿Cómo te llamas?</h1>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12, placeItems: "center" }}>
        <input
          className="input"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Tu nombre"
          autoFocus
          required
        />
        {error && <p className="error-text">{error}</p>}
        <button type="submit" className="button-primary" disabled={loading || !nombre.trim()}>
          Continuar
        </button>
      </form>
    </main>
  );
}
