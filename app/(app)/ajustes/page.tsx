"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { disablePushReminder, enablePushReminder, getPushStatus, type PushStatus } from "@/lib/pushClient";
import { createClient } from "@/lib/supabase/client";

// Depende de la sesión del usuario — nunca se pre-renderiza estático.
export const dynamic = "force-dynamic";

interface Profile {
  id: string;
  email: string;
  nombre: string;
}

interface CoupleInfo {
  partnerNombre: string | null; // null = tiene pareja pero sin nombre todavía; undefined-like via "sinPareja"
}

const FAQ = [
  {
    q: "¿Por qué Ambos pide acceso a mi Gmail?",
    a: "Para detectar solo los correos de notificación de pago (Yape, Plin, banco) y registrar el gasto sin que tengas que escribirlo a mano. No leemos ningún otro correo.",
  },
  {
    q: "¿Mi pareja puede ver mis gastos personales?",
    a: "No. Tu pareja solo ve un gasto tuyo si lo clasificaste como \"Pareja\". Todo lo que marques como \"Personal\", o que todavía no hayas clasificado, es solo tuyo — a nivel de base de datos, no solo de pantalla.",
  },
  {
    q: "¿Qué pasa si borro mi cuenta?",
    a: "Se borra tu cuenta y, como el saldo es de la pareja, también se borra el historial compartido completo (ciclos, gastos, comprobantes) de los dos. Tu pareja no pierde su cuenta, pero sí ese historial y tendría que emparejarse de nuevo.",
  },
];

