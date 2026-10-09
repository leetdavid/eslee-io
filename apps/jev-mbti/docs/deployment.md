# Deployment

## Owned resources

The site is isolated from Sushiro and What Beats Jev. Do not apply the root `.railway/` configuration to it.

| Resource | Identity |
| --- | --- |
| Railway workspace | David Lee, `a4ce1948-c1ed-4fe6-a376-f3c8a693d164` |
| Railway project | jev-mbti, `0a4c3861-b514-4874-ba31-8b08ff1ae049` |
| Railway environment | production, `b2f0d72d-627c-43cd-87a9-86c6bed230ef` |
| PostgreSQL service | Postgres, `277e154d-bb8b-4f97-aa37-da0180f5b9a6`, Railway's SSL PostgreSQL 18 image |
| Persistent volume | `920fe7c7-5643-4b1d-b2b9-1837dd485b05`, instance `0566331a-138d-42ea-8845-56f2ec277466` |
| Public TCP proxy | `ecd8f317-d610-47af-b5c7-6f4cefe332e5`, port 5432, so Vercel can reach the database |
| Database region | Singapore (`asia-southeast1-eqsg3a`) |
| Vercel team | eslee, `team_tPjktSIurawh0LBAXsKia7HA` |
| Vercel project | jev-mbti, `prj_QYy8IEXXQsJ9iGjL1z1YyCtj3nWn` |
| Vercel root directory | `apps/jev-mbti`, Node.js 24 |
| Function region | `sin1`, close to the database |
| GitHub source | `leetdavid/eslee-io`, production branch `main` |

Production: https://jev-mbti.vercel.app

The database has daily backups kept for 6 days and weekly backups kept for 27 days. Both schedules were read back after configuration. Railway's image uses a self-signed certificate, so the app connects with TLS required but unverified, like What Beats Jev.

## Secrets and settings

Vercel production and preview have these server-only variables:

| Variable | Type | Purpose |
| --- | --- | --- |
| `TYPESAFE_API_KEY` | sensitive | Jev placements |
| `JEV_MBTI_DATABASE_URL` | sensitive | Railway PostgreSQL through the TCP proxy |
| `RATE_LIMIT_SECRET` | sensitive | Hashes visitor IPs for request budgets and signs axis drafts |
| `JEV_MBTI_LLM_MODEL` | encrypted | The model for suggested axes and the review, currently `google/gemini-2.5-flash` |

Deployed functions authenticate to AI Gateway with the project's OIDC token, so no gateway key is stored. Never prefix these variables with `NEXT_PUBLIC_`, print their values, or commit env files. The root `.vercelignore` keeps every `.env*` file and the local `.pglite/` database out of CLI uploads.

## Choosing the LLM

The owner chose to stay on Gemini 2.5 Flash on October 9, so it is also the default when `JEV_MBTI_LLM_MODEL` is unset. The variable picks the model and the route:

- A plain id such as `google/gemini-2.5-flash` goes through Vercel AI Gateway. The eslee team's gateway is on the free tier, which serves Gemini 2.5 Flash but blocks every Gemini 3.x model until credit is added.
- An id prefixed with `openrouter:`, such as `openrouter:google/gemini-3.8-flash`, goes through OpenRouter and needs `OPENROUTER_API_KEY` as a sensitive variable. OpenRouter charges the same list price for Gemini 3.8 Flash as the gateway.

Each saved review records the label of the model that actually wrote it, which matters for routers such as `openrouter:openrouter/free`. Changing the variable needs a redeploy.

The October 9 run of `pnpm evaluate:model` compared the options on six cases:

| Option | Passed | Notes |
| --- | --- | --- |
| Gemini 2.5 Flash, gateway free tier | 6 of 6 | Axes in 8 to 14 seconds; review in 6 seconds |
| `openrouter/free` router | 2 of 6 | Axis requests took 37 seconds or ran past the 75-second limit |
| Nemotron 3 Super 120B, free | 1 of 6 | Refused every question, including harmless ones |
| Gemma 4 31B, free | 0 of 6 | Rate-limited upstream on every call |

Free OpenRouter models aren't usable for this site today.

Later on October 9, Jev started going first, and Gemini 2.5 Flash stopped thinking while designing axes. The evaluation then passed 9 of 9 cases:

| Path | Time before placement | Notes |
| --- | --- | --- |
| Ranking question (fit axis) | 0.3 to 0.6 seconds | Jev's question checks only; placement adds about 0.35 seconds |
| Custom ends | about 0.3 seconds | No LLM before placement |
| Style question or two axes (suggested) | 5.6 to 6.7 seconds | Was 10.7 to 13.4 seconds with a thinking budget, with no loss of spread |
| Refusal | about 0.3 seconds | Jev refuses before any LLM call |

