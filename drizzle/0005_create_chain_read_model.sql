CREATE TABLE `chain_markets` (
	`contract_address` text NOT NULL,
	`market_id` text NOT NULL,
	`question` text NOT NULL,
	`description` text NOT NULL,
	`slug` text NOT NULL,
	`source_url` text NOT NULL,
	`end_time_unix` integer NOT NULL,
	`status` text NOT NULL,
	`outcome` text NOT NULL,
	`prediction_count` integer NOT NULL,
	`total_reputation_staked` integer NOT NULL,
	`indexed_at` text NOT NULL,
	PRIMARY KEY(`contract_address`, `market_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_chain_markets_status_end` ON `chain_markets` (`contract_address`,`status`,`end_time_unix`);--> statement-breakpoint
CREATE TABLE `chain_positions` (
	`contract_address` text NOT NULL,
	`wallet_address` text NOT NULL,
	`market_id` text NOT NULL,
	`prediction` text NOT NULL,
	`confidence_bps` integer NOT NULL,
	`stake` integer NOT NULL,
	`status` text NOT NULL,
	`score_bps` integer NOT NULL,
	`created_at` text NOT NULL,
	`settled_at` text NOT NULL,
	`indexed_at` text NOT NULL,
	PRIMARY KEY(`contract_address`, `wallet_address`, `market_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_chain_positions_activity` ON `chain_positions` (`contract_address`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_chain_positions_wallet` ON `chain_positions` (`contract_address`,`wallet_address`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_chain_positions_market` ON `chain_positions` (`contract_address`,`market_id`,`status`);--> statement-breakpoint
CREATE TABLE `chain_profiles` (
	`contract_address` text NOT NULL,
	`wallet_address` text NOT NULL,
	`x_handle` text NOT NULL,
	`identity_status` text NOT NULL,
	`x_verified_until` integer NOT NULL,
	`reputation` integer NOT NULL,
	`available_reputation` integer NOT NULL,
	`reputation_at_risk` integer NOT NULL,
	`predictions_made` integer NOT NULL,
	`open_predictions` integer NOT NULL,
	`resolved_predictions` integer NOT NULL,
	`correct_predictions` integer NOT NULL,
	`void_predictions` integer NOT NULL,
	`accuracy_bps` integer NOT NULL,
	`prediction_score_bps` integer NOT NULL,
	`indexed_at` text NOT NULL,
	PRIMARY KEY(`contract_address`, `wallet_address`)
);
--> statement-breakpoint
CREATE INDEX `idx_chain_profiles_score` ON `chain_profiles` (`contract_address`,`prediction_score_bps`);--> statement-breakpoint
CREATE INDEX `idx_chain_profiles_predictions` ON `chain_profiles` (`contract_address`,`predictions_made`);