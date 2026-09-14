CREATE TYPE "public"."notification_type" AS ENUM('raspored', 'jelo', 'dug', 'uplata', 'info');--> statement-breakpoint
CREATE TABLE "menu_template_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer NOT NULL,
	"day" integer NOT NULL,
	"meal_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" "notification_type" DEFAULT 'info' NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"link" text,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "week_menus" (
	"id" serial PRIMARY KEY NOT NULL,
	"week_start" date NOT NULL,
	"template_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "week_menus_week_start_unique" UNIQUE("week_start")
);
--> statement-breakpoint
DROP INDEX "meals_day_idx";--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "with_soup" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "first_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "menu_template_items" ADD CONSTRAINT "menu_template_items_template_id_menu_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."menu_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_template_items" ADD CONSTRAINT "menu_template_items_meal_id_meals_id_fk" FOREIGN KEY ("meal_id") REFERENCES "public"."meals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "week_menus" ADD CONSTRAINT "week_menus_template_id_menu_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."menu_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "menu_template_items_uidx" ON "menu_template_items" USING btree ("template_id","day","meal_id");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id","read_at");--> statement-breakpoint
-- Ručno dodato: sačuvaj postojeći raspored po danima kao šemu pre brisanja kolone "day".
INSERT INTO "menu_templates" ("name")
SELECT 'Postojeća šema'
WHERE EXISTS (SELECT 1 FROM "meals" WHERE "category" = 'kuvano' AND "day" BETWEEN 1 AND 5);--> statement-breakpoint
INSERT INTO "menu_template_items" ("template_id", "day", "meal_id")
SELECT t."id", m."day", m."id"
FROM "meals" m
CROSS JOIN (SELECT "id" FROM "menu_templates" WHERE "name" = 'Postojeća šema' ORDER BY "id" DESC LIMIT 1) t
WHERE m."category" = 'kuvano' AND m."day" BETWEEN 1 AND 5;--> statement-breakpoint
INSERT INTO "week_menus" ("week_start", "template_id")
SELECT (date_trunc('week', CURRENT_DATE))::date, t."id"
FROM (SELECT "id" FROM "menu_templates" WHERE "name" = 'Postojeća šema' ORDER BY "id" DESC LIMIT 1) t
ON CONFLICT ("week_start") DO NOTHING;--> statement-breakpoint
INSERT INTO "settings" ("key", "value") VALUES ('subsidy_percent', '50'), ('soup_price', '100')
ON CONFLICT ("key") DO NOTHING;--> statement-breakpoint
ALTER TABLE "meals" DROP COLUMN "day";