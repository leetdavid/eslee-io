import {
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const sushiroQueueSnapshot = pgTable(
  "sushiro_queue_snapshot",
  {
    storeId: integer("store_id").notNull(),
    collectedAt: timestamp("collected_at", { withTimezone: true }).notNull(),
    address: text("address").notNull(),
    area: text("area").notNull(),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    name: text("name").notNull(),
    nameEn: text("name_en").notNull(),
    netTicketStatus: text("net_ticket_status").notNull(),
    storeQueue: jsonb("store_queue").$type<Array<number | string>>().notNull(),
    storeStatus: text("store_status").notNull(),
    wait: integer("wait").notNull(),
    waitingGroupCounter: integer("waiting_group_counter").notNull(),
    waitingGroupPair: integer("waiting_group_pair").notNull(),
    waitingGroupTable: integer("waiting_group_table").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.storeId, table.collectedAt] }),
    index("sushiro_queue_snapshot_collected_at_idx").on(table.collectedAt),
  ],
);
