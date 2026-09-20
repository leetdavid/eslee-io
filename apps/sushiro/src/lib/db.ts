import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const databaseUrl = process.env.SUSHIRO_DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Missing SUSHIRO_DATABASE_URL: Sushiro requires its dedicated database");
}

const connection = postgres(databaseUrl, { max: 5, idle_timeout: 20, connect_timeout: 10 });

export const db = drizzle(connection, { casing: "snake_case" });
