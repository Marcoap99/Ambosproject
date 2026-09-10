export default function Home() {
  // Placeholder de M0. M1 agrega auth y redirige a /hoy o /onboarding
  // según si el usuario ya tiene Couple.
  return (
    <main style={{ padding: 24 }}>
      <h1 className="font-display">Ambos</h1>
      <p style={{ color: "var(--color-ink-muted)" }}>
        Scaffolding M0 — próximo: auth + modelo de datos (M1).
      </p>
    </main>
  );
}
