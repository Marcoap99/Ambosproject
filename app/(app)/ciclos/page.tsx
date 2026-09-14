"use client";

import { useEffect, useState } from "react";

import { LoadingScreen } from "@/components/LoadingScreen";
import { CATEGORIES, CATEGORY_COLORS } from "@/lib/labels";
import { createClient } from "@/lib/supabase/client";
import { useAppData } from "@/lib/useAppData";

// Depende de la sesión del usuario — nunca se pre-renderiza estático.
export const dynamic = "force-dynamic";

interface CicloLiquidado {
  id: string;
  fecha_inicio: string;
  fecha_cierre: string;
  proof_attachment_url: string | null;
  comprobanteUrl?: string | null;
}

function diasEntre(a: string, b: string): number {
  return Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000));
}

export default function CiclosPage() {
  const app = useAppData();
  const [cicloAbiertoInicio, setCicloAbiertoInicio] = useState<string | null>(null);
  const [liquidados, setLiquidados] = useState<CicloLiquidado[] | null>(null);
  const [porCategoria, setPorCategoria] = useState<Record<string, number>>({});

  async function load(coupleId: string, cycleId: string) {
    const supabase = createClient();

    const [{ data: cicloAbierto }, { data: cerrados }, { data: movs }] = await Promise.all([
      supabase.from("cycles").select("fecha_inicio").eq("id", cycleId).single(),
      supabase
        .from("cycles")
        .select("id, fecha_inicio, fecha_cierre, proof_attachment_url")
        .eq("couple_id", coupleId)
        .eq("status", "liquidado")
        .order("fecha_cierre", { ascending: false }),
      supabase
        .from("movements")
        .select("amount, category, split_ratio, deleted_at")
        .eq("couple_id", coupleId)
        .eq("cycle_id", cycleId)
        .eq("classification", "pareja")
        .is("deleted_at", null),
    ]);

    setCicloAbiertoInicio(cicloAbierto?.fecha_inicio ?? null);

    const totals: Record<string, number> = {};
    for (const m of movs ?? []) {
      if (m.split_ratio <= 0) continue;
      const cat = m.category ?? "Otro";
      totals[cat] = (totals[cat] ?? 0) + m.amount;
    }
    setPorCategoria(totals);

    const withUrls: CicloLiquidado[] = await Promise.all(
      (cerrados ?? []).map(async (c) => {
        let comprobanteUrl: string | null = null;
        if (c.proof_attachment_url) {
          const { data: signed } = await supabase.storage
            .from("comprobantes")
            .createSignedUrl(c.proof_attachment_url, 300);
          comprobanteUrl = signed?.signedUrl ?? null;
        }
        return { ...c, comprobanteUrl };
      }),
    );
    setLiquidados(withUrls);
  }

  useEffect(() => {
    if (!app.coupleId || !app.cycleId) return;
    // Carga inicial estándar — ver nota en app/saldo/page.tsx sobre esta regla.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(app.coupleId, app.cycleId);
  }, [app.coupleId, app.cycleId]);

  if (app.loading || liquidados === null) return <LoadingScreen />;

  const diasAbierto = cicloAbiertoInicio
    ? diasEntre(cicloAbiertoInicio, new Date().toISOString())
    : 0;
  const record = liquidados.length
    ? Math.max(...liquidados.map((c) => diasEntre(c.fecha_inicio, c.fecha_cierre)))
    : null;

  const maxCategoria = Math.max(1, ...Object.values(porCategoria));

  return (
    <main style={{ padding: 24, maxWidth: 480, margin: "0 auto" }}>
      <h1 className="font-display" style={{ textAlign: "center" }}>
        Ciclos
      </h1>

      <section
        style={{
          background: "var(--color-tint-gold)",
          borderRadius: "var(--radius-card)",
          padding: 16,
          textAlign: "center",
          margin: "16px 0",
        }}
      >
        <p style={{ fontSize: 14, color: "var(--color-ink-muted-2)" }}>Ciclo abierto</p>
        <p style={{ fontSize: 24, fontWeight: 700 }}>{diasAbierto} días</p>
        {record !== null && (
          <p style={{ fontSize: 13, color: "var(--color-ink-muted)" }}>
            Récord de la pareja: {record} días
          </p>
        )}
      </section>

      <section>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Gasto por categoría (ciclo abierto)</h2>
        {Object.keys(porCategoria).length === 0 && (
          <p style={{ color: "var(--color-ink-muted)", fontSize: 14 }}>
            Todavía no hay gastos de pareja clasificados este ciclo.
          </p>
        )}
        <div style={{ display: "grid", gap: 8 }}>
          {[...CATEGORIES, "Otro"]
            .filter((cat) => porCategoria[cat])
            .map((cat) => (
              <div key={cat}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span>{cat}</span>
                  <span className="tabular-nums">S/{(porCategoria[cat] ?? 0).toFixed(2)}</span>
                </div>
                <div style={{ height: 8, borderRadius: "999px", background: "var(--color-border)" }}>
                  <div
                    style={{
                      height: "100%",
                      borderRadius: "999px",
                      width: `${((porCategoria[cat] ?? 0) / maxCategoria) * 100}%`,
                      background: CATEGORY_COLORS[cat] ?? "var(--color-ink-disabled)",
                    }}
                  />
                </div>
              </div>
            ))}
        </div>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Ciclos liquidados</h2>
        {liquidados.length === 0 ? (
          <p style={{ color: "var(--color-ink-muted)", fontSize: 14 }}>
            Todavía no han liquidado ningún ciclo.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {liquidados.map((c) => (
              <div
                key={c.id}
                style={{
                  background: "var(--color-surface)",
                  border: "2px solid var(--color-border)",
                  borderRadius: "var(--radius-card)",
                  padding: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ fontSize: 13 }}>
                  <div>
                    {new Date(c.fecha_inicio).toLocaleDateString("es-PE")} –{" "}
                    {new Date(c.fecha_cierre).toLocaleDateString("es-PE")}
                  </div>
                  <div style={{ color: "var(--color-ink-muted)" }}>
                    {diasEntre(c.fecha_inicio, c.fecha_cierre)} días
                  </div>
                </div>
                {c.comprobanteUrl && (
                  <a href={c.comprobanteUrl} target="_blank" rel="noreferrer" className="chip">
                    Ver comprobante
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
