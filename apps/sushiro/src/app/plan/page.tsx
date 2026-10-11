import type { Metadata } from "next";
import { PlanView } from "@/components/plan-view";
import { parseClock } from "@/lib/plan";

export const metadata: Metadata = { title: "計劃用餐 | Sushiro HK" };

// The weekday, the time and whether it is a ticket time or an eating time live in the URL so a plan can be bookmarked or shared.
// `next` is the date meant when the weekday was picked for the week after today.
export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string; mode?: string; next?: string; time?: string }>;
}) {
  const { day, mode, next, time } = await searchParams;
  const weekday = Number(day);

  return (
    <PlanView
      initialMinute={parseClock(time)}
      initialMode={mode === "eat" ? "eat" : "ticket"}
      initialWeekOn={typeof next === "string" && /^\d{4}-\d{2}-\d{2}$/.test(next) ? next : null}
      initialWeekday={
        day !== undefined && Number.isInteger(weekday) && weekday >= 0 && weekday <= 6
          ? weekday
          : null
      }
    />
  );
}
