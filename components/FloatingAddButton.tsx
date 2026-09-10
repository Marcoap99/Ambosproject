"use client";

import { useRouter } from "next/navigation";

// Botón flotante de registro manual (PRD §5.5) — accesible desde Hoy y
// Clasificar, para lo que el parser de Gmail no captura (o antes de M3,
// para todo).
export function FloatingAddButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.push("/registrar")}
      aria-label="Registrar gasto"
      style={{
        position: "fixed",
        bottom: 76,
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
