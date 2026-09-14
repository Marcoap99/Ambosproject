// Estado de carga compartido (M4) — reemplaza los `return null` que dejaban
// un flash en blanco mientras cada pantalla espera su primer fetch.
export function LoadingScreen() {
  return (
    <main style={{ padding: 24, maxWidth: 480, margin: "0 auto" }}>
      <div className="loading-dots" aria-label="Cargando" role="status">
        <span />
        <span />
        <span />
      </div>
    </main>
  );
}
