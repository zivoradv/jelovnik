ALTER TABLE "orders" ADD COLUMN "unit_price" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "subsidy" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- backfill: zamrzni cenu porcije (jelo + čorba) za sve postojeće porudžbine iz trenutnih cena
UPDATE "orders" o
SET "unit_price" = round(m."price" + CASE WHEN o."with_soup" THEN COALESCE((SELECT "value"::numeric FROM "settings" WHERE "key" = 'soup_price'), 100) ELSE 0 END)::int
FROM "meals" m
WHERE o."meal_id" = m."id";--> statement-breakpoint
-- backfill: popust firme ide na najskuplju porciju svakog (korisnik, dan)
WITH s AS (
    SELECT COALESCE((SELECT "value" FROM "settings" WHERE "key" = 'subsidy_mode'), 'percent') AS mode,
           COALESCE((SELECT "value"::numeric FROM "settings" WHERE "key" = 'subsidy_percent'), 50) AS pct,
           COALESCE((SELECT "value"::numeric FROM "settings" WHERE "key" = 'subsidy_amount'), 250) AS amt
), ranked AS (
    SELECT "id", "unit_price", row_number() OVER (PARTITION BY "user_id", "date" ORDER BY "unit_price" DESC, "id") AS rn
    FROM "orders" WHERE "meal_id" IS NOT NULL AND "unit_price" > 0
)
UPDATE "orders" o
SET "subsidy" = CASE WHEN s.mode = 'amount' THEN LEAST(o."unit_price", GREATEST(0, round(s.amt)))::int ELSE round(o."unit_price" * s.pct / 100)::int END
FROM ranked r, s
WHERE o."id" = r."id" AND r.rn = 1;--> statement-breakpoint
-- backfill: dan koji je bio označen kao plaćen dobija tačan iznos koji je tada važio
UPDATE "payments" p
SET "amount" = COALESCE((SELECT SUM(o."unit_price" * o."quantity") - SUM(o."subsidy") FROM "orders" o WHERE o."user_id" = p."user_id" AND o."date" = p."date"), 0)
WHERE p."paid" = true;
