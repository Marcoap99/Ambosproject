// Fechas en la zona horaria LOCAL del dispositivo — nunca UTC/servidor.
// PRD §5.2: "corte de día: calendario, medianoche a medianoche en la zona
// horaria del dispositivo de cada usuario, no un huso horario fijo del servidor".

export function getLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fromDateString(dateStr: string): Date {
  const parts = dateStr.split("-").map(Number);
  const y = parts[0] ?? 1970;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  return new Date(y, m - 1, d);
}

export function addDays(dateStr: string, delta: number): string {
  const dt = fromDateString(dateStr);
  dt.setDate(dt.getDate() + delta);
  return getLocalDateString(dt);
}

export function yesterdayOf(dateStr: string): string {
  return addDays(dateStr, -1);
}

/** Los últimos 7 días (incluye `today`), en orden cronológico ascendente. */
export function last7Days(today: string): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) days.push(addDays(today, -i));
  return days;
}
