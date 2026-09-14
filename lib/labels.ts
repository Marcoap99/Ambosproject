import type { CSSProperties } from "react";

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

export const CATEGORY_TINTS: Record<string, string> = {
  Comida: "var(--color-cat-comida-tint)",
  Salidas: "var(--color-cat-salidas-tint)",
  Transporte: "var(--color-cat-transporte-tint)",
  Compras: "var(--color-cat-compras-tint)",
};

// DESIGN_SYSTEM.md §4 "Chip de selección": cada chip lleva el color de SU
// identidad, no un acento genérico compartido — "Pareja" se distingue del
// resto incluso sin seleccionar, para que no se confunda con estar viendo
// el correo del otro (§7.4). Valores tomados 1:1 del mockup.
export function classificationChipStyle(
  kind: "personal" | "pareja",
  selected: boolean,
): CSSProperties {
  if (kind === "personal") {
    return selected
      ? { background: "var(--color-ink)", color: "var(--color-bg)", borderColor: "var(--color-ink)" }
      : {
          background: "var(--color-surface)",
          color: "var(--color-ink)",
          borderColor: "var(--color-chip-border-neutral)",
        };
  }
  return selected
    ? { background: "var(--color-pareja)", color: "var(--color-bg)", borderColor: "var(--color-pareja)" }
    : {
        background: "var(--color-surface)",
        color: "var(--color-pareja)",
        borderColor: "var(--color-pareja-border)",
      };
}

export function categoryChipStyle(category: string, selected: boolean): CSSProperties {
  return selected
    ? {
        background: CATEGORY_TINTS[category] ?? "var(--color-surface-muted)",
        color: CATEGORY_COLORS[category] ?? "var(--color-ink-muted-2)",
        borderColor: CATEGORY_COLORS[category] ?? "var(--color-chip-border-neutral)",
      }
    : {
        background: "var(--color-surface)",
        color: "var(--color-ink-muted-2)",
        borderColor: "var(--color-chip-border-neutral)",
      };
}
