# What Beats Jev?

An anonymous counter-chain game. Start with rock, type anything that might beat it, and keep going until Jev rejects an answer. Every accepted answer becomes the next challenge.

Play at **https://what-beats-jev.vercel.app**.

## Rules

- Answers are free-form text, up to 240 visible Unicode characters.
- No repeated phrases within a run, including the starting rock. Unicode capitalization and surrounding whitespace do not create a different phrase; synonyms remain distinct.
- Jev is the sole judge. Confidence is informational, not a threshold for winning.
- The shared PostgreSQL cache remembers both winning and losing ordered matchups. Only an unseen matchup calls Jev.
- New matchup means the first successful result for that matchup, not a new phrase. Cached wins and fresh losses receive no notice.
- Current runs, including their ended state, stay in browser-local storage. There are no accounts, leaderboards, or run archives.
- Validation and service errors preserve the run and allow retrying.

## Development

Install dependencies with PNPM from the monorepo root. Configure ignored `apps/what-beats-jev/.env.local` using `.env.example`, then:

```sh
pnpm --filter @eslee/what-beats-jev db:migrate
pnpm --filter @eslee/what-beats-jev dev
```

The development server listens on port 3010. It uses `.next-dev`, separate from production build output, so running a build does not corrupt the development server's manifests.

```sh
pnpm turbo run build --filter=@eslee/what-beats-jev
pnpm turbo run typecheck --filter=@eslee/what-beats-jev
pnpm --filter @eslee/what-beats-jev test
pnpm --filter @eslee/what-beats-jev test:live http://localhost:3010
pnpm --filter @eslee/what-beats-jev evaluate:model
```

Database integration tests use `WHAT_BEATS_JEV_TEST_DATABASE_URL`, require an isolated database ending in `_test` or `_ci`, and replace only the external TypeSafe HTTP transport. They never put fake judgments into the production cache. Run them with `pnpm --filter @eslee/what-beats-jev with-env vitest run` after migrating that database.

## Implementation

The Next.js App Router frontend uses actual Fluid Functionalism InputMessage, Button, Badge, Tooltip, and shared utilities, with the approved light toy-like theme. The component sources are included under `src/components/ui`; local extensions support form validation and a visible submit action. The upstream MIT license is included in `LICENSE.fluid-functionalism`.

The frontend calls a typed tRPC mutation. On a cache miss, PostgreSQL transaction-scoped advisory locks serialize identical requests. Only the lock owner evaluates Jev and saves the verdict; followers reuse the stored result and cannot duplicate a discovery notice.

Jev uses TypeSafe's binary Choice, pinned to `jev-1.13.0`. Its selected option determines the verdict. The original confidence and probability are stored with model and judge-version provenance. Known verdicts are not silently recomputed after deployment.

New-matchup requests are bounded to 30 per minute per daily-rotating IP digest and 5,000 per day globally. Raw IP addresses are not stored; expiring digests are used only for request budgets. Cached results do not consume model-request budget. API keys and database credentials remain server-side.

See [deployment](docs/deployment.md), [the approved design brief](docs/design-brief.md), and [Doop designs](docs/doop-designs.md). Load the installed `typesafe-ai` skill before working on the project.
