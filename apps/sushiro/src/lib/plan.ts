import {
  type UsualSlot,
  type UsualStore,
  usualAt,
  usualRange,
  usualStepMinutes,
} from "@/lib/usual";

// Plan a meal: what a branch usually makes you wait for a ticket taken at a chosen time, or the
// ticket to take for a meal at a chosen time.
export type PlanMode = "eat" | "ticket";
// "ticket" is the latest ticket that is usually called by the eating time. "late" means that
// ticket time has passed today, so the next ticket from now is called after it. "early" means
// even the day's first ticket is usually called after it.
export type EatPlan = { kind: "late" | "ticket"; minute: number } | { kind: "early" };
export type PlanAnswer = { high: number; low: number; median: number };
export type PlanDomain = { end: number; start: number };

const fallbackDomain: PlanDomain = { end: 21 * 60, start: 11 * 60 };
// Where the time ruler opens when "now" is outside ticketing hours or another day is chosen.
const dinnerMinute = 18 * 60;

// A time of day as HH:MM. Minutes past midnight wrap into the next day.
export function clockLabel(minute: number) {
  const inDay = ((minute % 1440) + 1440) % 1440;
  return `${String(Math.floor(inDay / 60)).padStart(2, "0")}:${String(inDay % 60).padStart(2, "0")}`;
}

// Reads HH:MM on a five-minute step, or null for anything else.
export function parseClock(value: string | null | undefined) {
  const match = /^(\d{2}):(\d{2})$/.exec(value ?? "");
  const minute = match ? Number(match[1]) * 60 + Number(match[2]) : Number.NaN;

  return Number(match?.[1]) < 24 && Number(match?.[2]) < 60 && minute % usualStepMinutes === 0
    ? minute
    : null;
}

// The hours the ruler and charts cover: from the first to the last usual slot of any branch,
// widened to whole half hours.
export function planDomain(stores: UsualStore[]): PlanDomain {
  let first = Number.POSITIVE_INFINITY;
  let last = Number.NEGATIVE_INFINITY;

  for (const store of stores) {
    for (const slot of store.slots) {
      first = Math.min(first, slot.minute);
      last = Math.max(last, slot.minute);
    }
  }

  return Number.isFinite(first)
    ? { end: Math.ceil(last / 30) * 30, start: Math.floor(first / 30) * 30 }
    : fallbackDomain;
}

// The usual wait for a ticket taken at this time, rounded to five minutes, or null when the
// branch has nothing usual recorded for it.
export function planAnswer(slots: UsualSlot[], minute: number): PlanAnswer | null {
  const slot = usualAt(slots, minute);
  return slot ? { ...usualRange(slot), median: Math.round(slot.median / 5) * 5 } : null;
}

// A time within an hour whose usual wait is clearly shorter: at least 30% and ten minutes less.
// Times before `earliest` (now, when planning today) are not offered.
export function shorterNearby(slots: UsualSlot[], minute: number, earliest = 0) {
  const current = planAnswer(slots, minute)?.median;
  let best: { distance: number; median: number; minute: number } | null = null;

  if (current === undefined) {
    return null;
  }

  for (const offset of [-60, -45, -30, -15, 15, 30, 45, 60]) {
    const median = planAnswer(slots, minute + offset)?.median;
    const distance = Math.abs(offset);

    if (median === undefined || minute + offset < earliest) {
      continue;
    }

    const isClearlyShorter = median <= current * 0.7 && current - median >= 10;
    const beatsBest =
      !best || median < best.median || (median === best.median && distance < best.distance);

    if (isClearlyShorter && beatsBest) {
      best = { distance, median, minute: minute + offset };
    }
  }

  return best?.minute ?? null;
}

// Every branch with a usual wait at this time, shortest first.
export function rankBranches(stores: UsualStore[], minute: number) {
  return stores
    .flatMap((store) => {
      const answer = planAnswer(store.slots, minute);
      return answer ? [{ answer, slots: store.slots, storeId: store.storeId }] : [];
    })
    .sort(
      (left, right) =>
        left.answer.median - right.answer.median ||
        left.answer.high - right.answer.high ||
        left.storeId - right.storeId,
    );
}

// Works back from the time a meal should start to the ticket to take. `earliest` is now when
// planning today, so a ticket time already past is never offered.
export function eatPlan(slots: UsualSlot[], eatMinute: number, earliest = 0): EatPlan | null {
  if (slots.length === 0) {
    return null;
  }

  const inTime = slots.filter((slot) => slot.minute + slot.median <= eatMinute);

  if (inTime.length === 0) {
    return { kind: "early" };
  }

  const latest = Math.max(...inTime.map((slot) => slot.minute));

  // A ticket time within the current five minutes still counts as now.
  if (latest + usualStepMinutes > earliest) {
    return { kind: "ticket", minute: latest };
  }

  const fromNow = slots.filter((slot) => slot.minute >= earliest).map((slot) => slot.minute);
  return fromNow.length > 0 ? { kind: "late", minute: Math.min(...fromNow) } : null;
}

// Every branch whose ticket can still be called by the eating time, shortest wait first.
export function rankForEating(stores: UsualStore[], eatMinute: number, earliest = 0) {
  return stores
    .flatMap((store) => {
      const plan = eatPlan(store.slots, eatMinute, earliest);
      const answer = plan?.kind === "ticket" ? planAnswer(store.slots, plan.minute) : null;

      return plan?.kind === "ticket" && answer
        ? [{ answer, slots: store.slots, storeId: store.storeId, ticket: plan.minute }]
        : [];
    })
    .sort(
      (left, right) =>
        left.answer.median - right.answer.median ||
        right.ticket - left.ticket ||
        left.storeId - right.storeId,
    );
}

// The time the page opens on: the next five minutes from now while tickets are being issued
// today, otherwise dinner time.
export function openingMinute(nowMinute: number | null, domain: PlanDomain) {
  const next =
    nowMinute === null ? null : Math.ceil((nowMinute + 1) / usualStepMinutes) * usualStepMinutes;
  const preferred =
    next !== null && next >= domain.start && next <= domain.end ? next : dinnerMinute;

  return Math.min(domain.end, Math.max(domain.start, preferred));
}
