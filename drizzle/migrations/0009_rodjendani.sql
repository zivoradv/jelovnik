CREATE TABLE "birthday_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"celebrant_id" integer NOT NULL,
	"payer_id" integer NOT NULL,
	"year" integer NOT NULL,
	"amount" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "birthday" date;--> statement-breakpoint
ALTER TABLE "birthday_payments" ADD CONSTRAINT "birthday_payments_celebrant_id_users_id_fk" FOREIGN KEY ("celebrant_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "birthday_payments" ADD CONSTRAINT "birthday_payments_payer_id_users_id_fk" FOREIGN KEY ("payer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "birthday_payments_uidx" ON "birthday_payments" USING btree ("celebrant_id","year","payer_id");