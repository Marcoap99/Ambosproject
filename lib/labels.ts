import type { PaymentMethod } from "./useAppData";

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  efectivo: "Efectivo",
  yape: "Yape",
  plin: "Plin",
  agora: "Agora",
  tarjeta_debito: "Débito",
  tarjeta_credito: "Crédito",
  banco: "Banco",
};

export function paymentMethodLabel(pm: PaymentMethod): string {
  if (pm.tipo === "banco" && pm.banco) return pm.banco;
  return PAYMENT_METHOD_LABELS[pm.tipo] ?? pm.tipo;
}

export function findMatchingMethod(
  methods: PaymentMethod[],
  tipo: string,
): PaymentMethod | undefined {
  return methods.find((m) => m.tipo === tipo);
}

export const CATEGORIES = ["Comida", "Salidas", "Transporte", "Compras"] as const;

export const CATEGORY_COLORS: Record<string, string> = {
  Comida: "var(--color-cat-comida)",
  Salidas: "var(--color-cat-salidas)",
  Transporte: "var(--color-cat-transporte)",
  Compras: "var(--color-cat-compras)",
};
