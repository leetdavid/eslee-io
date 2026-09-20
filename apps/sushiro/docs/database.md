# Sushiro database

Sushiro uses a dedicated Railway Postgres database through `src/lib/db.ts` and the required `SUSHIRO_DATABASE_URL` variable. This includes snapshot collection, history charts, store hours, ticket reports, reconciliation, and the estimation backtest. Missing configuration fails explicitly; the shared `DATABASE_URL` is never a fallback.

## Schema changes

The three table definitions remain exported by `@eslee/db/schema`. Sushiro has its own migration history in `apps/sushiro/drizzle`, scoped to those tables:

- `sushiro_queue_snapshot`
- `sushiro_store_hours`
- `sushiro_ticket_report`

Set `SUSHIRO_DATABASE_URL` in the root `.env` or the command environment, then run from the repository root:

```sh
pnpm --filter @eslee/sushiro db:generate
pnpm --filter @eslee/sushiro db:migrate
```

The migration command uses the same Postgres.js driver as the app, including its TLS connection behavior. The root `db:migrate` command manages the other apps' shared database and does not migrate Sushiro's Railway database.

GitHub Actions automatically runs Sushiro migrations before production and preview deployments. It serializes migration runners with a database advisory lock and verifies the candidate's schema before production promotion. See [deployment.md](deployment.md) for the full pipeline and preview isolation.

## September 20, 2026 incident

The collector repeatedly crashed after three HTTP 502 responses. The snapshot endpoint swallowed the database exception, making it look like an upstream Sushiro failure. Vercel chart logs and a direct database connection exposed PostgreSQL code `53000` with the message `Your account or project has exceeded the quota. Upgrade your plan to increase limits.`

The shared Neon project `ancient-dust-19736082` was on its Free plan. Both pooled and direct connections were rejected, including read-only queries. Live Sushiro requests still returned all 44 stores. Restarting the collector or retrying could not restore database access.

The owner chose to start new collection on Railway without upgrading Neon. Production switched on September 20, 2026; the first verified Railway snapshot was collected at `2026-09-20T09:13:48.754Z`. Existing Neon rows were not deleted or modified. History and ticket reports from before the switch remain unavailable until they can be backfilled. Missing observations during the outage cannot be reconstructed from the live feed.

The snapshot endpoint now logs the failed stage and underlying exception. An upstream failure returns 502 with `stage: fetch_queues`; a database write failure returns 503 with `stage: write_snapshots`. Optional store-hours failures no longer turn an already saved snapshot into a failed collection.

## Deferred Neon backfill

Once Neon allows connections again, set:

- `SUSHIRO_LEGACY_DATABASE_URL` to the original Neon connection URL.
- `SUSHIRO_DATABASE_URL` to Railway's TLS-enabled public connection URL.

Then run:

```sh
pnpm --filter @eslee/sushiro db:backfill
```

The script reads Neon in a read-only, repeatable-read transaction and copies the three Sushiro tables in batches of 1,000. Inserts use `ON CONFLICT DO NOTHING`, preserving newer Railway rows and ticket updates. Completed batches stay committed, so the command can be rerun after an interruption. Logs report scanned and inserted counts without row contents or credentials. It does not recreate observations missed during the outage.

The integration test creates two disposable databases on a supplied Postgres server, migrates the real schema, copies more than one batch, checks JSON and date values, reruns the backfill, and verifies that Railway ticket updates and the source are preserved:

```sh
# Use a Postgres connection with permission to create disposable databases.
SUSHIRO_TEST_DATABASE_URL="$TEST_POSTGRES_URL" pnpm --filter @eslee/sushiro test scripts/backfill-neon.test.ts
```

## Recovery checks

Check an actual completed collector run, not only Railway's deployment status. Each success should report `storesCollected`, and the newest `sushiro_queue_snapshot.collected_at` should advance. Railway may start a scheduled container after its scheduled time.

Verify `/api/queues/charts?hours=6`, `/api/store-hours`, and `/api/tickets` also return 200. The infrastructure and backup configuration are documented in [`.railway/README.md`](../../../.railway/README.md).
