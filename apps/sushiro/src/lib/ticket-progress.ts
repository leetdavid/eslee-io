// How close a tracked ticket is to being called, read from the numbers a branch is calling now.
// Sushiro seats by table type, so numbers are not called strictly in order and this is a guide.

// A ticket this many numbers behind the latest call counts as nearly called.
export const nearCalledNumbers = 10;
// A call this far past a ticket says nothing about it, such as the next day's numbers.
const passedLimit = 50;

export type TicketProgress = {
  // Numbers still to go, or null when the calls say nothing about this ticket.
  ahead: number | null;
  // The highest number being called, or null when none is.
  latest: number | null;
  state: "due" | "near" | "waiting";
};

function leadingNumber(value: number | string) {
  const match = /^(\d{1,6})/.exec(String(value).trim());
  return match ? Number(match[1]) : null;
}

export function ticketProgress(
  ticketNumber: string,
  calling: readonly (number | string)[],
): TicketProgress {
  const mine = leadingNumber(ticketNumber);
  const called = calling.map(leadingNumber).filter((number): number is number => number !== null);

  if (mine === null || called.length === 0) {
    return { ahead: null, latest: null, state: "waiting" };
  }

  const latest = Math.max(...called);

  if (latest - mine >= passedLimit) {
    return { ahead: null, latest, state: "waiting" };
  }

  // Due once the number itself is called, or every number being called is past it.
  if (called.includes(mine) || Math.min(...called) > mine) {
    return { ahead: 0, latest, state: "due" };
  }

  const ahead = Math.max(0, mine - latest);
  return { ahead, latest, state: ahead <= nearCalledNumbers ? "near" : "waiting" };
}
