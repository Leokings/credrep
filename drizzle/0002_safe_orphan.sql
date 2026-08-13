ALTER TABLE `profiles` ADD `total_claims` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `resolved_claims` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `correct_claims` integer DEFAULT 0 NOT NULL;