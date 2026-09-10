import { describe, expect, it } from "vitest";
import {
  balanceLabel,
  calculateBalance,
  roundCurrency,
  splitLabel,
  totalCompartido,
  type MovementForBalance,
} from "./balance";

const ME = "user-a";
const PARTNER = "user-b";

function movement(overrides: Partial<MovementForBalance> = {}): MovementForBalance {
  return {
    amount: 100,
    classification: "pareja",
    split_ratio: 0.5,
    payer_user_id: ME,
    deleted_at: null,
    ...overrides,
  };
}

describe("calculateBalance (§7.1)", () => {
  it("es bidireccional: paga cualquiera de los dos, el neto se calcula igual", () => {
    const iPay = calculateBalance([movement({ amount: 100, payer_user_id: ME })], ME);
    expect(iPay.net).toBe(50); // me deben 50

    const partnerPays = calculateBalance(
      [movement({ amount: 100, payer_user_id: PARTNER })],
      ME,
    );
    expect(partnerPays.net).toBe(-50); // le debo 50
  });

  it("suma varios movimientos de ambos pagadores (nunca una constante fija)", () => {
    const movements = [
      movement({ amount: 100, payer_user_id: ME, split_ratio: 0.5 }), // +50
      movement({ amount: 60, payer_user_id: PARTNER, split_ratio: 0.5 }), // -30
      movement({ amount: 40, payer_user_id: PARTNER, split_ratio: 1 }), // -40 (espejo del 0)
    ];
    expect(calculateBalance(movements, ME).net).toBe(-20);
  });

  it('excluye por completo split_ratio = 0 ("invito") — regresión del bug del wireframe', () => {
    const movements = [
      movement({ amount: 100, split_ratio: 0, payer_user_id: PARTNER }),
    ];
    expect(calculateBalance(movements, ME).net).toBe(0);
  });

  it("excluye movimientos personales", () => {
    const movements = [movement({ classification: "personal" })];
    expect(calculateBalance(movements, ME).net).toBe(0);
  });

  it("excluye movimientos sin clasificar (classification null)", () => {
    const movements = [movement({ classification: null })];
    expect(calculateBalance(movements, ME).net).toBe(0);
  });

  it("excluye movimientos borrados (soft-delete)", () => {
    const movements = [movement({ deleted_at: "2026-09-01T00:00:00Z" })];
    expect(calculateBalance(movements, ME).net).toBe(0);
  });

  it("redondea a 2 decimales sin truncar", () => {
    const movements = [movement({ amount: 33.33, split_ratio: 0.5, payer_user_id: ME })];
    // 33.33 * 0.5 = 16.665 -> redondeo estándar -> 16.67
    expect(calculateBalance(movements, ME).net).toBe(16.67);
  });
});

describe("balanceLabel", () => {
  it.each([
    [50, "Tu pareja te debe S/50.00"],
    [-50, "Le debes a tu pareja S/50.00"],
    [0, "Están a mano"],
  ])("net=%s -> %s", (net, expected) => {
    expect(balanceLabel(net)).toBe(expected);
  });
});

describe("roundCurrency", () => {
  it("preserva el signo en negativos", () => {
    expect(roundCurrency(-16.665)).toBe(-16.67);
  });
});

describe("totalCompartido (§7.3)", () => {
  it("suma solo pareja + split_ratio>0 + no borrado, igual criterio que el saldo", () => {
    const movements = [
      movement({ amount: 100 }),
      movement({ amount: 50, split_ratio: 0 }), // invito, excluido
      movement({ amount: 30, classification: "personal" }), // excluido
      movement({ amount: 20, deleted_at: "2026-09-01T00:00:00Z" }), // excluido
    ];
    expect(totalCompartido(movements)).toBe(100);
  });
});

describe("splitLabel (§7.2)", () => {
  it("caso invito, según quién paga", () => {
    expect(splitLabel(0, true)).toBe("Yo invito");
    expect(splitLabel(0, false)).toBe("Tu pareja invita");
  });

  it("caso 50/50", () => {
    expect(splitLabel(0.5, true)).toBe("50 / 50");
  });

  it("caso arbitrario, ej. 70/30", () => {
    expect(splitLabel(0.3, true)).toBe("Tú 70% / Tu pareja 30%");
    expect(splitLabel(0.3, false)).toBe("Tu pareja 70% / Tú 30%");
  });
});
