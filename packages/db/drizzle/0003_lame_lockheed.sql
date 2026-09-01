CREATE TABLE "sushiro_queue_snapshot" (
	"store_id" integer NOT NULL,
	"collected_at" timestamp with time zone NOT NULL,
	"address" text NOT NULL,
	"area" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"name" text NOT NULL,
	"name_en" text NOT NULL,
	"net_ticket_status" text NOT NULL,
	"store_queue" jsonb NOT NULL,
	"store_status" text NOT NULL,
	"wait" integer NOT NULL,
	"waiting_group_counter" integer NOT NULL,
	"waiting_group_pair" integer NOT NULL,
	"waiting_group_table" integer NOT NULL,
	CONSTRAINT "sushiro_queue_snapshot_store_id_collected_at_pk" PRIMARY KEY("store_id","collected_at")
);
--> statement-breakpoint
CREATE INDEX "sushiro_queue_snapshot_store_collected_at_idx" ON "sushiro_queue_snapshot" USING btree ("store_id","collected_at");--> statement-breakpoint
CREATE INDEX "sushiro_queue_snapshot_collected_at_idx" ON "sushiro_queue_snapshot" USING btree ("collected_at");