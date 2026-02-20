import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { TRPCReactProvider } from "@/trpc/react";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TRPCReactProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </TRPCReactProvider>
  );
}
