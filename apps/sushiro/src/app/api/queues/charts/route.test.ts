import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/queues/charts/route";

function request(query: string) {
  return GET(new Request(`https://sushiro.test/api/queues/charts?${query}`));
}

// These requests are rejected before the route touches the database.
describe("GET /api/queues/charts", () => {
  it.each([
    "date=2026-02-30",
    "date=yesterday",
    "date=2026-10-9",
    "date=2999-01-01",
  ])("rejects %s", async (query) => {
    const response = await request(query);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Date must be a past or current Hong Kong date, as YYYY-MM-DD",
    });
  });

  it("still rejects an unsupported trailing range", async () => {
    expect((await request("hours=5")).status).toBe(400);
  });
});
