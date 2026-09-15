-- opcija „Nešto drugo?” više ne postoji: sopstvene porudžbine (bez jela) se brišu
DELETE FROM "orders" WHERE "meal_id" IS NULL;--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT "orders_meal_id_meals_id_fk";
--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "meal_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_meal_id_meals_id_fk" FOREIGN KEY ("meal_id") REFERENCES "public"."meals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "custom_text";--> statement-breakpoint
ALTER TABLE "payments" DROP COLUMN "paid";
