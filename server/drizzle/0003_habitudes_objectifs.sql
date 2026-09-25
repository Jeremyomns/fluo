CREATE TABLE `habit_logs` (
	`habit_id` text NOT NULL,
	`date` text NOT NULL,
	PRIMARY KEY(`habit_id`, `date`),
	FOREIGN KEY (`habit_id`) REFERENCES `habits`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `habits` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`emoji` text DEFAULT '' NOT NULL,
	`days` text NOT NULL,
	`position` real DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `weekly_goals` (
	`id` text PRIMARY KEY NOT NULL,
	`week_start` text NOT NULL,
	`title` text NOT NULL,
	`done` integer DEFAULT false NOT NULL,
	`position` real DEFAULT 0 NOT NULL,
	`carried_from` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `goals_week_idx` ON `weekly_goals` (`week_start`);