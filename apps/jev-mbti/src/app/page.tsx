import { PenLine } from "lucide-react";
import { Circled } from "@/components/hand-drawn";
import { Composer, type ComposerPrefill } from "@/components/home/composer";
import { ExampleCard } from "@/components/home/example-card";
import { Notebook } from "@/components/notebook";
import { MESSAGES } from "@/lib/i18n";
import { AXIS_MODES, type AxisMode } from "@/lib/question";
import { getLocale } from "@/server/locale";
import { LLM_LABEL } from "@/server/models";
import { charts } from "@/server/service";

export const dynamic = "force-dynamic";

function prefillFrom(
  params: Record<string, string | string[] | undefined>,
): ComposerPrefill | undefined {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const question = first(params.q)?.slice(0, 500);
  if (!question) return undefined;
  const mode = first(params.mode);
  const ends = (low?: string, high?: string) =>
    low !== undefined && high !== undefined ? [{ low, high }] : [];
  const axes = [
    ...ends(first(params.xl), first(params.xh)),
    ...ends(first(params.yl), first(params.yh)),
  ];
  return {
    question,
    mode: AXIS_MODES.includes(mode as AxisMode) ? (mode as AxisMode) : "auto",
    ...(axes.length ? { axes } : {}),
  };
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [locale, params, examples] = await Promise.all([
    getLocale(),
    searchParams,
    charts.examples().catch((error) => {
      console.error(
        "Example charts are unavailable",
        error instanceof Error ? error.message : error,
      );
      return [];
    }),
  ]);
  const t = MESSAGES[locale];
  return (
    <Notebook locale={locale} footerModel={LLM_LABEL}>
      <section className="hero">
        <h1>
          {t.homeHeadlineBefore}
          <Circled>{t.homeHeadlineCircled}</Circled>
          {t.homeHeadlineAfter}
        </h1>
        <p className="lead">{t.homeLead}</p>
        <Composer locale={locale} prefill={prefillFrom(params)} />
      </section>
      <section className="how" aria-label={t.howTitle}>
        <div>
          <span className="step-mark num">1</span>
          <p style={{ margin: 0 }}>
            <b>{t.howAxes}</b>
            <span>{t.howAxesBody}</span>
          </p>
        </div>
        <div>
          <span className="step-mark jev">J</span>
          <p style={{ margin: 0 }}>
            <b>{t.howJev}</b>
            <span>{t.howJevBody}</span>
          </p>
        </div>
        <div>
          <span className="step-mark pen">
            <PenLine size={16} aria-hidden="true" />
          </span>
          <p style={{ margin: 0 }}>
            <b>{t.howReview}</b>
            <span>{t.howReviewBody}</span>
          </p>
        </div>
      </section>
      {examples.length ? (
        <section aria-labelledby="examples-title">
          <div className="list-head" style={{ marginTop: 34 }}>
            <h2 id="examples-title">{t.examplesTitle}</h2>
          </div>
          <div className="examples">
            {examples.map((example) => (
              <ExampleCard key={example.id} example={example} locale={locale} />
            ))}
          </div>
        </section>
      ) : null}
    </Notebook>
  );
}
