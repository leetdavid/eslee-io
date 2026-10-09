import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

// Jev MBTI owns an isolated database. These tables are deliberately not part
// of the shared schema index.
export const JevMbtiChart = pgTable(
  "jev_mbti_chart",
  {
    id: varchar("id", { length: 12 }).primaryKey(),
    reuseKey: varchar("reuse_key", { length: 64 }).notNull().unique(),
    question: text("question").notNull(),
    questionIdentity: text("question_identity").notNull(),
    questionLanguage: varchar("question_language", { length: 2 }).notNull(),
    requestedMode: varchar("requested_mode", { length: 4 }).notNull(),
    // Axes, placements, and lore topics, validated by the app's chart schema.
    plot: jsonb("plot").notNull(),
    jevModel: text("jev_model").notNull(),
    reviewStatus: varchar("review_status", { length: 8 }).notNull().default("pending"),
    // Partial while the review is running, complete once it succeeds.
    review: jsonb("review"),
    reviewModel: text("review_model"),
    reviewStartedAt: timestamp("review_started_at", { withTimezone: true }),
    reviewCompletedAt: timestamp("review_completed_at", { withTimezone: true }),
    isExample: boolean("is_example").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("jev_mbti_chart_example_idx").on(table.isExample, table.createdAt),
    check(
      "jev_mbti_chart_review_status",
      sql`${table.reviewStatus} IN ('pending', 'running', 'complete', 'failed')`,
    ),
    check("jev_mbti_chart_language", sql`${table.questionLanguage} IN ('ko', 'en')`),
    check("jev_mbti_chart_mode", sql`${table.requestedMode} IN ('auto', 'one', 'two')`),
  ],
);

export const JevMbtiRateLimit = pgTable(
  "jev_mbti_rate_limit",
  {
    key: text("key").primaryKey(),
    requests: integer("requests").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("jev_mbti_rate_limit_expiry_idx").on(table.expiresAt)],
);
