import { loadDotenv } from './load-dotenv';
import { z } from 'zod';

loadDotenv();

export const dbSchema = z.object({
    PG_DB_URL: z.string().url().optional(),
    CLICKHOUSE_URL: z.string().url().optional(),
    CLICKHOUSE_USER: z.string().optional(),
    CLICKHOUSE_PASSWORD: z.string().optional(),
    CLICKHOUSE_DB: z.string().optional(),
});

export const DB_ENV = dbSchema.parse(process.env);
export const PG_DB_URL = DB_ENV.PG_DB_URL;
export const CLICKHOUSE_URL = DB_ENV.CLICKHOUSE_URL;
export const CLICKHOUSE_USER = DB_ENV.CLICKHOUSE_USER;
export const CLICKHOUSE_PASSWORD = DB_ENV.CLICKHOUSE_PASSWORD;
export const CLICKHOUSE_DB = DB_ENV.CLICKHOUSE_DB;
