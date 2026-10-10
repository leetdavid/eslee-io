import type { ReactNode } from "react";
import {
  AppNavigation,
  type AppNavigationProps,
  BottomNavigation,
} from "@/components/app-navigation";
import { Button } from "@/components/ui/button";
import { copy, fill } from "@/lib/queue-presentation";

type AppShellProps = AppNavigationProps & {
  children: ReactNode;
  // Set when the last refresh failed: when the figures on screen were loaded, in epoch
  // milliseconds. The shell then says they are older and offers a retry.
  staleSince?: number | null;
};

export function AppShell({ children, staleSince, ...navigation }: AppShellProps) {
  const text = copy[navigation.language];
  const staleTime = staleSince
    ? new Intl.DateTimeFormat(navigation.language, {
        hour: "2-digit",
        hourCycle: "h23",
        minute: "2-digit",
      }).format(new Date(staleSince))
    : null;

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        {text[navigation.activePage]}
      </a>
      <AppNavigation {...navigation} />
      {staleTime ? (
        <div className="stale-notice" role="status">
          <span>{fill(text.staleNotice, { time: staleTime })}</span>
          <Button onClick={navigation.onRefresh} size="compact" variant="ghost">
            {text.retry}
          </Button>
        </div>
      ) : null}
      <main className={`app-content ${navigation.activePage}-page`} id="main-content" tabIndex={-1}>
        {children}
      </main>
      <BottomNavigation activePage={navigation.activePage} language={navigation.language} />
    </div>
  );
}