export default function AjustesPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [nombreDraft, setNombreDraft] = useState("");
  const [savingNombre, setSavingNombre] = useState(false);
  const [couple, setCouple] = useState<CoupleInfo | "sinPareja" | null>(null);
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null);
  const [pushStatus, setPushStatus] = useState<PushStatus | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(): Promise<void> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login");
      return;
    }

    const { data: userRow } = await supabase
      .from("users")
      .select("nombre")
      .eq("id", user.id)
      .single();
    setProfile({ id: user.id, email: user.email ?? "", nombre: userRow?.nombre ?? "" });
    setNombreDraft(userRow?.nombre ?? "");

    const { data: coupleRow } = await supabase
      .from("couples")
      .select("user_a_id, user_b_id")
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
      .maybeSingle();

    if (!coupleRow) {
      setCouple("sinPareja");
    } else {
      const partnerId = coupleRow.user_a_id === user.id ? coupleRow.user_b_id : coupleRow.user_a_id;
      if (!partnerId) {
        setCouple("sinPareja");
      } else {
        const { data: partnerRow } = await supabase
          .from("users")
          .select("nombre")
          .eq("id", partnerId)
          .maybeSingle();
        setCouple({ partnerNombre: partnerRow?.nombre ?? null });
      }
    }

    const gmailRes = await fetch("/api/account/gmail-status");
    const gmailData = await gmailRes.json();
    setGmailConnected(!!gmailData.connected);

    setPushStatus(await getPushStatus());
  }

  async function handleTogglePush() {
    if (!profile) return;
    setPushBusy(true);
    if (pushStatus === "subscribed") {
      await disablePushReminder();
    } else {
      await enablePushReminder(profile.id);
    }
    setPushStatus(await getPushStatus());
    setPushBusy(false);
  }

  useEffect(() => {
    // Carga inicial estándar (fetch-en-effect, igual patrón que /hoy y
    // /onboarding/emparejar); la regla experimental del compiler la marca
    // inconsistentemente en componentes chicos, comprobado con un repro.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveNombre() {
    if (!nombreDraft.trim()) return;
    setSavingNombre(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("users").update({ nombre: nombreDraft.trim() }).eq("id", user.id);
      setProfile((p) => (p ? { ...p, nombre: nombreDraft.trim() } : p));
    }
    setSavingNombre(false);
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    setError(null);
    const res = await fetch("/api/account/delete", { method: "POST" });
    if (!res.ok) {
      setError("No pudimos borrar tu cuenta. Intenta de nuevo.");
      setDeleting(false);
      return;
    }
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (!profile) return null;

  return (
    <main style={{ padding: 24, maxWidth: 480, margin: "0 auto", paddingBottom: 64 }}>
      <h1 className="font-display" style={{ textAlign: "center" }}>
        Ajustes
      </h1>

      <Section title="Tu apodo">
        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="input"
            value={nombreDraft}
            onChange={(e) => setNombreDraft(e.target.value)}
            style={{ flex: 1 }}
          />
          <button
            type="button"
            className="chip"
            disabled={savingNombre || nombreDraft.trim() === profile.nombre}
            onClick={saveNombre}
          >
            Guardar
          </button>
        </div>
      </Section>

      <Section title="Cuenta">
        <p style={{ color: "var(--color-ink-muted)", fontSize: 14 }}>{profile.email}</p>
      </Section>

      <Section title="Tu pareja">
        {couple === "sinPareja" && (
          <p style={{ color: "var(--color-ink-muted)", fontSize: 14 }}>
            Todavía no tienes pareja emparejada.{" "}
            <Link href="/onboarding/emparejar" style={{ color: "var(--color-accent)" }}>
              Emparejar ahora
            </Link>
          </p>
        )}
        {couple && couple !== "sinPareja" && (
          <p style={{ color: "var(--color-ink-muted)", fontSize: 14 }}>
            Emparejado con {couple.partnerNombre || "tu pareja"}.
          </p>
        )}
      </Section>

      <Section title="Gmail">
        <p style={{ color: "var(--color-ink-muted)", fontSize: 14 }}>
          {gmailConnected === null
            ? "Revisando..."
            : gmailConnected
              ? "Conectado — detectamos tus notificaciones de pago automáticamente."
              : "Sin conectar todavía. Vuelve a entrar con Google para activarlo."}
        </p>
      </Section>

      <Section title="Recordatorio diario">
        <p style={{ color: "var(--color-ink-muted)", fontSize: 14, marginBottom: 8 }}>
          {pushStatus === "unsupported" &&
            "Tu navegador no soporta notificaciones push."}
          {pushStatus === "denied" &&
            "Bloqueaste las notificaciones — actívalas desde los ajustes del navegador para usar esto."}
          {(pushStatus === "subscribed" || pushStatus === "not-subscribed") &&
            "Un aviso a las 8pm si todavía no contestaste el check-in del día."}
        </p>
        {(pushStatus === "subscribed" || pushStatus === "not-subscribed") && (
          <button type="button" className="chip" disabled={pushBusy} onClick={handleTogglePush}>
            {pushStatus === "subscribed" ? "Desactivar" : "Activar recordatorio a las 8pm"}
          </button>
        )}
      </Section>

      <Section title="Ayuda">
        <div style={{ display: "grid", gap: 16 }}>
          {FAQ.map((item) => (
            <div key={item.q}>
              <p style={{ fontWeight: 600, fontSize: 14 }}>{item.q}</p>
              <p style={{ color: "var(--color-ink-muted)", fontSize: 13 }}>{item.a}</p>
            </div>
          ))}
        </div>
      </Section>

      <button type="button" className="chip" style={{ width: "100%", marginTop: 24 }} onClick={handleSignOut}>
        Cerrar sesión
      </button>

      <Section title="Zona de peligro">
        {!confirmingDelete && (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: "var(--radius-card)",
              border: "2px solid var(--color-accent)",
              background: "none",
              color: "var(--color-accent)",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Borrar mi cuenta
          </button>
        )}
        {confirmingDelete && (
          <div style={{ display: "grid", gap: 10 }}>
            <p style={{ fontSize: 13, color: "var(--color-ink-muted)" }}>
              Esto borra tu cuenta y TODO el historial compartido con tu pareja (ciclos, gastos,
              comprobantes) — no solo lo tuyo. No se puede deshacer.
            </p>
            <button
              type="button"
              disabled={deleting}
              onClick={handleDeleteAccount}
              style={{
                padding: 12,
                borderRadius: "var(--radius-card)",
                border: "none",
                background: "var(--color-accent)",
                color: "white",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {deleting ? "Borrando..." : "Sí, borrar todo"}
            </button>
            <button
              type="button"
              className="chip"
              disabled={deleting}
              onClick={() => setConfirmingDelete(false)}
            >
              Cancelar
            </button>
          </div>
        )}
        {error && <p className="error-text">{error}</p>}
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 24 }}>
      <h2 style={{ fontSize: 13, textTransform: "uppercase", color: "var(--color-ink-disabled)", marginBottom: 8 }}>
        {title}
      </h2>
      {children}
    </div>
  );
}
