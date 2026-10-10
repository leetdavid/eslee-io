// Patterns: the average wait for each kind of day and half hour, from the times branches were
// issuing tickets.
export const patternSlotMinutes = 30;

// One branch's average for one kind of day and half hour. dayType is 1 (Monday) to 7 (Sunday).
export type PatternRow = {
  dayType: number;
  minute: number;
  name: string;
  nameEn: string;
  storeId: number;
  wait: number;
};

export type PatternCell = { minute: number; wait: number; weekday: number };
export type PatternBranch = { name: string; nameEn: string; storeId: number; wait: number };
export type PatternsResponse = {
  // Weekend dinner averages for every branch, longest first.
  dinner: PatternBranch[];
  from: string | null;
  grid: PatternCell[];
  to: string | null;
};

const dinnerFromMinute = 18 * 60;
const noon = 12 * 60;

function mean(values: number[]) {
  return values.reduce((total, value) => total + value, 0) / Math.max(1, values.length);
}

// Rows for every branch -> the grid (all branches, or one) and the weekend dinner ranking.
export function summarisePatterns(rows: PatternRow[], storeId?: number) {
  const waitsByCell = new Map<string, number[]>();
  const dinnerByStore = new Map<number, { branch: Omit<PatternBranch, "wait">; waits: number[] }>();

  for (const row of rows) {
    if (storeId === undefined || row.storeId === storeId) {
      const key = `${row.dayType - 1}|${row.minute}`;
      waitsByCell.set(key, [...(waitsByCell.get(key) ?? []), row.wait]);
    }

    // Weekend dinner: Saturday, Sunday and public holidays, from 18:00 until tickets stop.
    if (row.dayType >= 6 && row.minute >= dinnerFromMinute) {
      const entry = dinnerByStore.get(row.storeId) ?? {
        branch: { name: row.name, nameEn: row.nameEn, storeId: row.storeId },
        waits: [],
      };

      entry.waits.push(row.wait);
      dinnerByStore.set(row.storeId, entry);
    }
  }

  return {
    dinner: [...dinnerByStore.values()]
      .map(({ branch, waits }) => ({ ...branch, wait: mean(waits) }))
      .sort((left, right) => right.wait - left.wait || left.storeId - right.storeId),
    // Each branch counts once per cell, so a branch with more snapshots does not weigh more.
    grid: [...waitsByCell].map(([key, waits]) => {
      const [weekday = 0, minute = 0] = key.split("|").map(Number);
      return { minute, wait: mean(waits), weekday };
    }),
  };
}

// The grid laid out for the page: its half-hour slots, a row per weekday, and the headline
// facts read from it.
export function patternView(grid: PatternCell[]) {
  const slots = [...new Set(grid.map((cell) => cell.minute))].sort((left, right) => left - right);
  const waits = new Map(grid.map((cell) => [`${cell.weekday}|${cell.minute}`, cell.wait]));
  const rows = Array.from({ length: 7 }, (_, weekday) =>
    slots.map((minute) => waits.get(`${weekday}|${minute}`) ?? null),
  );
  const highest = (cells: PatternCell[]) =>
    cells.reduce<PatternCell | null>(
      (top, cell) => (!top || cell.wait > top.wait ? cell : top),
      null,
    );
  const lowest = (cells: PatternCell[]) =>
    cells.reduce<PatternCell | null>(
      (low, cell) => (!low || cell.wait < low.wait ? cell : low),
      null,
    );
  const days = rows.flatMap((row, weekday) => {
    const recorded = row.filter((wait): wait is number => wait !== null);
    return recorded.length > 0 ? [{ wait: mean(recorded), weekday }] : [];
  });

  return {
    busiest: highest(grid),
    calmestDay: days.reduce<(typeof days)[number] | null>(
      (low, day) => (!low || day.wait < low.wait ? day : low),
      null,
    ),
    // For each weekday, the first and last half hour that average an hour or more.
    overAnHour: rows.map((row) => {
      const over = slots.filter((_, index) => (row[index] ?? 0) >= 60);
      const last = over.at(-1);

      return over[0] !== undefined && last !== undefined
        ? { from: over[0], to: last + patternSlotMinutes }
        : null;
    }),
    // From noon on only: a quiet opening half hour is no use to someone planning a meal.
    quietest: lowest(grid.filter((cell) => cell.minute >= noon)),
    rows,
    slots,
  };
}

// 2 from an hour's wait, 3 from two hours: the long band is drawn darker as it grows.
export function longLevel(wait: number) {
  return wait >= 120 ? 3 : wait >= 60 ? 2 : undefined;
}
