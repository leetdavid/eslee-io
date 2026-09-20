import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/cron/queue-snapshots/route";

const mocks = vi.hoisted(() => ({
  getQueues: vi.fn(),
  insert: vi.fn(),
  storedHours: vi.fn(),
  invalidate: vi.fn(),
  reconcile: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    insert: () => ({ values: mocks.insert }),
    select: () => ({ from: mocks.storedHours }),
  },
}));
vi.mock("@/lib/queue-cache", () => ({
  getQueues: mocks.getQueues,
  invalidateGridChartHistory: mocks.invalidate,
}));
vi.mock("@/lib/ticket-reports.server", () => ({ reconcileTicketReports: mocks.reconcile }));

function request(authorized = true) {
  return new Request("https://sushiro.example/api/cron/queue-snapshots", {
    headers: authorized ? { authorization: "Bearer test-secret" } : {},
  });
}

describe("queue snapshot collection", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("CRON_SECRET", "test-secret");
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.getQueues.mockResolvedValue({ stores: [{ id: 1, wait: 3, storeQueue: [123] }] });
    mocks.storedHours.mockResolvedValue([{ storeId: 1, updatedAt: new Date() }]);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("rejects unauthorized requests before collecting or writing data", async () => {
    expect((await GET(request(false))).status).toBe(401);
    expect(mocks.getQueues).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("reports the number of snapshots actually saved", async () => {
    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ storesCollected: 1, storeHoursUpdated: false });
    expect(mocks.insert).toHaveBeenCalledWith([
      { storeId: 1, wait: 3, storeQueue: [123], collectedAt: expect.any(Date) },
    ]);
    expect(mocks.invalidate).toHaveBeenCalledOnce();
  });

  it("logs a quota failure with its cause and identifies the failed write", async () => {
    const cause = Object.assign(new Error("Your account or project has exceeded the quota."), {
      code: "53000",
    });
    const error = new Error("Failed query: insert into sushiro_queue_snapshot", { cause });
    mocks.insert.mockRejectedValue(error);

    const response = await GET(request());

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "Unable to collect Sushiro queue data",
      stage: "write_snapshots",
    });
    expect(console.error).toHaveBeenCalledWith(
      "Unable to collect Sushiro queue data",
      { stage: "write_snapshots" },
      error,
    );
    expect(mocks.invalidate).not.toHaveBeenCalled();
    expect(mocks.reconcile).not.toHaveBeenCalled();
  });

  it("does not mark a saved snapshot as failed when the optional store-hours read fails", async () => {
    mocks.storedHours.mockRejectedValue(new Error("Store hours unavailable"));

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ storesCollected: 1, storeHoursUpdated: false });
    expect(mocks.insert).toHaveBeenCalledOnce();
  });

  it("distinguishes an upstream failure from a database failure", async () => {
    mocks.getQueues.mockRejectedValue(new Error("Sushiro responded with 502"));

    const response = await GET(request());

    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ stage: "fetch_queues" });
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
