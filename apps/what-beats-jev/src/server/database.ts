import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

let database: ReturnType<typeof drizzle> | undefined;

export function getDatabase() {
  if (database) return database;
  const url = process.env.WHAT_BEATS_JEV_DATABASE_URL;
  if (!url) throw new Error("Game database is not configured");
  const client = postgres(url, {
    max: 4,
    ssl: "require",
    prepare: false,
    connect_timeout: 10,
    idle_timeout: 20,
    max_lifetime: 300,
  });
  database = drizzle(client);
  return database;
}
