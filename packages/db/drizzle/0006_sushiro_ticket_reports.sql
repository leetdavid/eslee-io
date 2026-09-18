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
CREATE UNIQUE INDEX "sushiro_ticket_report_owner_ticket_idx" ON "sushiro_ticket_report" USING btree ("owner_hash","store_id","queue_date","ticket_key");--> statement-breakpoint
CREATE INDEX "sushiro_ticket_report_tracking_idx" ON "sushiro_ticket_report" USING btree ("queue_date","first_seen_called_at");