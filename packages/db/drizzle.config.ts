import type { Config } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Missing DATABASE_URL_UNPOOLED or DATABASE_URL");
}

export default {
  schema: "./src/schema/*",
  dialect: "postgresql",
  dbCredentials: { url: databaseUrl },
  casing: "snake_case",
} satisfies Config;
