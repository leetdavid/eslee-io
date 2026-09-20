# Sushiro CI/CD

GitHub Actions owns Sushiro deployments. `apps/sushiro/vercel.json` disables Vercel's automatic Git deployments for this app so they cannot bypass checks or race database migrations. Other apps retain their existing deployment behavior.

## Production

Every push to `main`, including a direct push, runs this sequence in `.github/workflows/ci.yml`:

1. Lint, formatting, workspace type checking, and Sushiro tests.
2. Apply Railway configuration and reconcile database TCP proxies, TLS connection variables, and production backup schedules.
3. Read the current production database URL from Railway and run `pnpm --filter @eslee/sushiro db:migrate`.
4. Synchronize `SUSHIRO_DATABASE_URL` with the Vercel production environment and build a production deployment with `--skip-domain`.
5. Request the candidate's `/api/health` endpoint through Vercel's authenticated protection bypass. This checks all three Sushiro tables and their columns.
6. Verify that the commit is still the current `main` head, then promote the candidate to `sushiro.eslee.io`.

A failed check, migration, build, or health check stops the sequence. The existing production deployment retains its domains until promotion. The deployment job serializes production releases and checks for superseded source both before migration and before promotion. Infrastructure applies also reject superseded source.

The migration runner takes a PostgreSQL advisory lock, so overlapping manual and automated migration commands cannot race. A failed build does not roll back a successful migration. **Keep production migrations backward-compatible with the currently running app.** Add new structures first; remove old structures only in a later release after old code no longer needs them.

## Pull request previews

Non-draft PRs from this repository targeting `main` deploy after the same CI checks. Fork PRs run checks against disposable CI Postgres but do not receive deployment credentials or hosted preview databases.

Each hosted preview gets `sushiro_pr_<number>` as its database and login on `sushiro-preview-postgres`. The login cannot create databases or roles, is not a superuser, and cannot connect to another PR's database. The production database runs on a different server. Preview databases start empty and retain their rows across PR updates; the login password rotates on a rebuild. Earlier deployments of that PR may therefore lose access after a rebuild.

The preview's connection URL is passed explicitly to both the Vercel build and runtime. A branch-specific Vercel environment variable also supports redeploys. The verified preview URL appears in the deployment job summary and GitHub environment.

`sushiro-preview-cleanup.yml` uses `pull_request_target: closed` and checks out trusted `main` code. It rechecks that the PR is closed, removes the branch-specific Vercel variable, and drops only that PR's database and login. Cleanup and preview deployment share a concurrency group. Reopened PRs are not deleted by an old queued cleanup. Old Vercel deployment records remain, but their deleted database is no longer accessible.

## CI database tests

CI starts disposable Postgres 18, applies the Sushiro migrations twice, then runs the full test suite. Integration tests verify:

- Backfill batching, JSON/date preservation, and resumability without overwriting newer rows.
- Concurrent migrations against an empty database.
- Cross-PR connection denial and inability to create another database.
- Preview rebuilds preserving rows and repeated cleanup leaving other PR databases intact.

Tests fail immediately in CI if `SUSHIRO_TEST_DATABASE_URL` is absent. The database integration tests may be skipped in local unit-only runs.

## Credentials and tools

Repository secrets in `leetdavid/eslee-io`:

| Secret | Purpose |
| --- | --- |
| `RAILWAY_TOKEN` | Railway account/workspace API token, injected as `RAILWAY_API_TOKEN`. Reads service variables and applies infrastructure configuration. Commands explicitly target the Sushiro project and production environment. |
| `SUSHIRO_VERCEL_TOKEN` | Dedicated Vercel access token scoped to the `eslee` team. Deploys Sushiro, manages its database variables, verifies protected candidates, and promotes production. |

GitHub supplies `github.token` for repository-state checks. No production database URL needs to be duplicated in GitHub secrets. Connection strings and generated passwords are masked before use in Actions. Rotate the Vercel token by updating `SUSHIRO_VERCEL_TOKEN` before its chosen expiration date.

The deployment workflow pins Vercel CLI 58.9.5 and Railway CLI 5.47.1. Dependencies install from the frozen PNPM lockfile. Service/project IDs are centralized in `scripts/deployment-tools.ts`; backup reconciliation discovers volume IDs dynamically.

## Operations

- **Retry a failed release:** rerun its CI workflow. A superseded commit will not be promoted. Alternatively, dispatch the `CI` workflow on current `main`.
- **Repair infrastructure settings:** dispatch `Railway Configuration` on `main`, or run `pnpm --filter @eslee/sushiro infra:configure` after authenticating Railway locally.
- **Retry preview cleanup:** rerun the failed `Sushiro Preview Cleanup` workflow.
- **Database failure:** inspect the deployment job and `/api/health`, then check Railway database logs. Do not reintroduce the shared Neon URL.
- **Neon backfill:** remains a separate, manual operation after Neon permits reads. See [database.md](database.md).
