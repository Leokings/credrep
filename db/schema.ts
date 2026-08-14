import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const sourcedMarkets = pgTable(
  "sourced_markets",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    question: text("question").notNull(),
    description: text("description").notNull(),
    category: text("category").notNull(),
    status: text("status").notNull().default("OPEN"),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    sourceUrl: text("source_url").notNull(),
    volume24hr: integer("volume_24hr").notNull().default(0),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_sourced_markets_status_end").on(table.status, table.endAt),
    index("idx_sourced_markets_volume").on(table.volume24hr),
    check(
      "sourced_markets_status_check",
      sql`${table.status} in ('OPEN', 'CLOSED')`,
    ),
    check(
      "sourced_markets_volume_check",
      sql`${table.volume24hr} >= 0`,
    ),
  ],
);

export const chainProfiles = pgTable(
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
    indexedAt: timestamp("indexed_at", { withTimezone: true }).notNull(),
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
    check(
      "chain_profiles_identity_status_check",
      sql`${table.identityStatus} in ('UNBOUND', 'PENDING', 'VERIFIED', 'GRACE', 'STALE')`,
    ),
    check(
      "chain_profiles_reputation_check",
      sql`${table.reputation} >= 0 and ${table.availableReputation} >= 0 and ${table.reputationAtRisk} >= 0`,
    ),
    check(
      "chain_profiles_score_check",
      sql`${table.accuracyBps} between 0 and 10000 and ${table.predictionScoreBps} between 0 and 10000`,
    ),
  ],
);

export const chainMarkets = pgTable(
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
    indexedAt: timestamp("indexed_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.contractAddress, table.marketId] }),
    index("idx_chain_markets_status_end").on(
      table.contractAddress,
      table.status,
      table.endTimeUnix,
    ),
    check(
      "chain_markets_status_check",
      sql`${table.status} in ('OPEN', 'RESOLVED', 'VOID')`,
    ),
    check(
      "chain_markets_outcome_check",
      sql`${table.outcome} in ('', 'YES', 'NO', 'VOID')`,
    ),
    check(
      "chain_markets_counts_check",
      sql`${table.endTimeUnix} >= 0 and ${table.predictionCount} >= 0 and ${table.totalReputationStaked} >= 0`,
    ),
  ],
);

export const chainPositions = pgTable(
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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    settledAt: timestamp("settled_at", { withTimezone: true }),
    indexedAt: timestamp("indexed_at", { withTimezone: true }).notNull(),
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
    check(
      "chain_positions_prediction_check",
      sql`${table.prediction} in ('YES', 'NO')`,
    ),
    check(
      "chain_positions_status_check",
      sql`${table.status} in ('OPEN', 'WON', 'LOST', 'VOID')`,
    ),
    check(
      "chain_positions_values_check",
      sql`${table.confidenceBps} between 5000 and 9500 and ${table.stake} > 0 and ${table.scoreBps} between 0 and 10000`,
    ),
  ],
);

export const walletIndexChallenges = pgTable(
  "wallet_index_challenges",
  {
    walletAddress: text("wallet_address").primaryKey(),
    nonce: text("nonce").notNull(),
    message: text("message").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_wallet_index_challenges_expiry").on(table.expiresAt)],
);

export const apiRateLimits = pgTable(
  "api_rate_limits",
  {
    id: text("id").primaryKey(),
    scope: text("scope").notNull(),
    subjectHash: text("subject_hash").notNull(),
    windowStartedAt: timestamp("window_started_at", {
      withTimezone: true,
    }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(1),
  },
  (table) => [
    index("idx_api_rate_limits_expiry").on(table.expiresAt),
    index("idx_api_rate_limits_scope_subject").on(
      table.scope,
      table.subjectHash,
    ),
    check("api_rate_limits_count_check", sql`${table.count} > 0`),
  ],
);
