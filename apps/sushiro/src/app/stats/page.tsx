import type { Metadata } from "next";
import { StatsView } from "@/components/stats-view";
import { hongKongDayRange } from "@/lib/stats";

export const metadata: Metadata = { title: "統計 | Sushiro HK" };

// The view and the date live in the URL so a Stats link can be bookmarked or shared.
export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string }>;
}) {
  const { date, view } = await searchParams;

  return (
    <StatsView
      initialDate={date && hongKongDayRange(date) ? date : null}
      initialView={view === "patterns" ? "patterns" : "daily"}
    />
  );
}
