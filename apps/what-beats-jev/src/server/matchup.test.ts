import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { closeDatabases } from "@/server/database";
import { judgeMatchup } from "@/server/matchup";

const testUrl = process.env.WHAT_BEATS_JEV_TEST_DATABASE_URL;
const databaseTests = testUrl ? describe : describe.skip;

databaseTests("matchup judgments", () => {
  let accepts = true;
  let unavailable = false;
  const transport = vi.fn(async () => {
    if (unavailable) return new Response("Unavailable", { status: 503 });
    return new Response(
      JSON.stringify({
        model: "jev-1.13.0",
        answers: {
          outcome: {
            type: "choice",
            choice: accepts ? "beats" : "does_not_beat",
            confidence: 0.6,
            probabilities: { beats: accepts ? 0.8 : 0.2, does_not_beat: accepts ? 0.2 : 0.8 },
          },
        },
        usage: { input_tokens: 10, output_tokens: 0 },
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  });

  beforeAll(() => {
    if (!testUrl || !/_(test|ci)$/.test(new URL(testUrl).pathname))
      throw new Error("Database tests require an isolated test database");
    process.env.WHAT_BEATS_JEV_DATABASE_URL = testUrl;
    process.env.TYPESAFE_API_KEY = "test-only-credential";
    process.env.RATE_LIMIT_SECRET = "test-only-rate-limit-secret";
    vi.stubGlobal("fetch", transport);
  });
  beforeEach(() => {
    accepts = true;
    unavailable = false;
    transport.mockClear();
  });
  afterAll(async () => {
    await closeDatabases();
    vi.unstubAllGlobals();
  });

  it("reuses normalized winning matchups and their original confidence", async () => {
    const answer = `test counter ${randomUUID()}`;
    const first = await judgeMatchup({ challenge: "rock", answer }, "test-normalized");
    const second = await judgeMatchup(
      { challenge: " ROCK ", answer: ` ${answer.toUpperCase()} ` },
      "test-normalized",
    );
    expect(first).toMatchObject({
      beats: true,
      confidence: 0.6,
      source: "jev",
      isNewMatchup: true,
    });
    expect(second).toMatchObject({
      beats: true,
      confidence: 0.6,
      source: "cache",
      isNewMatchup: false,
    });
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it("remembers rejected matchups without awarding discovery", async () => {
    accepts = false;
    const input = { challenge: "rock", answer: `unrelated test counter ${randomUUID()}` };
    expect(await judgeMatchup(input, "test-loss")).toMatchObject({
      beats: false,
      source: "jev",
      isNewMatchup: false,
    });
    expect(await judgeMatchup(input, "test-loss")).toMatchObject({
      beats: false,
      confidence: 0.6,
      source: "cache",
      isNewMatchup: false,
    });
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it("allows only one model call and first-win notice for simultaneous submissions", async () => {
    const input = { challenge: "rock", answer: `concurrent test counter ${randomUUID()}` };
    const results = await Promise.all([
      judgeMatchup(input, "test-concurrent"),
      judgeMatchup(input, "test-concurrent"),
    ]);
    expect(results.filter((result) => result.isNewMatchup)).toHaveLength(1);
    expect(results.map((result) => result.source).sort()).toEqual(["cache", "jev"]);
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it("does not cache a service failure or consume the successful-discovery notice", async () => {
    const input = { challenge: "rock", answer: `retry test counter ${randomUUID()}` };
    unavailable = true;
    await expect(judgeMatchup(input, "test-retry")).rejects.toThrow();
    unavailable = false;
    expect(await judgeMatchup(input, "test-retry")).toMatchObject({
      source: "jev",
      isNewMatchup: true,
    });
    expect(transport).toHaveBeenCalledTimes(2);
  });

  it("does not charge a concurrent cache follower against the model budget", async () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(Date.now());
    const id = randomUUID();
    const caller = `quota-test-${id}`;
    const first = { challenge: "rock", answer: `quota ${id} first` };
    try {
      await Promise.all([judgeMatchup(first, caller), judgeMatchup(first, caller)]);
      for (let index = 1; index < 30; index++) {
        await expect(
          judgeMatchup({ challenge: "rock", answer: `quota ${id} ${index}` }, caller),
        ).resolves.toMatchObject({ source: "jev" });
      }
      expect(transport).toHaveBeenCalledTimes(30);
      await expect(
        judgeMatchup({ challenge: "rock", answer: `quota ${id} over limit` }, caller),
      ).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
      await expect(judgeMatchup(first, caller)).resolves.toMatchObject({ source: "cache" });
      expect(transport).toHaveBeenCalledTimes(30);
    } finally {
      now.mockRestore();
    }
  }, 180_000);
});
