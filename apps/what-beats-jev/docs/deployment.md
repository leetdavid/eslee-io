# Deployment

## Owned resources

The game is isolated from Sushiro. Do not apply the root `.railway/railway.ts` to this project.

| Resource | Identity |
| --- | --- |
| Railway workspace | David Lee, `a4ce1948-c1ed-4fe6-a376-f3c8a693d164` |
| Railway project | what-beats-jev, `2bffb850-c221-4532-8a99-2ad9d99b8773` |
| Railway environment | production, `e1705dd3-c2ee-4e16-ace2-865a7fc765a6` |
| PostgreSQL service | Postgres, `18605a98-f5e5-4d94-9e06-99fdcbaf1db6` |
| Persistent volume | `5ed67335-29d5-4d7b-99ec-3f773539e903` |
| Database region | Singapore |
| Vercel team | eslee |
| Vercel project | what-beats-jev, `prj_lbos9sWZDN4Q7onIxdysBDPva3nS` |
| Vercel root directory | `apps/what-beats-jev` |
| Function region | `sin1`, close to the database |
| GitHub source | `leetdavid/eslee-io`, branch `main` |

Production: https://what-beats-jev.vercel.app

The verified production deployment is `dpl_GKrpuCqPiSLeidCHjgxQpXqeAVV9`, with functions in `sin1`. Anonymous page access and `/api/health` returned HTTP 200, and the deployed live-check script passed. Implementation and review-fix commits are `f9a2b6f` and `5a461da`, pushed to `main`.

## Secrets

Vercel production and preview have sensitive server-only variables:

- `TYPESAFE_API_KEY`
- `WHAT_BEATS_JEV_DATABASE_URL`
- `RATE_LIMIT_SECRET`

Do not prefix these with `NEXT_PUBLIC_`, print their values, or commit environment files. Root and app ignore rules exclude local credentials and Vercel link files. The game never falls back to the unrelated root `DATABASE_URL`.

The PostgreSQL service uses Railway's SSL-enabled PostgreSQL 18 image. Connections require encrypted TLS; Railway's image uses a self-signed certificate. Daily and weekly volume backup schedules are enabled and were read back after configuration.

## Schema changes

Tables are defined in `packages/db/src/schema/what-beats-jev.ts`. Generate and commit migrations, then run the owning app's migration command against the intended database:

```sh
pnpm --filter @eslee/what-beats-jev db:generate
pnpm --filter @eslee/what-beats-jev db:migrate
```

Never run schema push against a shared database. The migration runner uses a dedicated migration lock and supports safe reruns. Apply migrations before deploying code that needs new fields.

## Release and verify

The Vercel project is connected to the GitHub repository with its own monorepo root and build configuration. It uses Node.js 24 and the game's patched Next.js 15.5.27 dependency without changing other apps' Next.js versions.

```sh
pnpm check
pnpm typecheck
pnpm test
pnpm turbo run build --filter=@eslee/what-beats-jev
```

Deploy from the monorepo root with the explicit game project IDs, without changing the portfolio's root link:

```sh
VERCEL_PROJECT_ID=prj_lbos9sWZDN4Q7onIxdysBDPva3nS \
VERCEL_ORG_ID=team_tPjktSIurawh0LBAXsKia7HA \
vercel deploy --prod --yes --scope eslee
```

Do not deploy from the app directory with its monorepo root setting, which duplicates the app path. After a production deployment reaches Ready, run:

```sh
pnpm --filter @eslee/what-beats-jev test:live <production URL>
```

This checks the migrated database, real Jev decisions, normalized cache reuse, preserved confidence, concurrent first-win discovery, and cached losses. Also verify anonymous browser play, validation, loss, refresh recovery, narrow layouts, and accessibility. A queued deployment or a passing build alone is not a completed release.

## Verified release

- Monorepo typechecking, Biome, production build, and full tests passed. The isolated game suite has 16 passing tests, including PostgreSQL concurrency, budget-boundary, and failure-recovery coverage.
- Eight opt-in live model evaluations passed across conventional, abstract, unrelated, and prompt-injection cases. Run `pnpm --filter @eslee/what-beats-jev evaluate:model` to repeat them; they do not populate the cache.
- Production live verification passed for real Jev, cached confidence, normalized cache hits, a single concurrent first-win notice, and cached losses.
- Browser verification covered real win/loss, reload recovery, repeated input, offline/retry without loss, and a full 240-character challenge at 320px. Axe reported zero WCAG A/AA violations on play and loss states.
- Unicode casefolding is shared by repeats and cache identity. An audit found no existing production identities needing rekeying. Request budgets are charged only to the model-call owner, with an independent connection so failed inference remains charged and cache followers remain free.
- Standards and spec reviews were completed separately. Their substantive findings were fixed and rechecked, with no remaining identified defects.
- [GitHub CI for the implementation](https://github.com/leetdavid/eslee-io/actions/runs/37680002845) completed successfully, including game database migrations/reruns and all game tests.

Automated accessibility checks are not a guarantee of complete accessibility conformance. The rejection summary exists in a stable live region and receives result-focused navigation; production DOM checks confirmed the announced text and focus target.
