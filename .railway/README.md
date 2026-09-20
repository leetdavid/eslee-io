# Sushiro queue infrastructure

This configuration owns the Sushiro queue collector, dedicated Postgres database, private Redis cache, and authenticated HTTPS cache gateway used by the Vercel app.

`CRON_SECRET`, `SUSHIRO_CRON_URL`, and `SUSHIRO_CACHE_GATEWAY_TOKEN` remain managed as Railway variables and are intentionally preserved rather than stored in Git.

Changes to `.railway/` are planned on pull requests and applied by GitHub Actions after merge to `main`.

## Postgres

The `sushiro-postgres` service runs in Singapore. The Vercel app uses its encrypted `DATABASE_PUBLIC_URL` as `SUSHIRO_DATABASE_URL`. The URL requires TLS. The app never falls back to the shared Neon `DATABASE_URL`.

Railway CLI 5.47.1's database helper does not round-trip TCP proxies or backup schedules through IaC. These settings were applied separately and verified after provisioning:

- TCP proxy targets port 5432.
- Volume `cc276515-0c56-4c89-81d0-bbf5073e86f9` mounts at `/var/lib/postgresql/data`.
- Production volume instance `f9b0074a-1e13-4790-b5db-84ceff894273` has daily backups retained for 6 days and weekly backups retained for 27 days.

Verify them with:

```sh
railway tcp-proxy list --service sushiro-postgres --environment production --json
railway api 'query { volumeInstanceBackupScheduleList(volumeInstanceId: "f9b0074a-1e13-4790-b5db-84ceff894273") { kind cron retentionSeconds } }'
```

The collector runs every five minutes. Its HTTP client has bounded timeouts, retries transient HTTP errors twice, and logs failed response bodies. A run is successful only if the snapshot endpoint returns success.

See [`apps/sushiro/docs/database.md`](../apps/sushiro/docs/database.md) for migrations, the September 2026 incident, and deferred Neon backfill.
