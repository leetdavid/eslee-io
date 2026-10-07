CREATE TABLE "game_matchup" (
	"cache_key" varchar(64) PRIMARY KEY NOT NULL,
	"challenge" text NOT NULL,
	"answer" text NOT NULL,
	"beats" boolean NOT NULL,
	"confidence" double precision NOT NULL,
	"probability_beats" double precision NOT NULL,
	"model" text NOT NULL,
	"judge_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "game_matchup_confidence_range" CHECK ("game_matchup"."confidence" >= 0 AND "game_matchup"."confidence" <= 1),
	CONSTRAINT "game_matchup_probability_range" CHECK ("game_matchup"."probability_beats" >= 0 AND "game_matchup"."probability_beats" <= 1)
);
--> statement-breakpoint
CREATE TABLE "game_rate_limit" (
	"key" text PRIMARY KEY NOT NULL,
	"requests" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "game_rate_limit_expiry_idx" ON "game_rate_limit" USING btree ("expires_at");