import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const databases = new Map<"matchups" | "budget", ReturnType<typeof drizzle>>();

function databaseFor(scope: "matchups" | "budget") {
  const existing = databases.get(scope);
  if (existing) return existing;
  const url = process.env.WHAT_BEATS_JEV_DATABASE_URL;
  if (!url) throw new Error("Game database is not configured");
  const client = postgres(url, {
    max: scope === "budget" ? 1 : 4,
    ssl: "require",
    prepare: false,
    connect_timeout: 10,
    idle_timeout: 20,
    max_lifetime: 300,
  });
  const database = drizzle(client);
  databases.set(scope, database);
  return database;
}

export function getDatabase() {
  return databaseFor("matchups");
}

// Budget writes commit independently of model transactions. A dedicated
// connection prevents pool exhaustion while matchup locks are held.
export function getRequestBudgetDatabase() {
  return databaseFor("budget");
}

export async function closeDatabases() {
  await Promise.all(Array.from(databases.values(), (database) => database.$client.end()));
  databases.clear();
}
