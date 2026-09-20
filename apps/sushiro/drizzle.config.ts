import type { Config } from "drizzle-kit";

const url = process.env.SUSHIRO_DATABASE_URL;

if (!url) {
  throw new Error("Missing SUSHIRO_DATABASE_URL");
}

export default {
  schema: "../../packages/db/src/schema/sushiro*.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
  casing: "snake_case",
} satisfies Config;
