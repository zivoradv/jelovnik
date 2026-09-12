import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL nije postavljen. Proveri .env fajl.');
}

// neon() ne otvara konekciju dok se ne izvrši prvi upit,
// pa je bezbedno inicijalizovati ga na nivou modula.
const sql = neon(connectionString);

export const db = drizzle(sql, { schema });

export * from './schema';
