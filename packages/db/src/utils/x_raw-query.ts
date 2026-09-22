import pg from 'pg';

const globalForRawQuery = globalThis as unknown as {
    dbRawQueryPool: pg.Pool | undefined;
};

export function getRawQueryPool(): pg.Pool {
    if (!globalForRawQuery.dbRawQueryPool) {
        globalForRawQuery.dbRawQueryPool = new pg.Pool({
            connectionString: process.env.PG_DB_URL,
            max: 10,
        });
    }
    return globalForRawQuery.dbRawQueryPool;
}

export async function rawQuery<T = unknown>(
    text: string,
    values?: unknown[]
): Promise<T[]> {
    const result = await getRawQueryPool().query(text, values);
    return result.rows as T[];
}
