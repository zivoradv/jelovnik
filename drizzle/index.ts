import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
    throw new Error('DATABASE_URL nije postavljen. Proveri .env fajl.')
}

function createPool(): Pool {
    const created = new Pool({
        connectionString,
        allowExitOnIdle: true,
        // Vercel zamrzava funkcije između zahteva, pa sačuvana konekcija može biti mrtva – tamo svaki upit dobija novu
        maxUses: process.env.VERCEL ? 1 : undefined,
    })
    // bez ovoga prekid neaktivne konekcije (npr. restart baze) obara ceo proces
    created.on('error', (err) => console.error('Postgres konekcija prekinuta:', err.message))
    return created
}

// hot reload u razvoju ponovo učitava modul – pool se čuva da se konekcije ne gomilaju
const globalForDb = globalThis as unknown as { pgPool?: Pool }
const pool = globalForDb.pgPool ?? createPool()
if (process.env.NODE_ENV !== 'production') globalForDb.pgPool = pool

export const db = drizzle({ client: pool, schema })

export * from './schema'
