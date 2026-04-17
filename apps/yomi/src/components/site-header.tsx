"use client";

import { Search } from "lucide-react";
import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function SiteHeader() {
  const pathname = usePathname();

  const title = pathname.startsWith("/clips")
    ? "Clips"
    : pathname.startsWith("/settings")
      ? "Settings"
      : "Yomi";

  return (
    <header className="flex h-(--header-height) shrink-0 items-center justify-between gap-2 border-b bg-background px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height) lg:px-6">
      <div className="flex items-center gap-1 lg:gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 h-4 data-vertical:self-auto" />
        <h1 className="font-medium text-base">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => document.dispatchEvent(new CustomEvent("open-command-menu"))}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 font-medium text-muted-foreground text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Search className="h-4 w-4" />
          <span className="mr-0 hidden sm:inline-block lg:mr-8">Search...</span>
          <kbd className="pointer-events-none ml-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-medium font-mono text-[10px] text-muted-foreground opacity-100 sm:inline-flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>
      </div>
    </header>
  );
}
