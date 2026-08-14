CREATE TABLE "api_rate_limits" (
	"id" text PRIMARY KEY NOT NULL,
	"scope" text NOT NULL,
	"subject_hash" text NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "api_rate_limits_count_check" CHECK ("api_rate_limits"."count" > 0)
);
--> statement-breakpoint
CREATE TABLE "chain_markets" (
	"contract_address" text NOT NULL,
	"market_id" text NOT NULL,
	"question" text NOT NULL,
	"description" text NOT NULL,
	"slug" text NOT NULL,
	"source_url" text NOT NULL,
	"end_time_unix" integer NOT NULL,
	"status" text NOT NULL,
	"outcome" text NOT NULL,
	"prediction_count" integer NOT NULL,
	"total_reputation_staked" integer NOT NULL,
	"indexed_at" timestamp with time zone NOT NULL,
	CONSTRAINT "chain_markets_contract_address_market_id_pk" PRIMARY KEY("contract_address","market_id"),
	CONSTRAINT "chain_markets_status_check" CHECK ("chain_markets"."status" in ('OPEN', 'RESOLVED', 'VOID')),
	CONSTRAINT "chain_markets_outcome_check" CHECK ("chain_markets"."outcome" in ('', 'YES', 'NO', 'VOID')),
	CONSTRAINT "chain_markets_counts_check" CHECK ("chain_markets"."end_time_unix" >= 0 and "chain_markets"."prediction_count" >= 0 and "chain_markets"."total_reputation_staked" >= 0)
);
--> statement-breakpoint
CREATE TABLE "chain_positions" (
	"contract_address" text NOT NULL,
	"wallet_address" text NOT NULL,
	"market_id" text NOT NULL,
	"prediction" text NOT NULL,
	"confidence_bps" integer NOT NULL,
	"stake" integer NOT NULL,
	"status" text NOT NULL,
	"score_bps" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"settled_at" timestamp with time zone,
	"indexed_at" timestamp with time zone NOT NULL,
	CONSTRAINT "chain_positions_contract_address_wallet_address_market_id_pk" PRIMARY KEY("contract_address","wallet_address","market_id"),
	CONSTRAINT "chain_positions_prediction_check" CHECK ("chain_positions"."prediction" in ('YES', 'NO')),
	CONSTRAINT "chain_positions_status_check" CHECK ("chain_positions"."status" in ('OPEN', 'WON', 'LOST', 'VOID')),
	CONSTRAINT "chain_positions_values_check" CHECK ("chain_positions"."confidence_bps" between 5000 and 9500 and "chain_positions"."stake" > 0 and "chain_positions"."score_bps" between 0 and 10000)
);
--> statement-breakpoint
CREATE TABLE "chain_profiles" (
	"contract_address" text NOT NULL,
	"wallet_address" text NOT NULL,
	"x_handle" text NOT NULL,
	"identity_status" text NOT NULL,
	"x_verified_until" integer NOT NULL,
	"reputation" integer NOT NULL,
	"available_reputation" integer NOT NULL,
	"reputation_at_risk" integer NOT NULL,
	"predictions_made" integer NOT NULL,
	"open_predictions" integer NOT NULL,
	"resolved_predictions" integer NOT NULL,
	"correct_predictions" integer NOT NULL,
	"void_predictions" integer NOT NULL,
	"accuracy_bps" integer NOT NULL,
	"prediction_score_bps" integer NOT NULL,
	"indexed_at" timestamp with time zone NOT NULL,
	CONSTRAINT "chain_profiles_contract_address_wallet_address_pk" PRIMARY KEY("contract_address","wallet_address"),
	CONSTRAINT "chain_profiles_identity_status_check" CHECK ("chain_profiles"."identity_status" in ('UNBOUND', 'PENDING', 'VERIFIED', 'GRACE', 'STALE')),
	CONSTRAINT "chain_profiles_reputation_check" CHECK ("chain_profiles"."reputation" >= 0 and "chain_profiles"."available_reputation" >= 0 and "chain_profiles"."reputation_at_risk" >= 0),
	CONSTRAINT "chain_profiles_score_check" CHECK ("chain_profiles"."accuracy_bps" between 0 and 10000 and "chain_profiles"."prediction_score_bps" between 0 and 10000)
);
--> statement-breakpoint
CREATE TABLE "sourced_markets" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"question" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"source_url" text NOT NULL,
	"volume_24hr" integer DEFAULT 0 NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sourced_markets_status_check" CHECK ("sourced_markets"."status" in ('OPEN', 'CLOSED')),
	CONSTRAINT "sourced_markets_volume_check" CHECK ("sourced_markets"."volume_24hr" >= 0)
);
--> statement-breakpoint
CREATE TABLE "wallet_index_challenges" (
	"wallet_address" text PRIMARY KEY NOT NULL,
	"nonce" text NOT NULL,
	"message" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_api_rate_limits_expiry" ON "api_rate_limits" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_api_rate_limits_scope_subject" ON "api_rate_limits" USING btree ("scope","subject_hash");--> statement-breakpoint
CREATE INDEX "idx_chain_markets_status_end" ON "chain_markets" USING btree ("contract_address","status","end_time_unix");--> statement-breakpoint
CREATE INDEX "idx_chain_positions_activity" ON "chain_positions" USING btree ("contract_address","created_at");--> statement-breakpoint
CREATE INDEX "idx_chain_positions_wallet" ON "chain_positions" USING btree ("contract_address","wallet_address","created_at");--> statement-breakpoint
CREATE INDEX "idx_chain_positions_market" ON "chain_positions" USING btree ("contract_address","market_id","status");--> statement-breakpoint
CREATE INDEX "idx_chain_profiles_score" ON "chain_profiles" USING btree ("contract_address","prediction_score_bps");--> statement-breakpoint
CREATE INDEX "idx_chain_profiles_predictions" ON "chain_profiles" USING btree ("contract_address","predictions_made");--> statement-breakpoint
CREATE INDEX "idx_sourced_markets_status_end" ON "sourced_markets" USING btree ("status","end_at");--> statement-breakpoint
CREATE INDEX "idx_sourced_markets_volume" ON "sourced_markets" USING btree ("volume_24hr");--> statement-breakpoint
CREATE INDEX "idx_wallet_index_challenges_expiry" ON "wallet_index_challenges" USING btree ("expires_at");