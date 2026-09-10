import { BottomNav } from "@/components/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ paddingBottom: 64 }}>
      {children}
      <BottomNav />
    </div>
  );
}
