CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shopping_history` (
	`key` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`use_count` integer DEFAULT 1 NOT NULL,
	`last_used` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shopping_items` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`key` text NOT NULL,
	`checked` integer DEFAULT false NOT NULL,
	`position` real DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`checked_at` text
);
--> statement-breakpoint
CREATE INDEX `shopping_key_idx` ON `shopping_items` (`key`);