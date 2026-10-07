import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const GameMatchup = pgTable(
  "game_matchup",
  {
    cacheKey: varchar("cache_key", { length: 64 }).primaryKey(),
    challenge: text("challenge").notNull(),
    answer: text("answer").notNull(),
    beats: boolean("beats").notNull(),
    confidence: doublePrecision("confidence").notNull(),
    probabilityBeats: doublePrecision("probability_beats").notNull(),
    model: text("model").notNull(),
    judgeVersion: text("judge_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check(
      "game_matchup_confidence_range",
      sql`${table.confidence} >= 0 AND ${table.confidence} <= 1`,
    ),
    check(
      "game_matchup_probability_range",
      sql`${table.probabilityBeats} >= 0 AND ${table.probabilityBeats} <= 1`,
    ),
  ],
);

export const GameRateLimit = pgTable(
  "game_rate_limit",
  {
    key: text("key").primaryKey(),
    requests: integer("requests").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("game_rate_limit_expiry_idx").on(table.expiresAt)],
);
