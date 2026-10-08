import { beforeEach, describe, expect, it, vi } from "vitest";
import { judgeMatchup } from "@/server/matchup";
import { appRouter } from "@/server/router";

vi.mock("@/server/matchup", () => ({ judgeMatchup: vi.fn() }));

const caller = appRouter.createCaller({ request: new Request("https://example.com/api/trpc") });

describe("matchup input validation", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(
    Array.from("0123456789"),
  )("rejects digit %s before judging or cache lookup", async (digit) => {
    await expect(
      caller.matchup({ challenge: "rock", answer: `rock crusher ${digit}` }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("im bad at math"),
    });
    expect(judgeMatchup).not.toHaveBeenCalled();
  });

  it("still judges digit-free answers", async () => {
    const judgment = {
      beats: true,
      confidence: 1,
      model: "jev-1.13.0",
      source: "cache" as const,
      isNewMatchup: false,
    };
    vi.mocked(judgeMatchup).mockResolvedValueOnce(judgment);
    await expect(caller.matchup({ challenge: "rock", answer: "paper" })).resolves.toEqual(judgment);
    expect(judgeMatchup).toHaveBeenCalledExactlyOnceWith(
      { challenge: "rock", answer: "paper" },
      "local",
    );
  });
});
