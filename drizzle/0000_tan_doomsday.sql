CREATE TABLE `forecasts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`market_id` text NOT NULL,
	`user_id` text NOT NULL,
	`outcome` text NOT NULL,
	`confidence_bps` integer NOT NULL,
	`yes_probability_bps` integer NOT NULL,
	`stake` integer NOT NULL,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`resolution_tx` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`market_id`) REFERENCES `markets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`user_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_forecasts_user_market` ON `forecasts` (`user_id`,`market_id`);--> statement-breakpoint
CREATE INDEX `idx_forecasts_market_status` ON `forecasts` (`market_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_forecasts_user_created` ON `forecasts` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `markets` (
	`id` text PRIMARY KEY NOT NULL,
	`eyebrow` text NOT NULL,
	`question` text NOT NULL,
	`category` text NOT NULL,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`lock_at` text NOT NULL,
	`resolution_at` text NOT NULL,
	`source_label` text NOT NULL,
	`rules` text NOT NULL,
	`yes_probability_bps` integer NOT NULL,
	`volume` integer DEFAULT 0 NOT NULL,
	`forecasters` integer DEFAULT 0 NOT NULL,
	`signal` text DEFAULT 'Steady' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_markets_status_lock` ON `markets` (`status`,`lock_at`);--> statement-breakpoint
CREATE INDEX `idx_markets_category_status` ON `markets` (`category`,`status`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`handle` text NOT NULL,
	`credits` integer DEFAULT 100 NOT NULL,
	`overall_rating` integer DEFAULT 500 NOT NULL,
	`total_forecasts` integer DEFAULT 0 NOT NULL,
	`resolved_forecasts` integer DEFAULT 0 NOT NULL,
	`correct_forecasts` integer DEFAULT 0 NOT NULL,
	`brier_total` integer DEFAULT 0 NOT NULL,
	`joined_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_profiles_handle` ON `profiles` (`handle`);--> statement-breakpoint
CREATE INDEX `idx_profiles_rating` ON `profiles` (`overall_rating`);--> statement-breakpoint
CREATE TABLE `topic_ratings` (
	`user_id` text NOT NULL,
	`category` text NOT NULL,
	`rating` integer DEFAULT 500 NOT NULL,
	`resolved_count` integer DEFAULT 0 NOT NULL,
	`correct_count` integer DEFAULT 0 NOT NULL,
	`brier_total` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`user_id`, `category`),
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`user_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_topic_ratings_category_rating` ON `topic_ratings` (`category`,`rating`);