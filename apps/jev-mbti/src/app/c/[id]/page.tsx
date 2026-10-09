import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ChartView } from "@/components/chart/chart-view";
import { Notebook } from "@/components/notebook";
import { getLocale } from "@/server/locale";
import { LLM_LABEL } from "@/server/models";
import { charts } from "@/server/service";

export const dynamic = "force-dynamic";

const loadChart = cache((id: string) => charts.load(id));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const chart = await loadChart(id);
  if (!chart) return { title: "Jev MBTI" };
  const image = `/c/${chart.id}/image`;
  return {
    title: chart.question,
    description: chart.plot.questionText[chart.questionLanguage === "ko" ? "en" : "ko"],
    openGraph: { title: chart.question, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title: chart.question, images: [image] },
  };
}

export default async function ChartPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query, locale] = await Promise.all([params, searchParams, getLocale()]);
  const chart = await loadChart(id);
  if (!chart) notFound();
  const created = new Date(chart.createdAt);
  const date = `${created.getUTCFullYear()}. ${String(created.getUTCMonth() + 1).padStart(2, "0")}. ${String(created.getUTCDate()).padStart(2, "0")}`;
  return (
    <Notebook
      locale={locale}
      fields={{ number: chart.id.slice(0, 4).toUpperCase(), date }}
      showNewQuestion
      footerModel={chart.reviewModel ?? LLM_LABEL}
    >
      <ChartView
        initial={chart}
        locale={locale}
        animateIn={query.new === "1"}
        reviewer={LLM_LABEL}
      />
    </Notebook>
  );
}
