import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sushiroTicketReport } from "./sushiro-ticket-report-schema";

// Where to push a tracked ticket's alerts, so they reach a locked phone. A ticket report belongs
// to one browser, so it has at most one row. Rows are removed once the ticket's day is over.
export const sushiroTicketAlert = pgTable("sushiro_ticket_alert", {
  reportId: uuid("report_id")
    .primaryKey()
    .references(() => sushiroTicketReport.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  language: text("language").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  nearSentAt: timestamp("near_sent_at", { withTimezone: true }),
  dueSentAt: timestamp("due_sent_at", { withTimezone: true }),
});
