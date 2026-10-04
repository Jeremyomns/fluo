CREATE SCHEMA "fluo";
--> statement-breakpoint
CREATE TABLE "fluo"."categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"emoji" text DEFAULT '' NOT NULL,
	"color" text DEFAULT '#687082' NOT NULL,
	"position" double precision DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fluo"."categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fluo"."habit_logs" (
	"habit_id" text NOT NULL,
	"date" text NOT NULL,
	CONSTRAINT "habit_logs_habit_id_date_pk" PRIMARY KEY("habit_id","date")
);
--> statement-breakpoint
ALTER TABLE "fluo"."habit_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fluo"."habits" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"emoji" text DEFAULT '' NOT NULL,
	"days" jsonb NOT NULL,
	"position" double precision DEFAULT 0 NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fluo"."habits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fluo"."notes" (
	"id" text PRIMARY KEY NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fluo"."notes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fluo"."recurrences" (
	"id" text PRIMARY KEY NOT NULL,
	"rule" jsonb NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fluo"."recurrences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fluo"."shopping_history" (
	"key" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"use_count" integer DEFAULT 1 NOT NULL,
	"last_used" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fluo"."shopping_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fluo"."shopping_items" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"key" text NOT NULL,
	"checked" boolean DEFAULT false NOT NULL,
	"position" double precision DEFAULT 0 NOT NULL,
	"created_at" text NOT NULL,
	"checked_at" text
);
--> statement-breakpoint
ALTER TABLE "fluo"."shopping_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fluo"."tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"notes" text,
	"category_id" text,
	"priority" integer DEFAULT 2 NOT NULL,
	"due_date" text,
	"position" double precision DEFAULT 0 NOT NULL,
	"focus_date" text,
	"recurrence_id" text,
	"completed_at" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fluo"."tasks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fluo"."weekly_goals" (
	"id" text PRIMARY KEY NOT NULL,
	"week_start" text NOT NULL,
	"title" text NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"position" double precision DEFAULT 0 NOT NULL,
	"carried_from" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fluo"."weekly_goals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "fluo"."habit_logs" ADD CONSTRAINT "habit_logs_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "fluo"."habits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fluo"."tasks" ADD CONSTRAINT "tasks_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "fluo"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shopping_key_idx" ON "fluo"."shopping_items" USING btree ("key");--> statement-breakpoint
CREATE INDEX "tasks_due_idx" ON "fluo"."tasks" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "tasks_completed_idx" ON "fluo"."tasks" USING btree ("completed_at");--> statement-breakpoint
CREATE INDEX "tasks_recurrence_idx" ON "fluo"."tasks" USING btree ("recurrence_id");--> statement-breakpoint
CREATE INDEX "goals_week_idx" ON "fluo"."weekly_goals" USING btree ("week_start");