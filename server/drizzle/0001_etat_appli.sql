CREATE TABLE "fluo"."app_status" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fluo"."app_status" ENABLE ROW LEVEL SECURITY;