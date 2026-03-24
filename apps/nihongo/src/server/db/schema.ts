import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTableCreator,
  real,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const createTable = pgTableCreator((name) => `yomi_${name}`);

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const languageEnum = pgEnum("yomi_language", ["ja", "en", "ko"]);
export const jlptLevelEnum = pgEnum("yomi_jlpt_level", ["N5", "N4", "N3", "N2", "N1"]);
export const aiTypeEnum = pgEnum("yomi_ai_type", ["reading", "grammar", "vocabulary", "quiz"]);

// ---------------------------------------------------------------------------
// Clips
// ---------------------------------------------------------------------------

export const clips = createTable(
  "clip",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    title: varchar("title", { length: 256 }),
    content: jsonb("content").notNull(), // Tiptap JSON document
    sourceLanguage: languageEnum("source_language").notNull().default("ja"),
    targetLanguage: languageEnum("target_language"),
    tags: text("tags").array(),
    jlptLevel: jlptLevelEnum("jlpt_level"),
    isPublic: boolean("is_public").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdIdx: index("yomi_clip_user_id_idx").on(table.userId),
    createdAtIdx: index("yomi_clip_created_at_idx").on(table.createdAt),
  }),
);

export const clipRelations = relations(clips, ({ many }) => ({
  clipVocabulary: many(clipVocabulary),
}));

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

export const vocabulary = createTable(
  "vocabulary",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    word: varchar("word", { length: 255 }).notNull(),
    reading: varchar("reading", { length: 255 }), // furigana
    meaning: text("meaning").notNull(),
    language: languageEnum("language").notNull().default("ja"),
    jlptLevel: jlptLevelEnum("jlpt_level"),
    tags: text("tags").array(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdIdx: index("yomi_vocab_user_id_idx").on(table.userId),
    wordIdx: index("yomi_vocab_word_idx").on(table.word),
  }),
);

export const vocabularyRelations = relations(vocabulary, ({ many, one }) => ({
  clipVocabulary: many(clipVocabulary),
  studyProgress: one(studyProgress),
}));

// ---------------------------------------------------------------------------
// Clip-Vocabulary Junction
// ---------------------------------------------------------------------------

export const clipVocabulary = createTable(
  "clip_vocabulary",
  {
    clipId: uuid("clip_id")
      .notNull()
      .references(() => clips.id, { onDelete: "cascade" }),
    vocabularyId: uuid("vocabulary_id")
      .notNull()
      .references(() => vocabulary.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
  },
  (table) => ({
    clipIdIdx: index("yomi_cv_clip_id_idx").on(table.clipId),
    vocabularyIdIdx: index("yomi_cv_vocabulary_id_idx").on(table.vocabularyId),
  }),
);

export const clipVocabularyRelations = relations(clipVocabulary, ({ one }) => ({
  clip: one(clips, {
    fields: [clipVocabulary.clipId],
    references: [clips.id],
  }),
  vocabulary: one(vocabulary, {
    fields: [clipVocabulary.vocabularyId],
    references: [vocabulary.id],
  }),
}));

// ---------------------------------------------------------------------------
// Study Progress (SRS)
// ---------------------------------------------------------------------------

export const studyProgress = createTable(
  "study_progress",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    vocabularyId: uuid("vocabulary_id")
      .notNull()
      .references(() => vocabulary.id, { onDelete: "cascade" }),
    correctCount: integer("correct_count").notNull().default(0),
    incorrectCount: integer("incorrect_count").notNull().default(0),
    lastStudied: timestamp("last_studied", { withTimezone: true }),
    nextReview: timestamp("next_review", { withTimezone: true }),
    ease: real("ease").notNull().default(2.5),
    interval: integer("interval").notNull().default(0), // in days
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdIdx: index("yomi_sp_user_id_idx").on(table.userId),
    nextReviewIdx: index("yomi_sp_next_review_idx").on(table.nextReview),
    vocabIdIdx: index("yomi_sp_vocab_id_idx").on(table.vocabularyId),
  }),
);

export const studyProgressRelations = relations(studyProgress, ({ one }) => ({
  vocabulary: one(vocabulary, {
    fields: [studyProgress.vocabularyId],
    references: [vocabulary.id],
  }),
}));

// ---------------------------------------------------------------------------
// AI Generations
// ---------------------------------------------------------------------------

export const aiGenerations = createTable(
  "ai_generation",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    prompt: text("prompt").notNull(),
    response: text("response").notNull(),
    model: varchar("model", { length: 100 }).notNull(),
    type: aiTypeEnum("type").notNull(),
    clipId: uuid("clip_id").references(() => clips.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("yomi_ai_user_id_idx").on(table.userId),
    typeIdx: index("yomi_ai_type_idx").on(table.type),
  }),
);

export const aiGenerationRelations = relations(aiGenerations, ({ one }) => ({
  clip: one(clips, {
    fields: [aiGenerations.clipId],
    references: [clips.id],
  }),
}));
