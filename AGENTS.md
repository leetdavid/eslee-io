# ESLEE-IO Monorepo - Agent Guidelines

This repository is a TypeScript monorepo managed with **PNPM** and **Turborepo**. It contains applications and shared packages for the `.eslee.io` domain. You must read and follow these guidelines carefully when making changes.

## 1. Build, Lint, and Verify

### Core Commands
Run these commands from the monorepo root directory:
- **Install Dependencies:** `pnpm install` (Always use PNPM, never npm or yarn)
- **Build All:** `pnpm build` (Runs `turbo run build` across all packages)
- **Development Server:** `pnpm dev` (Runs `turbo watch dev`)
- **Check (Lint+Format):** `pnpm check` (Runs `biome check .`)
- **Fix Issues:** `pnpm check:fix` (Runs `biome check --write .`)
- **Type Checking:** `pnpm typecheck` (Runs `tsc` across workspaces)

### Running Verification for a Single Package
To run commands for a specific package (e.g., `@eslee/www`), use the filter flag `-F`:
```bash
pnpm turbo run typecheck -F @eslee/www
pnpm turbo run build -F @eslee/api
```

### Testing (Vitest)
This repository uses **Vitest** for testing. All test files should be placed alongside the source files being tested (e.g., `src/components/Button.test.tsx`).
- **Run all tests:** `pnpm test` (Runs `turbo run test`)
- **Run tests in a specific package:** `pnpm turbo run test -F @eslee/db`
- **Run a single test file (Preferred for targeted validation):**
  When iterating on a specific feature, you should isolate test runs to the relevant file:
  ```bash
  # Option 1: Navigate to the package
  cd apps/www
  pnpm vitest run path/to/specific.test.ts

  # Option 2: Run via Turbo from the root (passing arguments)
  pnpm turbo run test -F <package-name> -- path/to/specific.test.ts
  ```

## 2. Code Style & Conventions

**General Philosophy:** Avoid code explosion. Write only the necessary amount of code required, but prioritize readability and ease of debugging over extreme conciseness.

### Formatting & Linting
- **Language:** TypeScript (Strict mode enabled). Ensure explicit typings for complex structures.
- **Linting & Formatting:** Handled entirely by **Biome** (do not use ESLint or Prettier). Always run `pnpm check:fix` after modifications.

### Imports
- **Absolute Imports:** Use the `@` alias for local imports within `src/` directories.
  - _Good:_ `import { api } from "@/trpc/server";`
  - _Bad:_ `import { api } from "../../trpc/server";`
- **Monorepo Packages:** Import shared packages by their name (e.g., `@eslee/db`, `@eslee/api`). Do not use relative paths across package boundaries.

### Naming Conventions
- **Variables & Functions:** `camelCase` (e.g., `fetchUserData`).
- **React Components, Types, Classes:** `PascalCase` (e.g., `UserProfile`, `UserDTO`).
- **Database Tables:** Use `snake_case` in the DB but define them using `PascalCase` in TS Drizzle definitions (e.g., `export const UserProfile = pgTable("user_profile", ...)`).

### Error Handling
- **API (tRPC):** Throw explicit `TRPCError` with appropriate standard codes (`NOT_FOUND`, `UNAUTHORIZED`, `BAD_REQUEST`).
- **UI:** Use React Error Boundaries (or Next.js `error.tsx`) to catch rendering errors.
- **Forms/Actions:** Gracefully handle server action failures without crashing the application. Display Zod validation errors directly within the UI.

## 3. Tech Stack Specifics

### Database (Drizzle ORM)
- Located in `packages/db`. Define tables in `packages/db/src/schema.ts` using `pgTable`.
- Always run `pnpm db:push` to sync schema to the local DB during development after making schema changes.

### API (tRPC)
- Located in `packages/api`.
- Use `publicProcedure` for unauthenticated routes and `protectedProcedure` for authenticated routes.
- Validate inputs rigorously using Zod.

### Frontend (Next.js)
- Framework: Next.js 14+ (App Router). Styling: Tailwind CSS.
- **Data Fetching:** Use `api` (tRPC client).
  - Server Components: `void api.post.all.prefetch();` followed by `<HydrateClient>`.
  - Client Components: `const { data } = api.post.all.useQuery();`.
- **Components:** Default to Server Components. Use `'use client'` only when React hooks (useState, useForm) or browser APIs are required. 

## 4. Payload CMS Integration (Critical Rules)

If working on Payload CMS functionality, you must follow these rules defined in the `.cursor/rules/`:

### Critical Security Patterns
1. **Local API Access Control (CRITICAL SECURITY):**
   By default, the Local API (`payload.find()`, `payload.create()`, etc.) bypasses access control (`overrideAccess: true`). If operating on behalf of a user, you **MUST** enforce permissions:
   ```typescript
   // SECURE: Enforces user's permissions
   await payload.find({ collection: 'posts', user: req.user, overrideAccess: false })
   ```
2. **Transaction Safety:**
   Always thread the `req` object through nested operations in hooks. Omitting `req` breaks database transaction atomicity.
   ```typescript
   // ATOMIC:
   await req.payload.update({ id, collection: 'posts', data, req }) 
   ```
3. **Prevent Infinite Hook Loops:**
   Hooks triggering operations that trigger the same hooks will cause infinite loops. Use `req.context` flags to bypass:
   ```typescript
   if (context.skipHooks) return;
   await req.payload.update({ /*...*/ context: { skipHooks: true }, req })
   ```

### Field & Component Patterns
4. **Type Generation:**
   Always run `pnpm generate:types` and `pnpm generate:importmap` after modifying collection schemas.
5. **Plugins & Admin Components:**
   - Use the double arrow (currying) pattern for plugins: `(options) => (config) => modifiedConfig`.
   - Component config paths must be relative to `admin.importMap.baseDir` and resolve correctly without breaking the build.
   - All custom components are Server Components by default. Use `'use client'` only when needed, and remember client components can only accept serializable props.
6. **Field Type Guards:**
   - Use Payload's built-in type guards for safe runtime checking: `fieldAffectsData(field)`, `fieldHasSubFields(field)`, `fieldIsArrayType(field)`, etc.

### Advanced Access Control
7. **Best Practices:**
   - Start with a restrictive "Default Deny" policy.
   - For collection-level access, avoid N+1 queries. Return query constraints (e.g., `{ isPublic: { equals: true } }`) instead of performing async lookups when possible.
   - Cache expensive lookups in `req.context` to avoid redundant database calls.

## 5. Standard Workflow for New Features
1. **Database:** Add/modify Drizzle schema in `@eslee/db` or Payload Collections. Run migrations (`pnpm db:push` / `pnpm generate:types`).
2. **API:** Expose data via tRPC routers in `@eslee/api` or Payload custom endpoints.
3. **UI:** Consume the API in Next.js apps using tRPC hooks or Server Components.
4. **Safety Verification:** Before finalizing, ensure `pnpm typecheck` passes and write/run a targeted Vitest test for the new logic.