CREATE TYPE "public"."rsvp" AS ENUM('da', 'ne');--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'pivo';--> statement-breakpoint
CREATE TABLE "beer_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"time" text DEFAULT '17:00' NOT NULL,
	"place" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beer_rsvps" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"status" "rsvp" DEFAULT 'da' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "beer_plans" ADD CONSTRAINT "beer_plans_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beer_rsvps" ADD CONSTRAINT "beer_rsvps_plan_id_beer_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."beer_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beer_rsvps" ADD CONSTRAINT "beer_rsvps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "beer_plans_date_idx" ON "beer_plans" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "beer_rsvps_plan_user_uidx" ON "beer_rsvps" USING btree ("plan_id","user_id");