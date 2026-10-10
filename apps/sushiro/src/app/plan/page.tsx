import type { Metadata } from "next";
import { PlanView } from "@/components/plan-view";
import { parseClock } from "@/lib/plan";

export const metadata: Metadata = { title: "計劃用餐 | Sushiro HK" };

// The weekday and the ticket time live in the URL so a plan can be bookmarked or shared.
export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string; time?: string }>;
}) {
  const { day, time } = await searchParams;
  const weekday = Number(day);

  return (
    <PlanView
      initialMinute={parseClock(time)}
      initialWeekday={
        day !== undefined && Number.isInteger(weekday) && weekday >= 0 && weekday <= 6
          ? weekday
          : null
      }
    />
  );
}
