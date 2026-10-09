# Jev MBTI agent guidelines

Follow the monorepo's root `AGENTS.md` in addition to these app-specific instructions.

- Load the `typesafe-ai` skill before changing anything that talks to Jev. Read the live TypeSafe docs for the current API, SDK, and question contracts instead of relying on remembered examples.
- Read `CONTEXT.md` for the agreed language, and `.impeccable.md` plus `docs/design-brief.md` for the approved notebook design. The frames on Doop canvas `l2R2l7AW3M` are the visual reference; `docs/doop-designs.md` indexes them.
- Jev reads each question first (refusal, ranking or style, lore topics) and places types; it never writes text. Fit and custom axes have fixed levels and placeholder labels in code, so Jev places them without waiting for the LLM, and the review's wording names them afterward. The LLM designs suggested axes and writes the review. Keep that split, keep Jev's original placements visible in With review whenever the review moves a type, and keep correction rules (clamping, the minimum move) and refusal thresholds in code. Clean chart hides correction history but keeps corrected positions; Jev only keeps original positions. Use `chartPresentation` for both the page and share images so their selected views agree.
- Lore lives in `src/lore`. Lines are paraphrased Korean social media stereotypes in both languages; keep `SOURCES.md` current and run `pnpm vitest run src/lore` after editing.
- Placement quality depends on the lore, Jev's question checks, the fit and custom levels, and the axis prompt together. After changing any of them, run `pnpm evaluate:model` (live Jev and gateway calls) and compare the spread, direction, and timings it reports.
- Keep `TYPESAFE_API_KEY`, gateway credentials, `RATE_LIMIT_SECRET`, and database URLs server-side. Never print their values or put them in browser code, Doop frames, or documentation.
- Production uses an isolated Railway PostgreSQL database. Confirm the project, environment, and service before any infrastructure mutation; the root `.railway/` configuration belongs to Sushiro. Generate migrations with `pnpm db:generate` and apply them with `pnpm db:migrate`; never push a schema.
- Local development can set `JEV_MBTI_DATABASE_URL=pglite:.pglite` to use an embedded PostgreSQL.
- `JEV_MBTI_LLM_MODEL` chooses the LLM: a plain id goes through Vercel AI Gateway (Gemini 3.x needs paid gateway credit), and an `openrouter:` prefix goes through OpenRouter with `OPENROUTER_API_KEY`. Compare candidates with `pnpm evaluate:model`; `docs/deployment.md` records the last comparison.
