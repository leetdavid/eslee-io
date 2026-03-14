import { AppSidebar } from "@/components/app-sidebar";
import { CommandMenu } from "@/components/command-menu";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TRPCReactProvider } from "@/trpc/react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <TRPCReactProvider>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 64)",
            "--header-height": "calc(var(--spacing) * 14)",
          } as React.CSSProperties
        }
      >
        <AppSidebar variant="inset" />
        <SidebarInset className="flex h-svh max-h-svh flex-1 flex-col overflow-hidden">
          <SiteHeader />
          <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background text-foreground">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
      <CommandMenu />
    </TRPCReactProvider>
  );
}
