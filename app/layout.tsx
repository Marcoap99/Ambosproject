import type { Metadata, Viewport } from "next";
import "./globals.css";

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
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
