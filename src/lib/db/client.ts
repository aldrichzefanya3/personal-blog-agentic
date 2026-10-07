import postgres from 'postgres';

if (!process.env.DATABASE_URL) {
  throw new Error('Missing required environment variable: DATABASE_URL');
}

const globalForDb = globalThis as unknown as { _sql: postgres.Sql | undefined };

export const sql =
  globalForDb._sql ??
  postgres(process.env.DATABASE_URL, {
    prepare: false,
    max: 3,
    connect_timeout: 10,
    idle_timeout: 20,
    ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDb._sql = sql;
}
