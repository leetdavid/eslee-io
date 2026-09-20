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
--> statement-breakpoint
CREATE TABLE "sushiro_ticket_report" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_hash" text NOT NULL,
	"store_id" integer NOT NULL,
	"store_name" text NOT NULL,
	"store_name_en" text NOT NULL,
	"ticket_number" text NOT NULL,
	"ticket_key" text NOT NULL,
	"queue_date" date NOT NULL,
	"taken_at" timestamp with time zone NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"called_at" timestamp with time zone,
	"call_reported_at" timestamp with time zone,
	"first_seen_called_at" timestamp with time zone,
	"last_checked_at" timestamp with time zone,
	"left_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "sushiro_queue_snapshot_collected_at_idx" ON "sushiro_queue_snapshot" USING btree ("collected_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sushiro_ticket_report_owner_ticket_idx" ON "sushiro_ticket_report" USING btree ("owner_hash","store_id","queue_date","ticket_key");--> statement-breakpoint
CREATE INDEX "sushiro_ticket_report_tracking_idx" ON "sushiro_ticket_report" USING btree ("queue_date","first_seen_called_at");