import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.SUSHIRO_DATABASE_URL;
if (!url) throw new Error("Missing SUSHIRO_DATABASE_URL");

const connection = postgres(url, { max: 1, connect_timeout: 10 });
try {
  await migrate(drizzle(connection), {
    migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)),
  });
  console.log("Sushiro database migrations applied");
} finally {
  await connection.end();
}
