import type { ReactNode } from "react";
import { AppNavigation, type AppNavigationProps } from "@/components/app-navigation";
import { copy } from "@/lib/queue-presentation";

type AppShellProps = AppNavigationProps & {
  children: ReactNode;
};

export function AppShell({ children, ...navigation }: AppShellProps) {
  const text = copy[navigation.language];

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        {text[navigation.activePage]}
      </a>
      <AppNavigation {...navigation} />
      <main className={`app-content ${navigation.activePage}-page`} id="main-content" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
