import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.JEV_MBTI_DATABASE_URL;
if (!url || url.startsWith("pglite:"))
  throw new Error("Set JEV_MBTI_DATABASE_URL to the Railway PostgreSQL URL");

const connection = postgres(url, { max: 1, connect_timeout: 10, ssl: "require" });
try {
  await connection`set lock_timeout = '60s'`;
  await connection`select pg_advisory_lock(hashtext('jev-mbti:migrations'))`;
  await migrate(drizzle(connection), {
    migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)),
  });
  console.log("Jev MBTI migrations applied");
} finally {
  await connection.end();
}
