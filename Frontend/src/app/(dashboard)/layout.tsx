import { Header } from "@/shared/components/layout/header";
import { Sidebar } from "@/shared/components/layout/Sidebar";
import { BottomNav } from "@/shared/components/layout/BottomNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-background p-4 pb-20 md:p-8 md:pb-8">
          <div className="mx-auto w-full max-w-screen-2xl">{children}</div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}