CREATE TABLE "sushiro_ticket_alert" (
	"report_id" uuid PRIMARY KEY NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"language" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"near_sent_at" timestamp with time zone,
	"due_sent_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "sushiro_ticket_alert" ADD CONSTRAINT "sushiro_ticket_alert_report_id_sushiro_ticket_report_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."sushiro_ticket_report"("id") ON DELETE cascade ON UPDATE no action;