"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

// Depende de la sesión del usuario — nunca se pre-renderiza estático.
export const dynamic = "force-dynamic";

// Grupos de selección — PRD §5.1.3. "Efectivo" no aparece acá: ya existe
// automático para todos los usuarios (ver CLAUDE.md).
const TARJETAS = [
  { tipo: "tarjeta_debito", label: "Débito" },
  { tipo: "tarjeta_credito", label: "Crédito" },
] as const;

const BILLETERAS = [
  { tipo: "yape", label: "Yape" },
  { tipo: "plin", label: "Plin" },
  { tipo: "agora", label: "Agora" },
] as const;

const BANCOS = ["BCP", "BBVA", "Interbank", "Scotiabank", "BanBif"] as const;

type Selection = { tipo: string; banco: string | null; key: string };

export default function MediosPagoPage() {
  const [selected, setSelected] = useState<Record<string, Selection>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function toggle(key: string, tipo: string, banco: string | null = null) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = { tipo, banco, key };
      }
      return next;
    });
  }

  async function handleSubmit() {
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

    const rows = Object.values(selected).map(({ tipo, banco }) => ({
      user_id: user.id,
      tipo,
      banco,
    }));

    if (rows.length > 0) {
      const { error: insertError } = await supabase.from("payment_methods").insert(rows);
      if (insertError) {
        setLoading(false);
        setError("No pudimos guardar tus medios de pago. Intenta de nuevo.");
        return;
      }
    }

    router.push("/onboarding/emparejar");
  }

  return (
    <main style={{ padding: 24 }}>
      <h1 className="font-display" style={{ textAlign: "center" }}>
        ¿Con qué pagas?
      </h1>
      <p style={{ color: "var(--color-ink-muted)", textAlign: "center" }}>
        Elige todos los que uses — puedes cambiarlo después.
      </p>

      <Section title="Tarjetas">
        {TARJETAS.map(({ tipo, label }) => (
          <Chip
            key={tipo}
            selected={tipo in selected}
            onClick={() => toggle(tipo, tipo)}
            label={label}
          />
        ))}
      </Section>

      <Section title="Billeteras digitales">
        {BILLETERAS.map(({ tipo, label }) => (
          <Chip
            key={tipo}
            selected={tipo in selected}
            onClick={() => toggle(tipo, tipo)}
            label={label}
          />
        ))}
      </Section>

      <Section title="Banco principal">
        {BANCOS.map((banco) => {
          const key = `banco_${banco}`;
          return (
            <Chip
              key={key}
              selected={key in selected}
              onClick={() => toggle(key, "banco", banco)}
              label={banco}
            />
          );
        })}
      </Section>

      {error && (
        <p className="error-text" style={{ textAlign: "center" }}>
          {error}
        </p>
      )}
      <div style={{ textAlign: "center", marginTop: 24 }}>
        <button className="button-primary" onClick={handleSubmit} disabled={loading}>
          Continuar
        </button>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: 14, color: "var(--color-ink-muted-2)", marginBottom: 8 }}>
        {title}
      </h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{children}</div>
    </section>
  );
}

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className="chip" data-selected={selected} onClick={onClick}>
      {label}
    </button>
  );
}
