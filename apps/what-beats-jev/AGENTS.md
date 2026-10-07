# What Beats Jev agent guidelines

Follow the monorepo's root `AGENTS.md` in addition to these app-specific instructions.

- Load the `typesafe-ai` skill before working on this project. It is installed at `.agents/skills/typesafe-ai` in the monorepo root. Read the live TypeSafe docs for the current API, SDK, model, and question contracts instead of relying on remembered examples.
- Read `CONTEXT.md`, `.impeccable.md`, and `docs/design-brief.md` for the agreed game and design rules. Use actual Fluid Functionalism registry components when implementing the UI.
- Jev supplies typed judgments, not generated text. Use the agreed binary Choice verdict without a separate confidence gate or another judge. Keep input validation and exact matchup reuse in code.
- Keep `TYPESAFE_API_KEY` and database credentials server-side. Never print their values or embed them in browser code, Doop frames, or documentation.
- Use Railway PostgreSQL for the game's database. Confirm the project, environment, and service before any infrastructure mutation. The root `.railway/` configuration currently owns Sushiro infrastructure and must not be assumed to own this game.
- Follow the repository's generated-migration workflow. Never push a schema into a shared database.
