import { createClient, type ClickHouseClient } from '@clickhouse/client';
import {
    CLICKHOUSE_URL,
    CLICKHOUSE_USER,
    CLICKHOUSE_PASSWORD,
    CLICKHOUSE_DB,
} from '@repo/env';

export class ClickHouseManager {
    private static instance: ClickHouseClient | null = null;

    private constructor() {}

    public static getInstance(): ClickHouseClient {
        if (!ClickHouseManager.instance) {
            ClickHouseManager.instance = createClient({
                url: CLICKHOUSE_URL ?? 'http://localhost:8123',
                username: CLICKHOUSE_USER ?? 'admin',
                password: CLICKHOUSE_PASSWORD ?? '',
                database: CLICKHOUSE_DB ?? 'market_predict',
            });
        }
        return ClickHouseManager.instance;
    }

    public static async close(): Promise<void> {
        if (ClickHouseManager.instance) {
            await ClickHouseManager.instance.close();
            ClickHouseManager.instance = null;
        }
    }

    public static async insert<T extends object>(
        table: string,
        rows: T[]
    ): Promise<void> {
        if (rows.length === 0) return;
        await ClickHouseManager.getInstance().insert({
            table,
            values: rows,
            format: 'JSONEachRow',
        });
    }
}
