import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

config({ quiet: true })

const url = process.env.DATABASE_URL
if (!url) {
    throw new Error('DATABASE_URL nije postavljen. Proveri .env fajl.')
}

export default defineConfig({
    schema: './drizzle/schema.ts',
    out: './drizzle/migrations',
    dialect: 'postgresql',
    dbCredentials: { url },
    verbose: true,
    strict: true,
})
