CREATE TABLE "jev_mbti_chart" (
	"id" varchar(12) PRIMARY KEY NOT NULL,
	"reuse_key" varchar(64) NOT NULL,
	"question" text NOT NULL,
	"question_identity" text NOT NULL,
	"question_language" varchar(2) NOT NULL,
	"requested_mode" varchar(4) NOT NULL,
	"plot" jsonb NOT NULL,
	"jev_model" text NOT NULL,
	"review_status" varchar(8) DEFAULT 'pending' NOT NULL,
	"review" jsonb,
	"review_model" text,
	"review_started_at" timestamp with time zone,
	"review_completed_at" timestamp with time zone,
	"is_example" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "jev_mbti_chart_reuse_key_unique" UNIQUE("reuse_key"),
	CONSTRAINT "jev_mbti_chart_review_status" CHECK ("jev_mbti_chart"."review_status" IN ('pending', 'running', 'complete', 'failed')),
	CONSTRAINT "jev_mbti_chart_language" CHECK ("jev_mbti_chart"."question_language" IN ('ko', 'en')),
	CONSTRAINT "jev_mbti_chart_mode" CHECK ("jev_mbti_chart"."requested_mode" IN ('auto', 'one', 'two'))
);
--> statement-breakpoint
CREATE TABLE "jev_mbti_rate_limit" (
	"key" text PRIMARY KEY NOT NULL,
	"requests" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "jev_mbti_chart_example_idx" ON "jev_mbti_chart" USING btree ("is_example","created_at");--> statement-breakpoint
CREATE INDEX "jev_mbti_rate_limit_expiry_idx" ON "jev_mbti_rate_limit" USING btree ("expires_at");