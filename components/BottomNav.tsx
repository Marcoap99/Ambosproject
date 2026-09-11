"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

const ITEMS = [
  { href: "/hoy", label: "Hoy" },
  { href: "/historial", label: "Historial" },
  { href: "/ciclos", label: "Ciclos" },
] as const;

// Barra de navegación fija entre las pantallas de uso diario. No aparece en
// onboarding/login ni en /registrar o /liquidar (esas son overlays de flujo,
// DESIGN_SYSTEM.md §4 "Overlay/modal" — pantalla completa, no navegación).
export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        background: "var(--color-surface)",
        borderTop: "2px solid var(--color-border)",
        padding: "10px 0",
        paddingBottom: "calc(10px + env(safe-area-inset-bottom))",
      }}
    >
      {ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              fontSize: 13,
              fontWeight: active ? 700 : 500,
              color: active ? "var(--color-accent)" : "var(--color-ink-disabled)",
              textDecoration: "none",
            }}
          >
            {item.label}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={handleSignOut}
        style={{
          fontSize: 12,
          color: "var(--color-ink-disabled)",
          background: "none",
          border: "none",
          textDecoration: "underline",
          cursor: "pointer",
        }}
      >
        Salir
      </button>
    </nav>
  );
}
