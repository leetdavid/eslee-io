import type { TableOfContentsItem } from "@/lib/headings";

export function TableOfContents({ headings }: { headings: TableOfContentsItem[] }) {
  if (headings.length < 2) return null;

  return (
    <aside
      className="sticky top-8 hidden max-h-[calc(100vh-4rem)] overflow-y-auto xl:block"
      aria-label="On this page"
    >
      <p className="mb-4 font-mono text-muted-foreground text-xs uppercase tracking-wide">
        On this page
      </p>
      <ol className="space-y-3 border-border border-l text-muted-foreground text-sm">
        {headings.map((heading) => (
          <li
            key={heading.id}
            className={heading.level === 3 ? "pl-5" : heading.level === 4 ? "pl-7" : "pl-3"}
          >
            <a className="hover:text-foreground" href={`#${heading.id}`}>
              {heading.text}
            </a>
          </li>
        ))}
      </ol>
    </aside>
  );
}
