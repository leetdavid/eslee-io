export const ticketTrackingHours = 24;
const day = ticketTrackingHours * 60 * 60_000;

export type TicketReport = {
  id: string;
  storeId: number;
  storeName: string;
  storeNameEn: string;
  ticketNumber: string;
  takenAt: string;
  submittedAt: string;
  calledAt: string | null;
  callReportedAt: string | null;
  firstSeenCalledAt: string | null;
  lastCheckedAt: string | null;
  leftAt: string | null;
};

export type TicketErrors = Partial<
  Record<"storeId" | "ticketNumber" | "takenAt" | "calledAt", string>
>;

export function ticketKey(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const match = /^(\d{1,6})(?:-(\d{1,2}))?$/.exec(String(value).trim());
  if (!match || Number(match[1]) === 0) return null;
  return `${Number(match[1])}${match[2] === undefined ? "" : `-${Number(match[2])}`}`;
}

export function hongKongInput(date: Date) {
  return new Date(date.valueOf() + 8 * 60 * 60_000).toISOString().slice(0, 19);
}

export function fromHongKongInput(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value)) return null;
  const full = value.length === 16 ? `${value}:00` : value;
  const date = new Date(`${full}+08:00`);
  return Number.isFinite(date.valueOf()) && hongKongInput(date) === full
    ? date.toISOString()
    : null;
}

export function eventTime(value: unknown, earliest: Date, latest: Date): Date | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  if (
    !Number.isFinite(date.valueOf()) ||
    date.toISOString() !== value ||
    date < earliest ||
    date > latest
  )
    return null;
  return date;
}

export function parseTicketReport(value: unknown, now: Date) {
  const body =
    typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const errors: TicketErrors = {};
  const storeId =
    typeof body.storeId === "number" && Number.isSafeInteger(body.storeId) && body.storeId > 0
      ? body.storeId
      : null;
  const key = ticketKey(body.ticketNumber);
  const takenAt =
    body.takenAt === null ? now : eventTime(body.takenAt, new Date(now.valueOf() - day), now);
  if (!storeId) errors.storeId = "store";
  if (!key) errors.ticketNumber = "ticket";
  if (!takenAt) errors.takenAt = "takenTime";
  if (!storeId || !key || !takenAt) return { success: false as const, errors };
  return {
    success: true as const,
    data: {
      storeId,
      ticketNumber: String(body.ticketNumber).trim(),
      ticketKey: key,
      takenAt,
      queueDate: hongKongInput(takenAt).slice(0, 10),
    },
  };
}

export function exactTicketSeen(
  report: { ticketKey: string; takenAt: Date; queueDate: string },
  tickets: readonly (number | string)[],
  observedAt: Date,
) {
  return (
    report.takenAt <= observedAt &&
    report.queueDate === hongKongInput(observedAt).slice(0, 10) &&
    tickets.some((ticket) => ticketKey(ticket) === report.ticketKey)
  );
}
