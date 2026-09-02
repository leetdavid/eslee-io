import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export type SushiroStoreHoursSource = "google_maps" | "unavailable";

export const sushiroStoreHours = pgTable("sushiro_store_hours", {
  storeId: integer("store_id").primaryKey(),
  address: text("address").notNull(),
  name: text("name").notNull(),
  nameEn: text("name_en").notNull(),
  openingHours: jsonb("opening_hours").$type<string[]>().notNull(),
  phone: text("phone").notNull(),
  source: text("source").$type<SushiroStoreHoursSource>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});
