"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { useAppData } from "@/lib/useAppData";

// Depende de la sesión del usuario — nunca se pre-renderiza estático.
export const dynamic = "force-dynamic";

export default function LiquidarPage() {
  const router = useRouter();
  const app = useAppData();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function handleConfirm() {
    if (!file || !app.coupleId) return;
    setLoading(true);
    setError(null);

    const supabase = createClient();
    // Ruta con el couple_id primero — la RLS de storage.objects exige eso
    // (ver supabase/migrations/0005_storage.sql).
    const path = `${app.coupleId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("comprobantes").upload(path, file);
    if (uploadError) {
      setLoading(false);
      setError("No pudimos guardar la foto. Intenta de nuevo.");
      return;
    }

    const { error: rpcError } = await supabase.rpc("liquidar_ciclo", { p_proof_url: path });
    setLoading(false);
    if (rpcError) {
      setError("No pudimos liquidar el ciclo. Intenta de nuevo.");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <main style={{ padding: 24, maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
        <Image
          src="/assets/hug.jpg"
          alt=""
          width={200}
          height={200}
          style={{ borderRadius: "var(--radius-card)", margin: "0 auto", height: "auto" }}
        />
        <h1 className="font-display">¡Ajustado!</h1>
        <p style={{ color: "var(--color-ink-muted)" }}>
          Empieza un ciclo nuevo — el anterior queda guardado en Ciclos.
        </p>
        <button className="button-primary" onClick={() => router.push("/hoy")}>
          Volver a Hoy
        </button>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
      <h1 className="font-display">Liquidar</h1>
      <p style={{ color: "var(--color-ink-muted)" }}>
        Sube la captura de la transferencia como comprobante.
      </p>

      <label
        style={{
          display: "block",
          border: "2px dashed var(--color-border)",
          borderRadius: "var(--radius-card)",
          padding: 24,
          margin: "16px 0",
          cursor: "pointer",
        }}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- preview local, no vale la pena next/image acá
          <img src={preview} alt="" style={{ maxWidth: "100%", borderRadius: 8 }} />
        ) : (
          <span style={{ color: "var(--color-ink-muted)" }}>Toca para elegir una foto</span>
        )}
        <input type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
      </label>

      {error && <p className="error-text">{error}</p>}

      <button className="button-primary" disabled={!file || loading} onClick={handleConfirm}>
        {loading ? "Guardando..." : "Confirmar"}
      </button>
    </main>
  );
}
