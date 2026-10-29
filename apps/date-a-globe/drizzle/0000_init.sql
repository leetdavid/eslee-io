CREATE TABLE "date_a_globe_event" (
	"id" varchar(80) PRIMARY KEY NOT NULL,
	"status" varchar(10) NOT NULL,
	"title" text NOT NULL,
	"kind" varchar(10) NOT NULL,
	"question" text NOT NULL,
	"hint" text NOT NULL,
	"spans" jsonb NOT NULL,
	"region" varchar(16) NOT NULL,
	"lat" double precision NOT NULL,
	"lon" double precision NOT NULL,
	"size" varchar(6) NOT NULL,
	"regional" boolean DEFAULT false NOT NULL,
	"sources" jsonb NOT NULL,
	"notes" text,
	"origin" varchar(10) NOT NULL,
	"sender_name" text,
	"sender_key" varchar(64),
	"checks" jsonb,
	"review_note" text,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"trial_answers" integer DEFAULT 0 NOT NULL,
	"trial_agreements" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "date_a_globe_event_status" CHECK ("date_a_globe_event"."status" IN ('waiting', 'trial', 'live', 'rejected')),
	CONSTRAINT "date_a_globe_event_kind" CHECK ("date_a_globe_event"."kind" IN ('country', 'border', 'rename', 'water', 'city', 'discovery')),
	CONSTRAINT "date_a_globe_event_size" CHECK ("date_a_globe_event"."size" IN ('easy', 'medium', 'hard')),
	CONSTRAINT "date_a_globe_event_origin" CHECK ("date_a_globe_event"."origin" IN ('research', 'submission'))
);
--> statement-breakpoint
CREATE TABLE "date_a_globe_maintainer" (
	"user_id" text PRIMARY KEY NOT NULL,
	"login" text NOT NULL,
	"is_maintainer" boolean NOT NULL,
	"checked_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "date_a_globe_play" (
	"id" varchar(12) PRIMARY KEY NOT NULL,
	"setup" jsonb NOT NULL,
	"turns" jsonb NOT NULL,
	"result" jsonb NOT NULL,
	"era" varchar(10) NOT NULL,
	"printed_year" integer,
	"printed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "date_a_globe_play_printed_year" CHECK ("date_a_globe_play"."printed_year" IS NULL OR ("date_a_globe_play"."printed_year" >= 1700 AND "date_a_globe_play"."printed_year" <= 2100))
);
--> statement-breakpoint
CREATE TABLE "date_a_globe_rate_limit" (
	"key" varchar(96) PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "date_a_globe_event_status_idx" ON "date_a_globe_event" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "date_a_globe_event_sender_idx" ON "date_a_globe_event" USING btree ("sender_key","created_at");--> statement-breakpoint
CREATE INDEX "date_a_globe_play_created_idx" ON "date_a_globe_play" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "date_a_globe_rate_limit_expiry_idx" ON "date_a_globe_rate_limit" USING btree ("expires_at");