import type { QueueHistory, QueueSnapshot } from "@/lib/queues";
import { fetchQueues } from "@/lib/sushiro";

const cacheKey = "sushiro:queues";
const lockKey = "sushiro:queues:refresh-lock";
const cacheDuration = 60;
const lockDuration = 15;
const gridChartCacheKey = "sushiro:queues:charts:grid";
const gridChartLockKey = "sushiro:queues:charts:grid:refresh-lock";
const gridChartCacheDuration = 5 * 60;

type CacheGateway = {
  token: string;
  url: string;
};

function cacheGateway(): CacheGateway | null {
  const url = process.env.SUSHIRO_CACHE_GATEWAY_URL;
  const token = process.env.SUSHIRO_CACHE_GATEWAY_TOKEN;

  if (!url || !token) {
    return null;
  }

  return { token, url };
}

async function requestCache<T>(gateway: CacheGateway, body: Record<string, unknown>) {
  const response = await fetch(gateway.url, {
    body: JSON.stringify(body),
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${gateway.token}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Cache gateway unavailable");
  }

  return (await response.json()) as T;
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function readCache<T>(gateway: CacheGateway, key: string) {
  const { value } = await requestCache<{ value: string | null }>(gateway, { action: "get", key });
  return value ? (JSON.parse(value) as T) : null;
}

async function writeCache(
  gateway: CacheGateway,
  key: string,
  value: unknown,
  ttl: number,
  nx = false,
) {
  const { stored } = await requestCache<{ stored: boolean }>(gateway, {
    action: "set",
    key,
    nx,
    ttl,
    value: JSON.stringify(value),
  });

  return stored;
}

async function deleteCache(gateway: CacheGateway, key: string) {
  await requestCache<{ deleted: boolean }>(gateway, { action: "delete", key });
}

async function refreshQueues(gateway: CacheGateway) {
  const lock = await writeCache(gateway, lockKey, "1", lockDuration, true);

  if (lock) {
    try {
      const queues = await fetchQueues();

      try {
        await writeCache(gateway, cacheKey, queues, cacheDuration);
      } catch {
        // A cache write must not discard freshly retrieved queue data.
      }

      return queues;
    } finally {
      try {
        await deleteCache(gateway, lockKey);
      } catch {
        // The lock's TTL still releases it if the gateway rejects the delete.
      }
    }
  }

  for (let attempt = 0; attempt < lockDuration * 2; attempt += 1) {
    await wait(500);
    const queues = await readCache<QueueSnapshot>(gateway, cacheKey);

    if (queues) {
      return queues;
    }
  }

  return fetchQueues();
}

async function refreshGridChart(gateway: CacheGateway, loadHistory: () => Promise<QueueHistory>) {
  let lock: boolean;

  try {
    lock = await writeCache(gateway, gridChartLockKey, "1", lockDuration, true);
  } catch {
    return loadHistory();
  }

  if (lock) {
    try {
      const history = await loadHistory();

      try {
        await writeCache(gateway, gridChartCacheKey, history, gridChartCacheDuration);
      } catch {
        // A cache write must not discard freshly aggregated chart data.
      }

      return history;
    } finally {
      try {
        await deleteCache(gateway, gridChartLockKey);
      } catch {
        // The lock's TTL still releases it if the gateway rejects the delete.
      }
    }
  }

  for (let attempt = 0; attempt < lockDuration * 2; attempt += 1) {
    await wait(500);

    try {
      const history = await readCache<QueueHistory>(gateway, gridChartCacheKey);

      if (history) {
        return history;
      }
    } catch {
      return loadHistory();
    }
  }

  return loadHistory();
}

export async function getQueues() {
  const gateway = cacheGateway();

  if (!gateway) {
    return fetchQueues();
  }

  try {
    return (await readCache<QueueSnapshot>(gateway, cacheKey)) ?? (await refreshQueues(gateway));
  } catch {
    return fetchQueues();
  }
}

export async function getGridChartHistory(loadHistory: () => Promise<QueueHistory>) {
  const gateway = cacheGateway();

  if (!gateway) {
    return loadHistory();
  }

  try {
    const history = await readCache<QueueHistory>(gateway, gridChartCacheKey);

    if (history) {
      return history;
    }
  } catch {
    return loadHistory();
  }

  return refreshGridChart(gateway, loadHistory);
}

export async function invalidateGridChartHistory() {
  const gateway = cacheGateway();

  if (!gateway) {
    return;
  }

  try {
    await deleteCache(gateway, gridChartCacheKey);
  } catch {
    // Invalidation is best-effort; the five-minute TTL remains the fallback.
  }
}