The review writes a Jev-first chart's wording about 3 seconds in and finishes in 7 to 9 seconds.

## Schema changes

Tables are defined in `packages/db/src/schema/jev-mbti.ts`. Generate and commit migrations, then apply them to the intended database before deploying code that needs them:

```sh
pnpm --filter @eslee/jev-mbti db:generate
JEV_MBTI_DATABASE_URL=<railway url> pnpm --filter @eslee/jev-mbti db:migrate
```

The migration runner takes an advisory lock and is safe to rerun. Never push a schema.

## Release and verify

```sh
pnpm check
pnpm turbo run typecheck test build --filter=@eslee/jev-mbti
pnpm --filter @eslee/jev-mbti evaluate:model   # live Jev and LLM calls
```

Pushes to `main` deploy through the GitHub connection. To deploy the working tree directly, run this from the monorepo root with the explicit IDs, without changing the portfolio's root link:

```sh
VERCEL_PROJECT_ID=prj_QYy8IEXXQsJ9iGjL1z1YyCtj3nWn \
VERCEL_ORG_ID=team_tPjktSIurawh0LBAXsKia7HA \
vercel deploy --prod --yes --scope eslee
```

For layout changes, use the installed `agent-browser` CLI to check the home page and both chart kinds in Korean and English at widths from 320 to 1280 pixels:

```sh
pnpm --filter @eslee/jev-mbti check:responsive \
  https://jev-mbti.vercel.app/ \
  https://jev-mbti.vercel.app/c/8ytb8vhm \
  https://jev-mbti.vercel.app/c/udachzpe
```

Pass local URLs and saved chart IDs to check a local build before deploying. The check fails if the page scrolls horizontally, the copy-link row extends past its share section, or the notebook rings become crowded.

After a deployment reaches Ready, ask one new question in each language and confirm that the review completes, a repeated question reuses its chart, and `/c/<id>/image` renders. A passing build alone is not a completed release.

## Verified release

Production deployment `dpl_7TDB4Ym3x9M25DkbZPa5iUKYtJyH` reached Ready with functions in `sin1` and owns https://jev-mbti.vercel.app.

- Anonymous access to the home page returned 200 without a Vercel login wall.
- A new Korean question was charted in 9.9 seconds, with Jev placing all 16 types in 0.4 seconds. The review completed in about 8 seconds with the 16/16 stamp and 총평.
- Asking it again with different spacing and case reused the saved chart in 0.7 seconds.
- The share image returned a 1200 by 630 PNG. Function logs showed no errors.

The Jev-first release, deployment `dpl_7ejitPcjGTh6YxhrSiPJpTZLiig7`, was verified the same way on October 9:

- A new Korean ranking question showed its chart page 2.3 seconds after asking on the first request after deployment, and a new English one 1.4 seconds after. Both pages showed Jev's placements with placeholder ends, gained the review's ends about 5 seconds later, and finished the review at 11 to 13 seconds with the 16/16 stamp.
- Reasking the Korean question with different spacing and case reused its chart in 0.3 seconds.
- The new chart, two older examples, and their share images returned 200, and the home page still lists all six examples.

## Example charts

The home page features the six questions from the approved design, created on production on October 9:

| Question | Chart | Kind | Grade |
| --- | --- | --- | --- |
| 여행 계획은 누가 짤까? | `wtwyvpxh` | One axis | 16/16 |
| MBTI별 이별 후 반응 | `6r2gqnnk` | Two axes | 16/16 |
| 좀비 사태에서 끝까지 살아남는 MBTI는? | `7n2t858z` | One axis | 13/16 |
| MBTI별 카톡 답장 스타일 | `udachzpe` | Two axes | 16/16 |
| 영화 보다가 제일 먼저 우는 MBTI는? | `8ytb8vhm` | One axis | 14/16 |
| 회식 2차까지 가는 MBTI는? | `bcgnjmph` | One axis | 16/16 |

They were asked in Auto mode, so visitors who type the same question reopen these charts. The owner can swap examples at any time. Run these with `JEV_MBTI_DATABASE_URL` set to the production URL:

```sh
pnpm --filter @eslee/jev-mbti examples list
pnpm --filter @eslee/jev-mbti examples add <chart id>
pnpm --filter @eslee/jev-mbti examples remove <chart id>
```

## Local development

`.env.local` in the app can use `JEV_MBTI_DATABASE_URL=pglite:.pglite` for an embedded PostgreSQL that migrates itself. A local gateway credential comes from `vercel env pull` (`VERCEL_OIDC_TOKEN`, valid for twelve hours) or `AI_GATEWAY_API_KEY`. `OPENROUTER_API_KEY` in the monorepo's root `.env` covers the OpenRouter option. Stop the dev server before running `pnpm examples` against the same embedded database.
