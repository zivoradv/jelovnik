import { config } from 'dotenv'
import { sql } from 'drizzle-orm'
import { db } from '../drizzle'

config({ quiet: true })

/**
 * Briše SVE iz baze: tabele, enum tipove i evidenciju migracija (šema "drizzle").
 * Posle toga: npm run db:migrate (ili db:push) pa npm run db:seed.
 *
 * Zaštita od slučajnog pokretanja: mora da se prosledi --yes.
 */
async function main() {
    if (!process.argv.includes('--yes')) {
        console.error('⚠  Ovo briše celu bazu. Pokreni sa: npm run db:reset -- --yes')
        process.exit(1)
    }

    console.log('▶ Brisanje baze…')
    await db.execute(sql`DROP SCHEMA IF EXISTS public CASCADE`)
    await db.execute(sql`DROP SCHEMA IF EXISTS drizzle CASCADE`)
    await db.execute(sql`CREATE SCHEMA public`)
    console.log('✔ Sve tabele i migracije su obrisane.')
    console.log('  Sledeće: npm run db:migrate   (ili npm run db:push)')
    console.log('           npm run db:seed')
    process.exit(0)
}

main().catch((err) => {
    console.error('❌ Greška pri brisanju baze:', err)
    process.exit(1)
})
