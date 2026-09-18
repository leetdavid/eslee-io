import {
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const sushiroTicketReport = pgTable(
  "sushiro_ticket_report",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerHash: text("owner_hash").notNull(),
    storeId: integer("store_id").notNull(),
    storeName: text("store_name").notNull(),
    storeNameEn: text("store_name_en").notNull(),
    ticketNumber: text("ticket_number").notNull(),
    ticketKey: text("ticket_key").notNull(),
    queueDate: date("queue_date").notNull(),
    takenAt: timestamp("taken_at", { withTimezone: true }).notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    calledAt: timestamp("called_at", { withTimezone: true }),
    callReportedAt: timestamp("call_reported_at", { withTimezone: true }),
    firstSeenCalledAt: timestamp("first_seen_called_at", { withTimezone: true }),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    leftAt: timestamp("left_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("sushiro_ticket_report_owner_ticket_idx").on(
      table.ownerHash,
      table.storeId,
      table.queueDate,
      table.ticketKey,
    ),
    index("sushiro_ticket_report_tracking_idx").on(table.queueDate, table.firstSeenCalledAt),
  ],
);
