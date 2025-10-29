ALTER TABLE "holidays" ADD COLUMN "type" varchar(20) DEFAULT 'public' NOT NULL;--> statement-breakpoint
ALTER TABLE "holidays" ADD COLUMN "is_recurring" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "holidays" ADD COLUMN "description" text;