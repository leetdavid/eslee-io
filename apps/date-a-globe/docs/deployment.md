# Deployment

## Owned resources

The game is isolated from the other apps. Do not apply the root `.railway/` configuration to it.

| Resource | Identity |
| --- | --- |
| Railway workspace | David Lee, `a4ce1948-c1ed-4fe6-a376-f3c8a693d164` |
| Railway project | date-a-globe, `f713a291-05da-4e69-a4ba-1200d1ccd33e` |
| Railway environment | production, `cc2aba7e-ad27-4922-badc-163b0e7bb8f7` |
| PostgreSQL service | Postgres, `beb79700-0dad-4da1-a340-a17141a40a6c`, Railway's SSL PostgreSQL 18 image |
| Persistent volume | `9d0bd71a-7aaf-4bfd-acea-64d6a22111c7`, instance `fd944cf7-d2f7-4c53-ab96-07f877002c34` |
| Public TCP proxy | `1914009d-2fa6-48fb-bc4c-d121e8d897b6`, port 5432, so Vercel can reach the database |
| Database region | Singapore (`asia-southeast1-eqsg3a`) |
| Vercel team | eslee, `team_tPjktSIurawh0LBAXsKia7HA` |
| Vercel project | dateaglobe-eslee-io, `prj_J459XSdvSDJuh4UYvB6z5An1YtTN` |
| Vercel root directory | `apps/date-a-globe`, Node.js 24 |
| Function region | `sin1`, close to the database |
| GitHub source | `leetdavid/eslee-io`, production branch `main` |

The database has daily backups kept for 6 days and weekly backups kept for 27 days, read back after configuration.

## Domain

Deployment protection is Vercel Authentication on every URL except custom domains, so the `vercel.app` URLs need a Vercel login and `dateaglobe.eslee.io` is public. The owner approved the plates and reveals on Doop (canvas `atunXH0Vrq`, frames "v3 Plates" and "v3 Reveals") on October 30, and the domain was attached that day.

DNS is a Cloudflare `CNAME` record `dateaglobe` → `2538ddd74f6c3d79.vercel-dns-017.com.`, DNS only (not proxied), recorded in `infra/domain.tf`. The production GitHub OAuth app's callback is `https://dateaglobe.eslee.io/api/auth/callback/github`.

## Secrets and settings

| Variable | Targets | Type | Purpose |
| --- | --- | --- | --- |
| `DATE_A_GLOBE_DATABASE_URL` | production, preview | sensitive | Railway PostgreSQL through the TCP proxy |
| `RATE_LIMIT_SECRET` | production, preview | sensitive | Keys the per-address daily limits; addresses are never stored |
| `BETTER_AUTH_SECRET` | production | sensitive | Signs maintainer sessions |
| `BETTER_AUTH_URL` | production | encrypted | `https://dateaglobe.eslee.io` |
| `DATABASE_URL` | production | sensitive | The shared session database used by `@eslee/auth` |
| `GITHUB_CLIENT_ID_PROD`, `GITHUB_CLIENT_SECRET_PROD` | production | sensitive | The production GitHub OAuth app |

`src/server/github-env.ts` picks the `_PROD` pair on Vercel production and the `_DEV` pair elsewhere. Previews have no OAuth app and no session database, so sign-in and the review queue are off there. Never print these values or commit env files; the local copies live in the git-ignored `.env.github`, `.env` and `apps/date-a-globe/.env.local`.

A maintainer is someone with the Maintain or Admin role on `leetdavid/eslee-io`. The app asks GitHub with the user's own token at sign-in and rechecks every hour.

## Checking a protected deployment

A local Vercel token reaches this project's preview deployments but not protected production. To check a commit, create a preview of it from Git and use `vercel curl` on the preview URL, or send `x-vercel-trusted-oidc-idp-token` from a browser for that host only. Previews share the production database.

## Schema changes and seeding

Tables are defined in `packages/db/src/schema/date-a-globe.ts`. Generate and commit migrations, then apply them before deploying code that needs them:

```sh
pnpm --filter @eslee/date-a-globe db:generate
DATE_A_GLOBE_DATABASE_URL=<railway url> pnpm --filter @eslee/date-a-globe db:migrate
```

The migration runner takes an advisory lock and is safe to rerun. Never push a schema.

`pnpm db:seed` adds researched events from `data/events.json` that aren't in the database yet. It never changes events a maintainer has reviewed. Verified events go live; uncertain or conflicting ones wait in the review queue.

## Plates

Plates are built offline from Natural Earth and committed to `public/plates/`. The owner reviews every plate on Doop first, and only a source with an `approved` date in `data/plate-sources.json` reaches the game:

```sh
pnpm --filter @eslee/date-a-globe plates:build --review [event ids]   # into .cache/plates-review/ for Doop
pnpm --filter @eslee/date-a-globe plates:build [event ids]            # approved plates into public/plates/
```

A plate draws one of today's borders only if `data/borders.json` says it stood through every span its question asks about; a border missing from that table is never drawn. The build prints the borders it kept and hid for each plate, for the review board.

Events without an approved plate show today's map around the place with a ring on it.
