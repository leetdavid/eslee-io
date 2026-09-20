# Sushiro queue infrastructure

This configuration owns the Sushiro queue collector, production and preview Postgres services, private Redis cache, and authenticated HTTPS cache gateway used by the Vercel app.

`CRON_SECRET`, `SUSHIRO_CRON_URL`, and `SUSHIRO_CACHE_GATEWAY_TOKEN` remain managed as Railway variables and are intentionally preserved rather than stored in Git.

Changes to `.railway/` are planned on same-repository pull requests. After checks pass on every push to `main`, including direct pushes, CI calls `railway-config.yml` to apply the configuration and reconcile database networking and backups. Sushiro production deployment waits for that job. The workflow also supports manual dispatch on `main`. Superseded commits cannot apply old infrastructure configuration.

## Postgres

The `sushiro-postgres` service runs in Singapore. The Vercel app uses its encrypted `DATABASE_PUBLIC_URL` as `SUSHIRO_DATABASE_URL`. The URL requires TLS. The app never falls back to the shared Neon `DATABASE_URL`.

Railway CLI 5.47.1's database helper does not round-trip TCP proxies or backup schedules through IaC. `apps/sushiro/scripts/configure-infrastructure.ts` supplies the missing automation after each apply. It discovers service and volume IDs, creates missing port-5432 TCP proxies, ensures TLS public connection variables exist, and enables and verifies daily/weekly production backups. It preserves additional backup schedules and can be rerun safely:

```sh
pnpm --filter @eslee/sushiro infra:configure
```

`sushiro-preview-postgres` is a separate Postgres server. CI creates one database and restricted login per same-repository PR, with no production data. Preview databases are disposable and are deleted when their PR closes. They do not have scheduled backups.

The collector runs every five minutes. Its HTTP client has bounded timeouts, retries transient HTTP errors twice, and logs failed response bodies. A run is successful only if the snapshot endpoint returns success.

See [`apps/sushiro/docs/database.md`](../apps/sushiro/docs/database.md) for migrations, the September 2026 incident, and deferred Neon backfill.

Deployment sequencing and required GitHub secrets are in [`apps/sushiro/docs/deployment.md`](../apps/sushiro/docs/deployment.md).
