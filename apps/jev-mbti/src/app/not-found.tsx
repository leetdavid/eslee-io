import { FileQuestion } from "lucide-react";
import Link from "next/link";
import { Notebook } from "@/components/notebook";
import { MESSAGES } from "@/lib/i18n";
import { getLocale } from "@/server/locale";
import { LLM_LABEL } from "@/server/models";

export default async function NotFound() {
  const locale = await getLocale();
  const t = MESSAGES[locale];
  return (
    <Notebook locale={locale} footerModel={LLM_LABEL}>
      <section
        className="gridbg"
        style={{
          marginTop: 28,
          borderRadius: 8,
          padding: "64px 20px",
          textAlign: "center",
          display: "grid",
          justifyItems: "center",
          gap: 6,
        }}
      >
        <span
          style={{
            display: "inline-grid",
            placeItems: "center",
            width: 56,
            height: 56,
            borderRadius: 14,
            background: "#fff",
            boxShadow: "0 0 0 1px rgb(29 37 80 / 0.14)",
            color: "var(--ink-soft)",
          }}
        >
          <FileQuestion size={26} aria-hidden="true" />
        </span>
        <h1 style={{ margin: "10px 0 0", fontSize: 22, fontWeight: 800 }}>{t.missingTitle}</h1>
        <p className="pencil" style={{ margin: 0, fontSize: 22 }}>
          {t.missingDetail}
        </p>
        <Link
          href="/"
          style={{
            marginTop: 14,
            display: "inline-flex",
            alignItems: "center",
            height: 40,
            padding: "0 16px",
            borderRadius: 10,
            background: "var(--ink)",
            color: "#fff",
            fontWeight: 650,
            textDecoration: "none",
          }}
        >
          {t.missingAction}
        </Link>
      </section>
    </Notebook>
  );
}
