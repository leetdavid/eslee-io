import type { Config } from "drizzle-kit";

export default {
  schema: "./src/server/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    // biome-ignore lint/style/noNonNullAssertion: env var validated at runtime
    url: process.env.DATABASE_URL!,
  },
  tablesFilter: ["nihongo_*"],
} satisfies Config;
