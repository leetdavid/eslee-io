import {
  defineRailway,
  image,
  postgres,
  preserve,
  project,
  redis,
  service,
  volume,
} from "railway/iac";

export default defineRailway((ctx) => {
  const sushiroVolume = volume("sushiro-postgres-volume", {
    region: "asia-southeast1-eqsg3a",
    sizeMB: 50000,
    allowOnlineResize: true,
    alerts: { usage: { "80": {}, "95": {}, "100": {} } },
  });
  const sushiroDatabase = postgres("sushiro-postgres", { region: "asia-southeast1-eqsg3a" });
  // configure-infrastructure.ts reconciles TCP proxies and backup schedules,
  // which the database helper does not round-trip through IaC.
  sushiroDatabase.variables = {
    DATABASE_PUBLIC_URL: {
      type: "literal",
      value:
        // biome-ignore lint/suspicious/noTemplateCurlyInString: Railway resolves these references.
        "postgresql://${{PGUSER}}:${{PGPASSWORD}}@${{RAILWAY_TCP_PROXY_DOMAIN}}:${{RAILWAY_TCP_PROXY_PORT}}/${{PGDATABASE}}?sslmode=require",
    },
  };
  const previewDatabase = postgres("sushiro-preview-postgres", {
    region: "asia-southeast1-eqsg3a",
  });
  previewDatabase.variables = sushiroDatabase.variables;
  const previewVolume = volume("sushiro-preview-postgres-volume", {
    region: "asia-southeast1-eqsg3a",
    sizeMB: 50000,
    allowOnlineResize: true,
    alerts: { usage: { "80": {}, "95": {}, "100": {} } },
  });
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
  // Railway cron cannot run more often than every five minutes. While branches issue tickets
  // (10:00 to 22:00 in Hong Kong, 02:00 to 14:00 UTC) each run takes a snapshot a minute for
  // five minutes. Outside those hours it takes one. Each request is bounded to 50 seconds, so
  // a run always ends before the next one is due. The script must not contain a single quote.
  const collectorScript = [
    "start=$(date +%s)",
    "hour=$((1$(date -u +%H) - 100))",
    "runs=1",
    'if [ "$hour" -ge 2 ] && [ "$hour" -lt 14 ]; then runs=5; fi',
    "run=0",
    "status=0",
    'while [ "$run" -lt "$runs" ]; do pause=$((start + run * 60 - $(date +%s))); if [ "$pause" -gt 0 ]; then sleep "$pause"; fi; curl --fail-with-body --silent --show-error --connect-timeout 10 --max-time 40 --retry 1 --retry-delay 3 --retry-max-time 50 --header "Authorization: Bearer $CRON_SECRET" "$SUSHIRO_CRON_URL" || status=1; run=$((run + 1)); done',
    'exit "$status"',
  ].join("; ");
  const sushiroQueueCollector = service("sushiro-queue-collector", {
    source: image("curlimages/curl:8.17.0"),
    start: `sh -c '${collectorScript}'`,
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
    resources: [
      sushiroQueueCollector,
      redisCache,
      redisVolume,
      cacheGateway,
      sushiroDatabase,
      sushiroVolume,
      previewDatabase,
      previewVolume,
    ],
  });
});
