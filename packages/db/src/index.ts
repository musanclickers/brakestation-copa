import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export type Database = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  db: Database | undefined;
};

function createDb(): Database {
  const client = postgres(process.env.DATABASE_URL!);
  return drizzle(client, { schema });
}

export const db: Database = globalForDb.db ?? createDb();

if (process.env.NODE_ENV !== 'production') {
  globalForDb.db = db;
}

export * from './schema';
export * from './phases';
export type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
