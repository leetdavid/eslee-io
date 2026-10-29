import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

// Date a Globe owns an isolated database. These tables are deliberately not part
// of the shared schema index.

/** Every event: researched ones, and submissions from waiting through trial to live or rejected. */
export const DateAGlobeEvent = pgTable(
  "date_a_globe_event",
  {
    id: varchar("id", { length: 80 }).primaryKey(),
    status: varchar("status", { length: 10 }).notNull(),
    title: text("title").notNull(),
    kind: varchar("kind", { length: 10 }).notNull(),
    question: text("question").notNull(),
    hint: text("hint").notNull(),
    // [{ from: "YYYY[-MM]", until: "YYYY[-MM]" | null }], validated by the app.
    spans: jsonb("spans").notNull(),
    region: varchar("region", { length: 16 }).notNull(),
    lat: doublePrecision("lat").notNull(),
    lon: doublePrecision("lon").notNull(),
    size: varchar("size", { length: 6 }).notNull(),
    regional: boolean("regional").notNull().default(false),
    // [{ url, says }]
    sources: jsonb("sources").notNull(),
    notes: text("notes"),
    origin: varchar("origin", { length: 10 }).notNull(),
    senderName: text("sender_name"),
    // HMAC of the sender's address, only to cap submissions; never the address itself.
    senderKey: varchar("sender_key", { length: 64 }),
    // The automatic checks' results, shown in the review queue.
    checks: jsonb("checks"),
    reviewNote: text("review_note"),
    reviewedBy: text("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    trialAnswers: integer("trial_answers").notNull().default(0),
    trialAgreements: integer("trial_agreements").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("date_a_globe_event_status_idx").on(table.status, table.createdAt),
    index("date_a_globe_event_sender_idx").on(table.senderKey, table.createdAt),
    check(
      "date_a_globe_event_status",
      sql`${table.status} IN ('waiting', 'trial', 'live', 'rejected')`,
    ),
    check(
      "date_a_globe_event_kind",
      sql`${table.kind} IN ('country', 'border', 'rename', 'water', 'city', 'discovery')`,
    ),
    check("date_a_globe_event_size", sql`${table.size} IN ('easy', 'medium', 'hard')`),
    check("date_a_globe_event_origin", sql`${table.origin} IN ('research', 'submission')`),
  ],
);

/** One finished game. Its id is the share link; nothing in it identifies the player. */
export const DateAGlobePlay = pgTable(
  "date_a_globe_play",
  {
    id: varchar("id", { length: 12 }).primaryKey(),
    setup: jsonb("setup").notNull(),
    // [{ eventId, answer, reason }]
    turns: jsonb("turns").notNull(),
    // The result as the engine worked it out on the server.
    result: jsonb("result").notNull(),
    era: varchar("era", { length: 10 }).notNull(),
    printedYear: integer("printed_year"),
    printedAt: timestamp("printed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("date_a_globe_play_created_idx").on(table.createdAt),
    check(
      "date_a_globe_play_printed_year",
      sql`${table.printedYear} IS NULL OR (${table.printedYear} >= 1700 AND ${table.printedYear} <= 2100)`,
    ),
  ],
);

/** Fixed-window counters for submissions and saved games, keyed by an HMAC of the address. */
export const DateAGlobeRateLimit = pgTable(
  "date_a_globe_rate_limit",
  {
    key: varchar("key", { length: 96 }).primaryKey(),
    count: integer("count").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("date_a_globe_rate_limit_expiry_idx").on(table.expiresAt)],
);

/** Whether a signed-in GitHub account may review, rechecked against the repository every hour. */
export const DateAGlobeMaintainer = pgTable("date_a_globe_maintainer", {
  userId: text("user_id").primaryKey(),
  login: text("login").notNull(),
  isMaintainer: boolean("is_maintainer").notNull(),
  checkedAt: timestamp("checked_at", { withTimezone: true }).notNull(),
});
