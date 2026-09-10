"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { shouldShowGraceBanner, weeklyStreak } from "@/lib/checkin";
import { addDays, getLocalDateString, yesterdayOf } from "@/lib/date";
import { createClient } from "@/lib/supabase/client";
import { useAppData } from "@/lib/useAppData";

// Depende de la sesión del usuario — nunca se pre-renderiza estático.
export const dynamic = "force-dynamic";

interface CheckIn {
  fecha: string;
  tuvo_gastos: boolean;
}

export default function HoyPage() {
  const router = useRouter();
  const app = useAppData();
  const [checkIns, setCheckIns] = useState<CheckIn[] | null>(null);
  const [saving, setSaving] = useState(false);
  const today = getLocalDateString();

  useEffect(() => {
    if (!app.userId) return;
    void loadCheckIns(app.userId);
  }, [app.userId]);

  async function loadCheckIns(userId: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from("check_ins")
      .select("fecha, tuvo_gastos")
      .eq("user_id", userId)
      .gte("fecha", addDays(getLocalDateString(), -8));
    setCheckIns(data ?? []);
  }

  async function answer(fecha: string, tuvoGastos: boolean) {
    if (!app.userId) return;
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from("check_ins")
      .upsert({ user_id: app.userId, fecha, tuvo_gastos: tuvoGastos }, { onConflict: "user_id,fecha" });
    setSaving(false);
    await loadCheckIns(app.userId);
    if (fecha === today && tuvoGastos) router.push("/clasificar");
  }

  if (app.loading || checkIns === null) {
    return null;
  }

  const checkInDates = new Set(checkIns.map((c) => c.fecha));
  const week = weeklyStreak(checkInDates, today);
  const grace = shouldShowGraceBanner(checkInDates, today);
  const todayCheckIn = checkIns.find((c) => c.fecha === today);

  return (
    <main style={{ padding: 24, maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
      <StreakRow week={week} />

      {grace && (
        <div
          style={{
            background: "var(--color-tint-gold)",
            borderRadius: "var(--radius-card)",
            padding: 12,
            margin: "16px 0",
            fontSize: 14,
          }}
        >
          Ayer no contestaste — ¿tuviste gastos con tu pareja?{" "}
          <button
            type="button"
            onClick={() => answer(yesterdayOf(today), true)}
            style={{ fontWeight: 700, border: "none", background: "none", cursor: "pointer" }}
          >
            Sí
          </button>{" "}
          /{" "}
          <button
            type="button"
            onClick={() => answer(yesterdayOf(today), false)}
            style={{ fontWeight: 700, border: "none", background: "none", cursor: "pointer" }}
          >
            No
          </button>
        </div>
      )}

      {!todayCheckIn && (
        <>
          <Image
            src="/assets/dog-neutral.jpg"
            alt=""
            width={140}
            height={140}
            style={{ borderRadius: "50%", objectFit: "cover" }}
          />
          <h1 className="font-display">¿Tuviste gastos con tu pareja hoy?</h1>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 16 }}>
            <button
              className="button-primary"
              disabled={saving}
              onClick={() => answer(today, true)}
            >
              Sí
            </button>
            <button
              type="button"
              className="chip"
              disabled={saving}
              onClick={() => answer(today, false)}
            >
              Hoy no
            </button>
          </div>
        </>
      )}

      {todayCheckIn?.tuvo_gastos === false && (
        <>
          <Image
            src="/assets/dog-worried.jpg"
            alt=""
            width={140}
            height={140}
            style={{ borderRadius: "50%", objectFit: "cover" }}
          />
          <p style={{ color: "var(--color-ink-muted)" }}>
            Anotado — hoy no hubo gastos compartidos.
          </p>
        </>
      )}

      {todayCheckIn?.tuvo_gastos === true && (
        <>
          <p style={{ color: "var(--color-ink-muted)" }}>Ya contestaste que sí hoy.</p>
          <button className="button-primary" onClick={() => router.push("/clasificar")}>
            Ir a clasificar
          </button>
        </>
      )}

      <FloatingAddButton />
    </main>
  );
}

function StreakRow({ week }: { week: { fecha: string; respondido: boolean }[] }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 8 }}>
      {week.map((d) => (
        <span
          key={d.fecha}
          style={{
            width: 10,
            height: 10,
            borderRadius: "999px",
            background: d.respondido ? "var(--color-accent-gold)" : "var(--color-border)",
          }}
        />
      ))}
    </div>
  );
}

export function FloatingAddButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.push("/registrar")}
      aria-label="Registrar gasto"
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: "999px",
        background: "var(--color-accent)",
        color: "#fff",
        border: "none",
        fontSize: 28,
        boxShadow: "0 4px 0 rgba(0,0,0,.12)",
        cursor: "pointer",
      }}
    >
      +
    </button>
  );
}
