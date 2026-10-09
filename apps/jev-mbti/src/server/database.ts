import "server-only";

import { join } from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export type Database = PgDatabase<PgQueryResultHKT>;

// PGlite only runs from the app directory (dev server and tests).
const MIGRATIONS = join(process.cwd(), "drizzle");

// One connection per process. Next evaluates pages and route handlers in
// separate module graphs, so a module-level variable would open two.
const shared = globalThis as typeof globalThis & { jevMbtiDatabase?: Promise<Database> };

/**
 * Production uses Railway PostgreSQL. Local development may set
 * `JEV_MBTI_DATABASE_URL=pglite:<directory>` to use an embedded, migrated
 * PostgreSQL without Docker.
 */
export function getDatabase(): Promise<Database> {
  shared.jevMbtiDatabase ??= connect();
  return shared.jevMbtiDatabase;
}

async function connect(): Promise<Database> {
  const url = process.env.JEV_MBTI_DATABASE_URL;
  if (!url) throw new Error("Jev MBTI database is not configured");
  if (url.startsWith("pglite:")) {
    if (process.env.NODE_ENV === "production")
      throw new Error("PGlite is for local development only");
    return openPglite(url.slice("pglite:".length) || undefined);
  }
  const client = postgres(url, {
    max: 4,
    ssl: "require",
    prepare: false,
    connect_timeout: 10,
    idle_timeout: 20,
    max_lifetime: 300,
  });
  return drizzle(client) as unknown as Database;
}

/** An embedded PostgreSQL with migrations applied, for development and tests. */
export async function openPglite(directory?: string): Promise<Database> {
  const [{ PGlite }, { drizzle: drizzlePglite }, { migrate }] = await Promise.all([
    import("@electric-sql/pglite"),
    import("drizzle-orm/pglite"),
    import("drizzle-orm/pglite/migrator"),
  ]);
  const db = drizzlePglite(new PGlite(directory));
  await migrate(db, { migrationsFolder: MIGRATIONS });
  return db as unknown as Database;
}
