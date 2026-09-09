import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { QueueHistory } from "@/lib/queues";

const { fromEnv } = vi.hoisted(() => ({ fromEnv: vi.fn() }));

vi.mock("@upstash/redis", () => ({
  Redis: { fromEnv },
}));

import { getGridChartHistory, invalidateGridChartHistory } from "@/lib/queue-cache";

const cache = {
  del: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
};

const history: QueueHistory = {
  global: [],
  stores: [],
};

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

function restoreEnvironment(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

describe("Grid chart cache", () => {
  beforeEach(() => {
    cache.del.mockReset().mockResolvedValue(1);
    cache.get.mockReset();
    cache.set.mockReset();
    fromEnv.mockReset().mockReturnValue(cache);
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
  });

  afterEach(() => {
    restoreEnvironment("UPSTASH_REDIS_REST_URL", upstashUrl);
    restoreEnvironment("UPSTASH_REDIS_REST_TOKEN", upstashToken);
    vi.useRealTimers();
  });

  it("uses the current cached chart without querying the database", async () => {
    const loadHistory = vi.fn();
    cache.get.mockResolvedValue(history);

    await expect(getGridChartHistory(loadHistory)).resolves.toBe(history);

    expect(loadHistory).not.toHaveBeenCalled();
    expect(cache.set).not.toHaveBeenCalled();
  });

  it("recomputes and caches a chart when its previous entry has expired", async () => {
    const loadHistory = vi.fn().mockResolvedValue(history);
    cache.get.mockResolvedValue(null);
    cache.set.mockResolvedValue("OK");

    await expect(getGridChartHistory(loadHistory)).resolves.toBe(history);

    expect(loadHistory).toHaveBeenCalledOnce();
    expect(cache.set).toHaveBeenNthCalledWith(1, "sushiro:queues:charts:grid:refresh-lock", "1", {
      ex: 15,
      nx: true,
    });
    expect(cache.set).toHaveBeenNthCalledWith(2, "sushiro:queues:charts:grid", history, {
      ex: 300,
    });
  });

  it("waits for the request holding the refresh lock instead of querying again", async () => {
    vi.useFakeTimers();
    const loadHistory = vi.fn();
    cache.get.mockResolvedValueOnce(null).mockResolvedValueOnce(history);
    cache.set.mockResolvedValue(null);

    const result = getGridChartHistory(loadHistory);
    await vi.advanceTimersByTimeAsync(500);

    await expect(result).resolves.toBe(history);
    expect(loadHistory).not.toHaveBeenCalled();
  });

  it("bypasses Redis when it cannot be read", async () => {
    const loadHistory = vi.fn().mockResolvedValue(history);
    cache.get.mockRejectedValue(new Error("Redis unavailable"));

    await expect(getGridChartHistory(loadHistory)).resolves.toBe(history);

    expect(loadHistory).toHaveBeenCalledOnce();
    expect(cache.set).not.toHaveBeenCalled();
  });

  it("does not return old data when a refreshed chart query fails", async () => {
    const error = new Error("Database unavailable");
    const loadHistory = vi.fn().mockRejectedValue(error);
    cache.get.mockResolvedValue(null);
    cache.set.mockResolvedValue("OK");

    await expect(getGridChartHistory(loadHistory)).rejects.toThrow(error);

    expect(cache.set).toHaveBeenCalledOnce();
  });

  it("invalidates the Grid Home chart after a snapshot collection", async () => {
    await invalidateGridChartHistory();

    expect(cache.del).toHaveBeenCalledWith("sushiro:queues:charts:grid");
  });
});
