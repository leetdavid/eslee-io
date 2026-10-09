import { Plus } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { LanguageToggle } from "@/components/language-toggle";
import type { Locale } from "@/lib/i18n";
import { MESSAGES } from "@/lib/i18n";

function Spiral() {
  return (
    <div className="spiral" aria-hidden="true">
      {Array.from({ length: 40 }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: decorative rings never reorder
        <span key={index} />
      ))}
    </div>
  );
}

/** Notebook header fields: the chart number and the date it was written. */
export function Fields({
  number,
  date,
  className,
}: {
  number: string;
  date: string;
  className?: string;
}) {
  return (
    <div className={`fields ${className ?? ""}`}>
      <span>
        No.<b className="num">{number}</b>
      </span>
      <span>
        Date<b className="num">{date}</b>
      </span>
    </div>
  );
}

export function Notebook({
  locale,
  fields,
  showNewQuestion,
  footerModel,
  children,
}: {
  locale: Locale;
  fields?: { number: string; date: string };
  showNewQuestion?: boolean;
  footerModel: string;
  children: ReactNode;
}) {
  const t = MESSAGES[locale];
  return (
    <div className="page">
      <main className="sheet">
        <Spiral />
        <header className="top">
          <Link className="wordmark" href="/">
            Jev MBTI
          </Link>
          <div className="top-end">
            {fields ? <Fields {...fields} className="desktop-only" /> : null}
            <LanguageToggle locale={locale} />
            {showNewQuestion ? (
              <Link
                href="/"
                className="desktop-only inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-white px-3.5 font-semibold text-[14px] shadow-[0_0_0_1px_rgb(29_37_80/0.16),0_1px_2px_rgb(29_37_80/0.06)]"
              >
                <Plus size={16} aria-hidden="true" />
                {t.newQuestion}
              </Link>
            ) : null}
          </div>
        </header>
        {fields ? <Fields {...fields} className="mobile-only" /> : null}
        {children}
      </main>
      <footer className="foot">
        <span>{t.footerPlaced(footerModel)}</span>
        <span>{t.footerLore}</span>
      </footer>
    </div>
  );
}
