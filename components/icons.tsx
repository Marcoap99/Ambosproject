// Iconos compartidos — DESIGN_SYSTEM.md §5: "Nunca emoji ni dingbats. Todo
// ícono es SVG inline, trazo (stroke)". Trazado 1:1 desde el mockup
// (design/Main.dc.html) para que se vean igual que el diseño aprobado.
// Todos heredan color vía currentColor — nunca un color crudo adentro.

interface IconProps {
  size?: number;
}

export function PersonIcon({ size = 13 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
    </svg>
  );
}

export function PeopleIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
      <circle cx="9" cy="8" r="3" />
      <circle cx="16" cy="9" r="3" />
      <path d="M2 20v-1a5 5 0 0 1 5-5h1" />
      <path d="M12.5 20v-1a5 5 0 0 1 5-5h1a5 5 0 0 1 5 5v1" />
    </svg>
  );
}

export function PlusIcon({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function CloseIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export function CheckIcon({ size = 40 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function ArrowRightIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
}
