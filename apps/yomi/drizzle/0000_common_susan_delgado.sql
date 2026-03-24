CREATE TYPE "public"."yomi_ai_type" AS ENUM('reading', 'grammar', 'vocabulary', 'quiz');--> statement-breakpoint
CREATE TYPE "public"."yomi_jlpt_level" AS ENUM('N5', 'N4', 'N3', 'N2', 'N1');--> statement-breakpoint
CREATE TYPE "public"."yomi_language" AS ENUM('ja', 'en', 'ko');--> statement-breakpoint
CREATE TABLE "yomi_ai_generation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"prompt" text NOT NULL,
	"response" text NOT NULL,
	"model" varchar(100) NOT NULL,
	"type" "yomi_ai_type" NOT NULL,
	"clip_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "yomi_clip_vocabulary" (
	"clip_id" uuid NOT NULL,
	"vocabulary_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "yomi_clip" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" varchar(256),
	"content" jsonb NOT NULL,
	"source_language" "yomi_language" DEFAULT 'ja' NOT NULL,
	"target_language" "yomi_language",
	"tags" text[],
	"jlpt_level" "yomi_jlpt_level",
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "yomi_study_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"vocabulary_id" uuid NOT NULL,
	"correct_count" integer DEFAULT 0 NOT NULL,
	"incorrect_count" integer DEFAULT 0 NOT NULL,
	"last_studied" timestamp with time zone,
	"next_review" timestamp with time zone,
	"ease" real DEFAULT 2.5 NOT NULL,
	"interval" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "yomi_vocabulary" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"word" varchar(255) NOT NULL,
	"reading" varchar(255),
	"meaning" text NOT NULL,
	"language" "yomi_language" DEFAULT 'ja' NOT NULL,
	"jlpt_level" "yomi_jlpt_level",
	"tags" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "yomi_ai_generation" ADD CONSTRAINT "yomi_ai_generation_clip_id_yomi_clip_id_fk" FOREIGN KEY ("clip_id") REFERENCES "public"."yomi_clip"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yomi_clip_vocabulary" ADD CONSTRAINT "yomi_clip_vocabulary_clip_id_yomi_clip_id_fk" FOREIGN KEY ("clip_id") REFERENCES "public"."yomi_clip"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yomi_clip_vocabulary" ADD CONSTRAINT "yomi_clip_vocabulary_vocabulary_id_yomi_vocabulary_id_fk" FOREIGN KEY ("vocabulary_id") REFERENCES "public"."yomi_vocabulary"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yomi_study_progress" ADD CONSTRAINT "yomi_study_progress_vocabulary_id_yomi_vocabulary_id_fk" FOREIGN KEY ("vocabulary_id") REFERENCES "public"."yomi_vocabulary"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "yomi_ai_user_id_idx" ON "yomi_ai_generation" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "yomi_ai_type_idx" ON "yomi_ai_generation" USING btree ("type");--> statement-breakpoint
CREATE INDEX "yomi_cv_clip_id_idx" ON "yomi_clip_vocabulary" USING btree ("clip_id");--> statement-breakpoint
CREATE INDEX "yomi_cv_vocabulary_id_idx" ON "yomi_clip_vocabulary" USING btree ("vocabulary_id");--> statement-breakpoint
CREATE INDEX "yomi_clip_user_id_idx" ON "yomi_clip" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "yomi_clip_created_at_idx" ON "yomi_clip" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "yomi_sp_user_id_idx" ON "yomi_study_progress" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "yomi_sp_next_review_idx" ON "yomi_study_progress" USING btree ("next_review");--> statement-breakpoint
CREATE INDEX "yomi_sp_vocab_id_idx" ON "yomi_study_progress" USING btree ("vocabulary_id");--> statement-breakpoint
CREATE INDEX "yomi_vocab_user_id_idx" ON "yomi_vocabulary" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "yomi_vocab_word_idx" ON "yomi_vocabulary" USING btree ("word");