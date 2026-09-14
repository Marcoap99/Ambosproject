import type { Metadata, Viewport } from "next";
import { Architects_Daughter, IBM_Plex_Sans } from "next/font/google";

import "./globals.css";

// DESIGN_SYSTEM.md §2 pide "Architects Daughter" (títulos, .font-display) e
// "IBM Plex Sans" (todo el resto). Nunca se habían cargado de verdad — sin
// esto el navegador caía en una fuente genérica y la app no se parecía a
// los mockups. next/font las self-hostea (sin llamada externa a Google) y
// las expone como variables CSS que globals.css ya referencia.
const architectsDaughter = Architects_Daughter({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-architects-daughter",
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans",
});

export const metadata: Metadata = {
  title: "Ambos",
  description: "Gastos compartidos de pareja, sin anotar nada a mano.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#FFFBF2",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${architectsDaughter.variable} ${ibmPlexSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
