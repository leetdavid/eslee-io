import { DateAGlobeEvent, DateAGlobePlay } from "@eslee/db/date-a-globe";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { createEngine, monthOf, type Setup, type Turn } from "@/engine";
import type { Submission } from "@/lib/submission";
import { compareWithKnown, datesCheck, type KnownEvent } from "@/server/checks";
import { type Database, openPglite } from "@/server/database";
import { askedEvents } from "@/server/events";
import { RateLimitedError } from "@/server/limits";
import { loadPlay, recordTrialAnswer, savePlay, TRIAL_GLOBES } from "@/server/plays";
import { approve, merge, queueCounts, reject } from "@/server/review";
import { isPublicAddress, pageText } from "@/server/safe-fetch";
import { seedEvents } from "@/server/seed";
import { submit } from "@/server/submissions";

vi.mock("@/server/safe-fetch", async (load) => {
  const real = await load<typeof import("@/server/safe-fetch")>();
  return {
    ...real,
    fetchPage: vi.fn(async (url: string) => ({
      url,
      text: "<p>The Kingdom of the Two Sicilies was a kingdom in Southern Italy from 1816 to 1861.</p>",
    })),
  };
});

process.env.RATE_LIMIT_SECRET = "test-secret";
const NOW = new Date("2026-10-29T00:00:00Z");
let db: Database;

beforeAll(async () => {
  db = await openPglite();
  await seedEvents(db);
  // Nominatim, for the pin check.
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({
        name: "Napoli",
        address: { city: "Naples", country: "Italy", country_code: "it" },
      }),
    ),
  );
}, 60_000);

const sicilies: Submission = {
  change: "country",
  name: "Two Sicilies",
  before: "Naples and Sicily",
  after: "Kingdom of Italy",
  lat: 40.9,
  lon: 14.3,
  region: "Europe",
  size: "medium",
  span: { from: "1816-12", until: "1861-03" },
  sources: ["https://en.wikipedia.org/wiki/Kingdom_of_the_Two_Sicilies"],
  question: "Is southern Italy labelled the Two Sicilies?",
  senderName: "mapnerd",
};

describe("seed", () => {
  it("puts verified events live and the rest in the queue, and never repeats", async () => {
    const counts = await queueCounts(db);
    expect(counts.live).toBeGreaterThan(700);
    expect(counts.waiting).toBeGreaterThan(10);
    expect((await seedEvents(db)).added).toBe(0);
  });
});

describe("plays", () => {
  it("saves a game with the result worked out on the server, and loads it by id", async () => {
    const events = await askedEvents(db);
    const engine = createEngine(events, { now: NOW });
    const turns: Turn[] = [
      { eventId: "soviet-union", answer: "yes" },
      { eventId: "two-germanys", answer: "yes" },
      { eventId: "not-an-event", answer: "yes" },
    ];
    const play = await savePlay(db, engine, events, { kind: "globe", regions: [] }, turns);
    expect(play.turns).toHaveLength(2);
    const loaded = await loadPlay(db, play.id);
    expect(loaded?.result.label).toBe(play.result.label);
    expect(loaded?.result.window.from).toBeLessThanOrEqual(monthOf(1960));
    expect(loaded?.result.window.to).toBeGreaterThanOrEqual(monthOf(1960));
  });

  it("doesn't count a trial answer twice when a game is picked up again", async () => {
    const trialId = "holy-roman-empire";
    await db
      .update(DateAGlobeEvent)
      .set({ status: "trial" })
      .where(eq(DateAGlobeEvent.id, trialId));
    const events = await askedEvents(db);
    const engine = createEngine(events, { now: NOW });
    const setup: Setup = { kind: "globe", regions: [] };
    const turns: Turn[] = [
      { eventId: "soviet-union", answer: "yes" },
      { eventId: "two-germanys", answer: "yes" },
      { eventId: trialId, answer: "no", reason: "trial" },
    ];
    const answersOf = async () =>
      (await db.select().from(DateAGlobeEvent).where(eq(DateAGlobeEvent.id, trialId)))[0]
        ?.trialAnswers;
    const first = await savePlay(db, engine, events, setup, turns);
    expect(await answersOf()).toBe(1);
    const more: Turn[] = [...turns, { eventId: "botswana", answer: "no" }];
    await savePlay(db, engine, events, setup, more, first.id);
    expect(await answersOf()).toBe(1);
    await db.update(DateAGlobeEvent).set({ status: "live" }).where(eq(DateAGlobeEvent.id, trialId));
  });

  it("ends a trial after 50 answers, live at 80% agreement and back in the queue below it", async () => {
    const [a, b] = (await askedEvents(db)).slice(0, 2);
    if (!a || !b) throw new Error("no events");
    await db.update(DateAGlobeEvent).set({ status: "trial" }).where(eq(DateAGlobeEvent.id, a.id));
    await db.update(DateAGlobeEvent).set({ status: "trial" }).where(eq(DateAGlobeEvent.id, b.id));
    for (let i = 0; i < TRIAL_GLOBES; i++) {
      await recordTrialAnswer(db, a.id, i % 10 !== 0);
      await recordTrialAnswer(db, b.id, i % 2 === 0);
    }
    const [ra] = await db.select().from(DateAGlobeEvent).where(eq(DateAGlobeEvent.id, a.id));
    const [rb] = await db.select().from(DateAGlobeEvent).where(eq(DateAGlobeEvent.id, b.id));
    expect(ra?.status).toBe("live");
    expect(rb?.status).toBe("waiting");
    expect(rb?.reviewNote).toContain("25 of 50");
  });
});

