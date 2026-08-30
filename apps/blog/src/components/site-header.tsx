import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader() {
  return (
    <header className="flex items-center justify-between border-border border-b py-5">
      <div className="flex items-baseline gap-3">
        <Link className="font-medium text-sm tracking-tight" href="https://eslee.io">
          David E. S. Lee
        </Link>
        <Link
          className="text-muted-foreground text-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          href="/"
        >
          / Blog
        </Link>
      </div>
      <ThemeToggle />
    </header>
  );
}
