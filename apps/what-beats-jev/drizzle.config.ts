import type { Config } from "drizzle-kit";

const url = process.env.WHAT_BEATS_JEV_DATABASE_URL;
if (!url) throw new Error("Missing WHAT_BEATS_JEV_DATABASE_URL");

export default {
  schema: "../../packages/db/src/schema/what-beats-jev.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
} satisfies Config;
