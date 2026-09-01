import { defineRailway, image, preserve, project, service } from "railway/iac";

export default defineRailway(() => {
  const sushiroQueueCollector = service("sushiro-queue-collector", {
    source: image("alpine:3.21"),
    start: 'sh -c \'wget -qO- --header="Authorization: Bearer $CRON_SECRET" "$SUSHIRO_CRON_URL"\'',
    replicas: { "asia-southeast1-eqsg3a": 1 },
    deploy: {
      cronSchedule: "*/5 * * * *",
      limitOverride: { containers: { cpu: 0.5, memoryBytes: 500_000_000 } },
      restartPolicyType: "NEVER",
    },
    env: {
      CRON_SECRET: preserve(),
      SUSHIRO_CRON_URL: preserve(),
    },
  });

  return project("sushiro-queue-collector", {
    resources: [sushiroQueueCollector],
  });
});