describe("submissions", () => {
  it("runs the checks and queues the event", async () => {
    const { id, checks } = await submit(db, sicilies, "203.0.113.7", NOW.getTime());
    expect(checks.dates.status).toBe("pass");
    expect(checks.pin.status).toBe("pass");
    expect(checks.place).toContain("Italy");
    const [row] = await db.select().from(DateAGlobeEvent).where(eq(DateAGlobeEvent.id, id));
    expect(row?.status).toBe("waiting");
    expect(row?.origin).toBe("submission");
    expect(row?.senderKey).not.toContain("203.0.113.7");
  });

  it("allows five a day from one address", async () => {
    for (let i = 0; i < 4; i++) await submit(db, sicilies, "198.51.100.1", NOW.getTime());
    await submit(db, sicilies, "198.51.100.1", NOW.getTime());
    await expect(submit(db, sicilies, "198.51.100.1", NOW.getTime())).rejects.toBeInstanceOf(
      RateLimitedError,
    );
  });
});

describe("review", () => {
  it("approves into a trial, merges duplicates and rejects", async () => {
    const one = await submit(
      db,
      { ...sicilies, name: "Two Sicilies A" },
      "192.0.2.10",
      NOW.getTime(),
    );
    const two = await submit(
      db,
      { ...sicilies, name: "Two Sicilies B" },
      "192.0.2.10",
      NOW.getTime(),
    );
    const three = await submit(
      db,
      { ...sicilies, name: "Two Sicilies C" },
      "192.0.2.10",
      NOW.getTime(),
    );
    await approve(db, one.id, "leetdavid");
    await merge(db, two.id, one.id, "leetdavid");
    await reject(db, three.id, "Not on globes", "leetdavid");
    const rows = await db.select().from(DateAGlobeEvent);
    const get = (id: string) => rows.find((r) => r.id === id);
    expect(get(one.id)?.status).toBe("trial");
    expect(get(two.id)?.reviewNote).toBe("Merged into Two Sicilies A");
    expect(get(three.id)?.status).toBe("rejected");
    await expect(approve(db, three.id, "leetdavid")).rejects.toThrow();
  });
});

describe("checks", () => {
  const known: KnownEvent[] = [
    {
      id: "two-sicilies",
      title: "Kingdom of Naples / Two Sicilies",
      kind: "country",
      region: "Europe",
      lat: 40.9,
      lon: 14.3,
      spans: [{ from: "1700", until: "1861-02" }],
      status: "live",
    },
    {
      id: "zaire",
      title: "Zaire",
      kind: "rename",
      region: "Africa",
      lat: -3,
      lon: 23.5,
      spans: [{ from: "1971-10", until: "1997-05" }],
      status: "live",
    },
  ];

  it("finds duplicates by name and dates, and clashes when the dates differ", () => {
    expect(
      compareWithKnown({ ...sicilies, span: { from: "1805", until: "1861-03" } }, known).duplicate
        .status,
    ).toBe("fail");
    expect(compareWithKnown(sicilies, known).clash.status).toBe("warn");
    expect(
      compareWithKnown({ ...sicilies, name: "Botswana", before: "", lat: -22, lon: 24 }, known)
        .duplicate.status,
    ).toBe("pass");
  });

  it("reports which years the sources name", () => {
    const opened = { url: "u", opens: true, mentions: true, years: [1816, 1861], quote: null };
    expect(datesCheck([{ ...opened, found: [1816, 1861] }], [1816, 1861]).status).toBe("pass");
    expect(datesCheck([{ ...opened, found: [1816] }], [1816, 1861]).status).toBe("warn");
    expect(datesCheck([{ ...opened, opens: false, found: [] }], [1816, 1861]).status).toBe("fail");
  });

  it("only lets source links reach public addresses", () => {
    for (const a of [
      "127.0.0.1",
      "10.1.2.3",
      "169.254.169.254",
      "192.168.0.1",
      "172.20.0.1",
      "::1",
      "fd00::1",
      "::ffff:10.0.0.1",
      "0.0.0.0",
    ])
      expect(isPublicAddress(a), a).toBe(false);
    for (const a of ["208.80.154.224", "2620:0:861:ed1a::1"])
      expect(isPublicAddress(a), a).toBe(true);
  });

  it("reads the visible text of a page", () => {
    expect(
      pageText("<style>x{}</style><p>From&nbsp;1816 <b>to</b> 1861</p><script>1999</script>"),
    ).toBe("From 1816 to 1861");
  });
});

describe("play rows", () => {
  it("never store anything about the player", async () => {
    const [row] = await db.select().from(DateAGlobePlay).limit(1);
    expect(Object.keys(row ?? {})).not.toContain("ip");
  });
});
