import { last7Days, yesterdayOf } from "./date";

export interface WeekDay {
  fecha: string;
  respondido: boolean;
}

/** Racha semanal visible (PRD §5.2) — hábito de contestar, no del dinero. */
export function weeklyStreak(checkInDates: Set<string>, today: string): WeekDay[] {
  return last7Days(today).map((fecha) => ({ fecha, respondido: checkInDates.has(fecha) }));
}

/**
 * Día de gracia (PRD §5.2): si ayer no se contestó, se ofrece una sola vez
 * agregarlo retroactivamente. Al contestar hoy (lo que sea), el banner deja
 * de aplicar por su cuenta — nunca se acumula backlog.
 */
export function shouldShowGraceBanner(checkInDates: Set<string>, today: string): boolean {
  return !checkInDates.has(yesterdayOf(today)) && !checkInDates.has(today);
}
