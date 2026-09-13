import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
    throw new Error('DATABASE_URL nije postavljen. Proveri .env fajl.')
}

export const db = drizzle({ client: neon(connectionString), schema })

export * from './schema'
