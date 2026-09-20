import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.SUSHIRO_DATABASE_URL;
if (!url) throw new Error("Missing SUSHIRO_DATABASE_URL");

const connection = postgres(url, { max: 1, connect_timeout: 10 });
try {
  await connection`set lock_timeout = '60s'`;
  await connection`select pg_advisory_lock(hashtext('sushiro:migrations'))`;
  await migrate(drizzle(connection), {
    migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)),
  });
  console.log("Sushiro database migrations applied");
} finally {
  // The dedicated connection releases the migration lock on close or failure.
  await connection.end();
}
