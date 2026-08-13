CREATE TABLE `claims` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`statement` text NOT NULL,
	`category` text NOT NULL,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`stake` integer NOT NULL,
	`resolution_at` text NOT NULL,
	`source_label` text NOT NULL,
	`source_url` text NOT NULL,
	`rules` text NOT NULL,
	`outcome` text,
	`payout` integer DEFAULT 0 NOT NULL,
	`contract_claim_id` text,
	`transaction_hash` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`resolved_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`user_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_claims_status_resolution` ON `claims` (`status`,`resolution_at`);--> statement-breakpoint
CREATE INDEX `idx_claims_category_status` ON `claims` (`category`,`status`);--> statement-breakpoint
CREATE INDEX `idx_claims_user_created` ON `claims` (`user_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `profiles` ADD `at_risk` integer DEFAULT 0 NOT NULL;