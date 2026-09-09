import { defineRailway, image, preserve, project, redis, service, volume } from "railway/iac";

export default defineRailway((ctx) => {
  const redisCache = redis("Redis", { region: "asia-southeast1-eqsg3a" });
  redisCache.deploy = {
    startCommand:
      '/bin/sh -c "rm -rf $RAILWAY_VOLUME_MOUNT_PATH/lost+found/ && exec docker-entrypoint.sh redis-server --requirepass $REDIS_PASSWORD --save 60 1 --dir $RAILWAY_VOLUME_MOUNT_PATH"',
  };
  const redisVolume = volume("redis-volume", {
    alerts: { usage: { "100": {}, "80": {}, "95": {} } },
    allowOnlineResize: true,
    region: "asia-southeast1-eqsg3a",
    sizeMB: 50000,
  });
  const sushiroQueueCollector = service("sushiro-queue-collector", {
    source: image("alpine:3.21"),
    start:
      'sh -c \'n=0; until wget -qO- --header="Authorization: Bearer $CRON_SECRET" "$SUSHIRO_CRON_URL"; do n=$((n+1)); [ "$n" -ge 3 ] && exit 1; echo "retry $n after 502/error"; sleep 5; done\'',
    replicas: { "asia-southeast1-eqsg3a": 1 },
    deploy: {
      cronSchedule: "*/5 * * * *",
      limitOverride: { containers: { cpu: 0.5, memoryBytes: 500000000 } },
      restartPolicyType: "NEVER",
    },
    env: { CRON_SECRET: preserve(), SUSHIRO_CRON_URL: preserve() },
  });
  const cacheGateway = service("sushiro-cache-gateway", {
    build: {
      buildCommand: "pnpm --filter @eslee/sushiro-cache-gateway build",
      watchPatterns: [
        "apps/sushiro-cache-gateway/**",
        "package.json",
        "pnpm-lock.yaml",
        "pnpm-workspace.yaml",
        "tooling/typescript/**",
      ],
    },
    env: {
      REDIS_URL: redisCache.env.REDIS_URL,
      SUSHIRO_CACHE_GATEWAY_TOKEN: ctx.shared.SUSHIRO_CACHE_GATEWAY_TOKEN,
    },
    healthcheck: "/health",
    healthcheckTimeout: 30,
    replicas: { "asia-southeast1-eqsg3a": 1 },
    start: "pnpm --filter @eslee/sushiro-cache-gateway start",
  });

  return project("sushiro-queue-collector", {
    resources: [sushiroQueueCollector, redisCache, redisVolume, cacheGateway],
  });
});
