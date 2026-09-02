import { Redis } from "@upstash/redis";
import type { QueueSnapshot } from "@/lib/queues";
import { fetchQueues } from "@/lib/sushiro";

const cacheKey = "sushiro:queues";
const lockKey = "sushiro:queues:refresh-lock";
const cacheDuration = 60;
const lockDuration = 15;

function redis() {
  const hasVercelRedis = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
  const hasUpstashRedis = Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );

  return hasVercelRedis || hasUpstashRedis ? Redis.fromEnv() : null;
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function refreshQueues(cache: Redis) {
  const lock = await cache.set(lockKey, "1", { ex: lockDuration, nx: true });

  if (lock) {
    try {
      const queues = await fetchQueues();
      await cache.set(cacheKey, queues, { ex: cacheDuration });
      return queues;
    } finally {
      await cache.del(lockKey);
    }
  }

  for (let attempt = 0; attempt < lockDuration * 2; attempt += 1) {
    await wait(500);
    const queues = await cache.get<QueueSnapshot>(cacheKey);

    if (queues) {
      return queues;
    }
  }

  return fetchQueues();
}

export async function getQueues() {
  const cache = redis();

  if (!cache) {
    return fetchQueues();
  }

  try {
    return (await cache.get<QueueSnapshot>(cacheKey)) ?? (await refreshQueues(cache));
  } catch {
    return fetchQueues();
  }
}
