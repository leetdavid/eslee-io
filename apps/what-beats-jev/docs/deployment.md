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

The production application URL will be recorded after live deployment verification.

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

Deploy only to the linked game project and `eslee` scope. After a production deployment reaches Ready, run:

```sh
pnpm --filter @eslee/what-beats-jev test:live <production URL>
```

This checks the migrated database, real Jev decisions, normalized cache reuse, preserved confidence, concurrent first-win discovery, and cached losses. Also verify anonymous browser play, validation, loss, refresh recovery, narrow layouts, and accessibility. A queued deployment or a passing build alone is not a completed release.
