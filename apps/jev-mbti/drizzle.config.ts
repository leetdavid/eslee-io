import type { Config } from "drizzle-kit";

// Migration generation only diffs the schema file; it never connects.
export default {
  schema: "../../packages/db/src/schema/jev-mbti.ts",
  out: "./drizzle",
  dialect: "postgresql",
} satisfies Config;
