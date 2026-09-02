CREATE TABLE "sushiro_store_hours" (
	"store_id" integer PRIMARY KEY NOT NULL,
	"address" text NOT NULL,
	"name" text NOT NULL,
	"name_en" text NOT NULL,
	"opening_hours" jsonb NOT NULL,
	"phone" text NOT NULL,
	"source" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
