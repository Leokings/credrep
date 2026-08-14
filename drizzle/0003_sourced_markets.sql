CREATE TABLE `sourced_markets` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`question` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`end_at` text NOT NULL,
	`source_url` text NOT NULL,
	`volume_24hr` integer DEFAULT 0 NOT NULL,
	`fetched_at` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_sourced_markets_status_end` ON `sourced_markets` (`status`,`end_at`);--> statement-breakpoint
CREATE INDEX `idx_sourced_markets_volume` ON `sourced_markets` (`volume_24hr`);--> statement-breakpoint
DELETE FROM `claims` WHERE `user_id` LIKE 'seed-%';--> statement-breakpoint
DELETE FROM `profiles` WHERE `user_id` LIKE 'seed-%';
