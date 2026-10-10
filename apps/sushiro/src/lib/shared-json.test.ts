import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearSharedJson, loadSharedJson, peekSharedJson } from "@/lib/shared-json";

function respond(body: unknown, ok = true) {
  return Promise.resolve({ json: () => Promise.resolve(body), ok } as Response);
}

describe("shared JSON resources", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    clearSharedJson();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("stores what a URL returned and when", async () => {
    fetchMock.mockReturnValueOnce(respond({ stores: [1] }));

    await loadSharedJson("/api/queues");

    const entry = peekSharedJson("/api/queues");
    expect(entry.data).toEqual({ stores: [1] });
    expect(entry.error).toBe(false);
    expect(entry.pending).toBe(false);
    expect(entry.loadedAt).toBeGreaterThan(0);
  });

  it("makes one request while a load is already running", async () => {
    fetchMock.mockReturnValue(respond({ stores: [] }));

    await Promise.all([loadSharedJson("/api/queues"), loadSharedJson("/api/queues")]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps the last good copy when a refresh fails", async () => {
    fetchMock.mockReturnValueOnce(respond({ stores: [1] }));
    await loadSharedJson("/api/queues");
    const loadedAt = peekSharedJson("/api/queues").loadedAt;

    fetchMock.mockReturnValueOnce(respond({ error: "down" }, false));
    await loadSharedJson("/api/queues");

    expect(peekSharedJson("/api/queues")).toEqual({
      data: { stores: [1] },
      error: true,
      loadedAt,
      pending: false,
    });
  });

  it("keeps each URL apart", async () => {
    fetchMock.mockReturnValueOnce(respond("six hours")).mockReturnValueOnce(respond("a day"));

    await loadSharedJson("/api/queues/charts?hours=6");
    await loadSharedJson("/api/queues/charts?hours=24");

    expect(peekSharedJson("/api/queues/charts?hours=6").data).toBe("six hours");
    expect(peekSharedJson("/api/queues/charts?hours=24").data).toBe("a day");
  });
});
