import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.WHAT_BEATS_JEV_DATABASE_URL;
if (!url) throw new Error("Missing WHAT_BEATS_JEV_DATABASE_URL");

const connection = postgres(url, { max: 1, connect_timeout: 10, ssl: "require" });
try {
  await connection`set lock_timeout = '60s'`;
  await connection`select pg_advisory_lock(hashtext('what-beats-jev:migrations'))`;
  await migrate(drizzle(connection), {
    migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)),
  });
  console.log("What Beats Jev migrations applied");
} finally {
  await connection.end();
}
