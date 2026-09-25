CREATE TABLE `recurrences` (
	`id` text PRIMARY KEY NOT NULL,
	`rule` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `tasks_recurrence_idx` ON `tasks` (`recurrence_id`);