ALTER TABLE "projects" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "start_date" date;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "end_date" date;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "client_name" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "budget_hours" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;