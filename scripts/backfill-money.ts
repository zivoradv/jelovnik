import { config } from 'dotenv'
import { sql } from 'drizzle-orm'
import { db } from '../drizzle'

config({ quiet: true })

/**
 * Popunjava zamrznute cene za porudžbine upisane pre v3 (orders.unit_price = 0):
 *  1. unit_price = cena jela + čorba (iz settings.soup_price)
 *  2. subsidy    = popust firme na najskuplju porciju svakog (korisnik, dan)
 *  3. payments.amount = cena dana, ali samo ako kolona `paid` još postoji (posle db:push je više nema)
 *
 * Bezbedno za ponovno pokretanje: dira samo redove sa unit_price = 0.
 *   npx tsx scripts/backfill-money.ts
 */
async function main() {
    const priced = await db.execute(sql`
        UPDATE "orders" o
        SET "unit_price" = round(m."price" + CASE WHEN o."with_soup"
                THEN COALESCE((SELECT "value"::numeric FROM "settings" WHERE "key" = 'soup_price'), 100) ELSE 0 END)::int
        FROM "meals" m
        WHERE o."meal_id" = m."id" AND o."unit_price" = 0 AND m."price" > 0
        RETURNING o."id"
    `)
    console.log(`✔ unit_price popunjen za ${priced.rows.length} stavki`)

    const subsidized = await db.execute(sql`
        WITH s AS (
            SELECT COALESCE((SELECT "value" FROM "settings" WHERE "key" = 'subsidy_mode'), 'percent') AS mode,
                   COALESCE((SELECT "value"::numeric FROM "settings" WHERE "key" = 'subsidy_percent'), 50) AS pct,
                   COALESCE((SELECT "value"::numeric FROM "settings" WHERE "key" = 'subsidy_amount'), 250) AS amt
        ), days AS (
            SELECT "user_id", "date" FROM "orders" GROUP BY "user_id", "date" HAVING SUM("subsidy") = 0
        ), ranked AS (
            SELECT o."id", o."unit_price",
                   row_number() OVER (PARTITION BY o."user_id", o."date" ORDER BY o."unit_price" DESC, o."id") AS rn
            FROM "orders" o JOIN days d ON d."user_id" = o."user_id" AND d."date" = o."date"
            WHERE o."unit_price" > 0
        )
        UPDATE "orders" o
        SET "subsidy" = CASE WHEN s.mode = 'amount' THEN LEAST(o."unit_price", GREATEST(0, round(s.amt)))::int
                             ELSE round(o."unit_price" * s.pct / 100)::int END
        FROM ranked r, s
        WHERE o."id" = r."id" AND r.rn = 1
        RETURNING o."id"
    `)
    console.log(`✔ subsidy popunjen za ${subsidized.rows.length} dana`)

    const hasPaid = await db.execute(sql`
        SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'paid'
    `)
    if (hasPaid.rows.length > 0) {
        const paid = await db.execute(sql`
            UPDATE "payments" p
            SET "amount" = COALESCE((SELECT SUM(o."unit_price" * o."quantity") - SUM(o."subsidy")
                                     FROM "orders" o WHERE o."user_id" = p."user_id" AND o."date" = p."date"), 0)
            WHERE p."paid" = true AND p."amount" = 0
            RETURNING p."id"
        `)
        console.log(`✔ amount popunjen za ${paid.rows.length} uplata`)
    } else {
        console.log('ℹ kolona payments.paid ne postoji – stare uplate (amount = 0) označi ručno u Dugovima')
    }
    process.exit(0)
}

main().catch((err) => {
    console.error('❌ Greška:', err)
    process.exit(1)
})
