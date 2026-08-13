import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const profiles = sqliteTable(
  "profiles",
  {
    userId: text("user_id").primaryKey(),
    displayName: text("display_name").notNull(),
    handle: text("handle").notNull(),
    credits: integer("credits").notNull().default(100),
    overallRating: integer("overall_rating").notNull().default(500),
    totalForecasts: integer("total_forecasts").notNull().default(0),
    resolvedForecasts: integer("resolved_forecasts").notNull().default(0),
    correctForecasts: integer("correct_forecasts").notNull().default(0),
    brierTotal: integer("brier_total").notNull().default(0),
    joinedAt: text("joined_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_profiles_handle").on(table.handle),
    index("idx_profiles_rating").on(table.overallRating),
  ],
);

export const markets = sqliteTable(
  "markets",
  {
    id: text("id").primaryKey(),
    eyebrow: text("eyebrow").notNull(),
    question: text("question").notNull(),
    category: text("category").notNull(),
    status: text("status").notNull().default("OPEN"),
    lockAt: text("lock_at").notNull(),
    resolutionAt: text("resolution_at").notNull(),
    sourceLabel: text("source_label").notNull(),
    rules: text("rules").notNull(),
    yesProbabilityBps: integer("yes_probability_bps").notNull(),
    volume: integer("volume").notNull().default(0),
    forecasters: integer("forecasters").notNull().default(0),
    signal: text("signal").notNull().default("Steady"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_markets_status_lock").on(table.status, table.lockAt),
    index("idx_markets_category_status").on(table.category, table.status),
  ],
);

export const forecasts = sqliteTable(
  "forecasts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    marketId: text("market_id")
      .notNull()
      .references(() => markets.id),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.userId),
    outcome: text("outcome").notNull(),
    confidenceBps: integer("confidence_bps").notNull(),
    yesProbabilityBps: integer("yes_probability_bps").notNull(),
    stake: integer("stake").notNull(),
    status: text("status").notNull().default("OPEN"),
    resolutionTx: text("resolution_tx"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_forecasts_user_market").on(table.userId, table.marketId),
    index("idx_forecasts_market_status").on(table.marketId, table.status),
    index("idx_forecasts_user_created").on(table.userId, table.createdAt),
  ],
);

export const topicRatings = sqliteTable(
  "topic_ratings",
  {
    userId: text("user_id")
      .notNull()
      .references(() => profiles.userId),
    category: text("category").notNull(),
    rating: integer("rating").notNull().default(500),
    resolvedCount: integer("resolved_count").notNull().default(0),
    correctCount: integer("correct_count").notNull().default(0),
    brierTotal: integer("brier_total").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.category] }),
    index("idx_topic_ratings_category_rating").on(table.category, table.rating),
  ],
);
