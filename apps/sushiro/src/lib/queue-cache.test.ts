import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getGridChartHistory, invalidateGridChartHistory } from "@/lib/queue-cache";
import type { QueueHistory } from "@/lib/queues";

const history: QueueHistory = {
  global: [],
  stores: [],
};

const gatewayUrl = process.env.SUSHIRO_CACHE_GATEWAY_URL;
const gatewayToken = process.env.SUSHIRO_CACHE_GATEWAY_TOKEN;
const fetchMock = vi.fn();

function restoreEnvironment(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

function cacheResponse(body: unknown) {
  return Response.json(body);
}

function requestBody(index: number) {
  return JSON.parse(fetchMock.mock.calls[index]?.[1]?.body as string) as Record<string, unknown>;
}

describe("Grid chart cache", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    process.env.SUSHIRO_CACHE_GATEWAY_URL = "https://cache.example.com";
    process.env.SUSHIRO_CACHE_GATEWAY_TOKEN = "token";
  });

  afterEach(() => {
    restoreEnvironment("SUSHIRO_CACHE_GATEWAY_URL", gatewayUrl);
    restoreEnvironment("SUSHIRO_CACHE_GATEWAY_TOKEN", gatewayToken);
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("uses the current cached chart without querying the database", async () => {
    const loadHistory = vi.fn();
    fetchMock.mockResolvedValue(cacheResponse({ value: JSON.stringify(history) }));

    await expect(getGridChartHistory(loadHistory)).resolves.toStrictEqual(history);

    expect(loadHistory).not.toHaveBeenCalled();
    expect(requestBody(0)).toStrictEqual({ action: "get", key: "sushiro:queues:charts:grid" });
  });

  it("recomputes and caches a chart when its previous entry has expired", async () => {
    const loadHistory = vi.fn().mockResolvedValue(history);
    fetchMock
      .mockResolvedValueOnce(cacheResponse({ value: null }))
      .mockResolvedValueOnce(cacheResponse({ stored: true }))
      .mockResolvedValueOnce(cacheResponse({ stored: true }))
      .mockResolvedValueOnce(cacheResponse({ deleted: true }));

    await expect(getGridChartHistory(loadHistory)).resolves.toBe(history);

    expect(loadHistory).toHaveBeenCalledOnce();
    expect(requestBody(1)).toStrictEqual({
      action: "set",
      key: "sushiro:queues:charts:grid:refresh-lock",
      nx: true,
      ttl: 15,
      value: '"1"',
    });
    expect(requestBody(2)).toStrictEqual({
      action: "set",
      key: "sushiro:queues:charts:grid",
      nx: false,
      ttl: 300,
      value: JSON.stringify(history),
    });
  });

  it("waits for the request holding the refresh lock instead of querying again", async () => {
    vi.useFakeTimers();
    const loadHistory = vi.fn();
    fetchMock
      .mockResolvedValueOnce(cacheResponse({ value: null }))
      .mockResolvedValueOnce(cacheResponse({ stored: false }))
      .mockResolvedValueOnce(cacheResponse({ value: JSON.stringify(history) }));

    const result = getGridChartHistory(loadHistory);
    await vi.advanceTimersByTimeAsync(500);

    await expect(result).resolves.toStrictEqual(history);
    expect(loadHistory).not.toHaveBeenCalled();
  });

  it("bypasses Redis when it cannot be read", async () => {
    const loadHistory = vi.fn().mockResolvedValue(history);
    fetchMock.mockRejectedValue(new Error("Cache gateway unavailable"));

    await expect(getGridChartHistory(loadHistory)).resolves.toBe(history);

    expect(loadHistory).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("does not return old data when a refreshed chart query fails", async () => {
    const error = new Error("Database unavailable");
    const loadHistory = vi.fn().mockRejectedValue(error);
    fetchMock
      .mockResolvedValueOnce(cacheResponse({ value: null }))
      .mockResolvedValueOnce(cacheResponse({ stored: true }))
      .mockResolvedValueOnce(cacheResponse({ deleted: true }));

    await expect(getGridChartHistory(loadHistory)).rejects.toThrow(error);

    expect(requestBody(1)).toStrictEqual({
      action: "set",
      key: "sushiro:queues:charts:grid:refresh-lock",
      nx: true,
      ttl: 15,
      value: '"1"',
    });
  });

  it("invalidates the Grid Home chart after a snapshot collection", async () => {
    fetchMock.mockResolvedValue(cacheResponse({ deleted: true }));

    await invalidateGridChartHistory();

    expect(requestBody(0)).toStrictEqual({ action: "delete", key: "sushiro:queues:charts:grid" });
  });
});
