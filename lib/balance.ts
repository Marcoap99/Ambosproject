// Cálculo de saldo — PRD §7.1-7.3.
//
// Nota importante (ver PRD §7.1): en el wireframe (una sola pantalla) la
// contribución de la pareja se simulaba con una constante fija porque no
// había una segunda sesión real clasificando en paralelo. Acá NO existe eso
// — estas funciones reciben los Movement reales de los dos usuarios del
// Couple (ya vienen filtrados por Supabase RLS, ver supabase/migrations),
// nunca un valor hardcodeado.

export interface MovementForBalance {
  amount: number;
  classification: "personal" | "pareja" | null;
  split_ratio: number;
  payer_user_id: string;
  deleted_at: string | null;
}

export interface BalanceResult {
  /** positivo = tu pareja te debe; negativo = le debes a tu pareja; 0 = a mano */
  net: number;
  label: string;
}

/** Redondeo estándar a 2 decimales (no truncar), preservando el signo. */
export function roundCurrency(value: number): number {
  const sign = value < 0 ? -1 : 1;
  return (sign * Math.round(Math.abs(value) * 100)) / 100;
}

function isCountable(m: MovementForBalance): boolean {
  // split_ratio = 0 ("invito") se excluye por completo — ni saldo ni total
  // compartido (PRD §7.1: bug real detectado y corregido en el wireframe).
  return m.classification === "pareja" && m.split_ratio > 0 && m.deleted_at === null;
}

export function calculateBalance(
  movements: MovementForBalance[],
  currentUserId: string,
): BalanceResult {
  let net = 0;
  for (const m of movements) {
    if (!isCountable(m)) continue;
    const share = m.amount * m.split_ratio;
    net += m.payer_user_id === currentUserId ? share : -share;
  }
  net = roundCurrency(net);
  return { net, label: balanceLabel(net) };
}

export function balanceLabel(net: number): string {
  if (net > 0) return `Tu pareja te debe S/${net.toFixed(2)}`;
  if (net < 0) return `Le debes a tu pareja S/${Math.abs(net).toFixed(2)}`;
  return "Están a mano";
}

/** Total compartido del ciclo — PRD §7.3. */
export function totalCompartido(movements: MovementForBalance[]): number {
  let total = 0;
  for (const m of movements) {
    if (!isCountable(m)) continue;
    total += m.amount;
  }
  return roundCurrency(total);
}

/** Etiqueta del split para UI — PRD §7.2. */
export function splitLabel(
  splitRatio: number,
  isCurrentUserPayer: boolean,
): string {
  if (splitRatio === 0) {
    return isCurrentUserPayer ? "Yo invito" : "Tu pareja invita";
  }
  if (splitRatio === 0.5) return "50 / 50";

  const payerLabel = isCurrentUserPayer ? "Tú" : "Tu pareja";
  const otherLabel = isCurrentUserPayer ? "Tu pareja" : "Tú";
  const payerPct = Math.round((1 - splitRatio) * 100);
  const otherPct = Math.round(splitRatio * 100);
  return `${payerLabel} ${payerPct}% / ${otherLabel} ${otherPct}%`;
}
