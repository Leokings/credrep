import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const sourcedMarkets = sqliteTable(
  "sourced_markets",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    question: text("question").notNull(),
    description: text("description").notNull(),
    category: text("category").notNull(),
    status: text("status").notNull().default("OPEN"),
    endAt: text("end_at").notNull(),
    sourceUrl: text("source_url").notNull(),
    volume24hr: integer("volume_24hr").notNull().default(0),
    fetchedAt: text("fetched_at").notNull(),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_sourced_markets_status_end").on(table.status, table.endAt),
    index("idx_sourced_markets_volume").on(table.volume24hr),
  ],
);

export const chainProfiles = sqliteTable(
  "chain_profiles",
  {
    contractAddress: text("contract_address").notNull(),
    walletAddress: text("wallet_address").notNull(),
    xHandle: text("x_handle").notNull(),
    identityStatus: text("identity_status").notNull(),
    xVerifiedUntil: integer("x_verified_until").notNull(),
    reputation: integer("reputation").notNull(),
    availableReputation: integer("available_reputation").notNull(),
    reputationAtRisk: integer("reputation_at_risk").notNull(),
    predictionsMade: integer("predictions_made").notNull(),
    openPredictions: integer("open_predictions").notNull(),
    resolvedPredictions: integer("resolved_predictions").notNull(),
    correctPredictions: integer("correct_predictions").notNull(),
    voidPredictions: integer("void_predictions").notNull(),
    accuracyBps: integer("accuracy_bps").notNull(),
    predictionScoreBps: integer("prediction_score_bps").notNull(),
    indexedAt: text("indexed_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.contractAddress, table.walletAddress] }),
    index("idx_chain_profiles_score").on(
      table.contractAddress,
      table.predictionScoreBps,
    ),
    index("idx_chain_profiles_predictions").on(
      table.contractAddress,
      table.predictionsMade,
    ),
  ],
);

export const chainMarkets = sqliteTable(
  "chain_markets",
  {
    contractAddress: text("contract_address").notNull(),
    marketId: text("market_id").notNull(),
    question: text("question").notNull(),
    description: text("description").notNull(),
    slug: text("slug").notNull(),
    sourceUrl: text("source_url").notNull(),
    endTimeUnix: integer("end_time_unix").notNull(),
    status: text("status").notNull(),
    outcome: text("outcome").notNull(),
    predictionCount: integer("prediction_count").notNull(),
    totalReputationStaked: integer("total_reputation_staked").notNull(),
    indexedAt: text("indexed_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.contractAddress, table.marketId] }),
    index("idx_chain_markets_status_end").on(
      table.contractAddress,
      table.status,
      table.endTimeUnix,
    ),
  ],
);

export const chainPositions = sqliteTable(
  "chain_positions",
  {
    contractAddress: text("contract_address").notNull(),
    walletAddress: text("wallet_address").notNull(),
    marketId: text("market_id").notNull(),
    prediction: text("prediction").notNull(),
    confidenceBps: integer("confidence_bps").notNull(),
    stake: integer("stake").notNull(),
    status: text("status").notNull(),
    scoreBps: integer("score_bps").notNull(),
    createdAt: text("created_at").notNull(),
    settledAt: text("settled_at").notNull(),
    indexedAt: text("indexed_at").notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.contractAddress, table.walletAddress, table.marketId],
    }),
    index("idx_chain_positions_activity").on(
      table.contractAddress,
      table.createdAt,
    ),
    index("idx_chain_positions_wallet").on(
      table.contractAddress,
      table.walletAddress,
      table.createdAt,
    ),
    index("idx_chain_positions_market").on(
      table.contractAddress,
      table.marketId,
      table.status,
    ),
  ],
);
