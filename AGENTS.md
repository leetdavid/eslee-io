# ESLEE-IO Monorepo - Agent Guidelines

This repository is a TypeScript monorepo managed with **PNPM** and **Turborepo**. It contains applications and shared packages for the `.eslee.io` domain.

## 1. Build, Lint, and Verify

### Core Commands

Run these commands from the root directory.

- **Install Dependencies:** `pnpm install`
- **Build All:** `pnpm build` (Runs `turbo run build`)
- **Development Server:** `pnpm dev` (Runs `turbo watch dev`)
- **Check (Lint+Format):** `pnpm check` (Runs `biome check .`)
- **Fix Issues:** `pnpm check:fix` (Runs `biome check --write .`)
- **Type Checking:** `pnpm typecheck` (Runs `tsc` across workspaces)

### Running Verification for a Single Package

To run commands for a specific package (e.g., `@eslee/www`), use the filter flag `-F`:

```bash
# Typecheck only the web app
pnpm turbo run typecheck -F @eslee/www

# Build only the api package
pnpm turbo run build -F @eslee/api
```

### Tests

**Note:** There are currently no unit test files (`*.test.ts`, `*.spec.ts`) in the repository.
If adding tests:

- Use **Vitest** (recommended for Vite/Next.js ecosystem) or Jest.
- Place test files alongside source files (e.g., `src/foo.test.ts`).
- Add a `test` script to the package's `package.json`.

## 2. Code Style & Conventions

### General

- **Language:** TypeScript (Strict mode enabled).
- **Package Manager:** PNPM (do not use npm or yarn).
- **Linting & Formatting:** **Biome** (do not use ESLint or Prettier).
  - Run `pnpm check:fix` to format code and fix lint errors.
  - Imports are automatically organized by Biome.

### Imports

- **Absolute Imports:** Use the `~` alias for local imports within `src/` directories.
  - _Good:_ `import { api } from "~/trpc/server";`
  - _Bad:_ `import { api } from "../../trpc/server";`
- **External Packages:** Import standard packages normally.
- **Monorepo Packages:** Import shared packages by their name (e.g., `@eslee/db`, `@eslee/api`).

### Database (Drizzle ORM)

- Located in `packages/db`.
- **Schemas:** Define tables in `packages/db/src/schema.ts` using `pgTable`.
- **Naming:**
  - Tables: `snake_case` in DB, PascalCase variable in TS (e.g., `export const Post = pgTable("post", ...)`).
  - Columns: `camelCase` in TS definition.
- **Migrations:** Managed via Drizzle Kit. Run `pnpm db:push` to sync schema to DB during dev.

### API (tRPC)

- Located in `packages/api`.
- **Routers:** Defined in `src/router/`.
- **Procedures:** Use `publicProcedure` or `protectedProcedure`.
- **Validation:** Use `zod` for input validation.
- **Pattern:**
  ```ts
  export const exampleRouter = {
    hello: publicProcedure
      .input(z.object({ text: z.string() }))
      .query(({ input }) => {
        return { greeting: `Hello ${input.text}` };
      }),
  } satisfies TRPCRouterRecord;
  ```

### Frontend (Next.js)

- Located in `apps/www`.
- **Framework:** Next.js 14+ (App Router).
- **Styling:** Tailwind CSS.
- **Components:** Functional components with explicit return types is optional but prop types are required.
- **Data Fetching:** Use `api` (tRPC client) for server/client data fetching.
  - Server Components: `void api.post.all.prefetch();` then `<HydrateClient>`.
  - Client Components: `const { data } = api.post.all.useQuery();`.

### Error Handling

- **API:** Throw `TRPCError` with appropriate codes (`NOT_FOUND`, `UNAUTHORIZED`).
- **UI:** Use React Error Boundaries (or Next.js `error.tsx`).
- **Forms:** Display validation errors from Zod directly in the UI.

## 3. Workflow for New Features

1.  **Database:** Add/Modify schema in `@eslee/db`. Run `pnpm db:push`.
2.  **API:** Expose new data via tRPC routers in `@eslee/api`.
3.  **UI:** Consume the API in `@eslee/www` or other apps using the tRPC hooks.

## 4. Agent Instructions

- **Check Existing:** Before adding dependencies, check `package.json` in the specific workspace.
- **Code Generation:** When generating code, follow existing patterns found in `src/` files.
- **Safety:** Always run `pnpm typecheck` after making structural changes to ensure no breaking contract changes.
