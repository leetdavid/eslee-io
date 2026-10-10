import type { Metadata } from "next";
import { StatsView } from "@/components/stats-view";
import { hongKongDayRange } from "@/lib/stats";

export const metadata: Metadata = { title: "統計 | Sushiro HK" };

// The view, the date and the branch live in the URL so a Stats link can be bookmarked or shared.
export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string; date?: string; view?: string }>;
}) {
  const { branch, date, view } = await searchParams;
  const branchId = Number(branch);

  return (
    <StatsView
      initialBranch={Number.isSafeInteger(branchId) && branchId > 0 ? branchId : null}
      initialDate={date && hongKongDayRange(date) ? date : null}
      initialView={view === "patterns" ? "patterns" : "daily"}
    />
  );
}
