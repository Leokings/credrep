DELETE FROM `claims` WHERE `user_id` LIKE 'seed-%';--> statement-breakpoint
DELETE FROM `forecasts` WHERE `user_id` LIKE 'seed-%';--> statement-breakpoint
DELETE FROM `topic_ratings` WHERE `user_id` LIKE 'seed-%';--> statement-breakpoint
DELETE FROM `profiles` WHERE `user_id` LIKE 'seed-%';
