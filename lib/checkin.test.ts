import { describe, expect, it } from "vitest";
import { shouldShowGraceBanner, weeklyStreak } from "./checkin";

describe("weeklyStreak", () => {
  it("devuelve los últimos 7 días en orden ascendente con su estado", () => {
    const dates = new Set(["2026-09-08", "2026-09-09", "2026-09-10"]);
    const week = weeklyStreak(dates, "2026-09-10");
    expect(week).toHaveLength(7);
    expect(week[0]?.fecha).toBe("2026-09-04");
    expect(week[6]).toEqual({ fecha: "2026-09-10", respondido: true });
    expect(week[5]).toEqual({ fecha: "2026-09-09", respondido: true });
    expect(week[0]).toEqual({ fecha: "2026-09-04", respondido: false });
  });
});

describe("shouldShowGraceBanner", () => {
  it("se muestra si ayer no se contestó y hoy tampoco todavía", () => {
    const dates = new Set(["2026-09-08"]); // falta 09 (ayer) y 10 (hoy)
    expect(shouldShowGraceBanner(dates, "2026-09-10")).toBe(true);
  });

  it("no se muestra si ayer sí se contestó", () => {
    const dates = new Set(["2026-09-09"]);
    expect(shouldShowGraceBanner(dates, "2026-09-10")).toBe(false);
  });

  it("no se muestra si hoy ya se contestó (no acumula backlog indefinido)", () => {
    const dates = new Set(["2026-09-10"]); // ayer sigue sin contestar, pero hoy ya sí
    expect(shouldShowGraceBanner(dates, "2026-09-10")).toBe(false);
  });
});
