/**
 * CsvWriter — appends rows to date-partitioned CSV files.
 *
 * Path pattern:
 *   daily  : {CSV_OUTPUT_DIR}/{table}/{YYYY}/{MM}/{DD}/{table}.csv
 *   monthly: {CSV_OUTPUT_DIR}/{table}/{YYYY}/{MM}/{table}.csv
 *
 * Header is written on first write (when file doesn't exist yet).
 * Sync append — safe for single-process consumers (no file locking needed).
 */

import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { TableConfig } from '@repo/schema';

const OUTPUT_DIR = process.env.CSV_OUTPUT_DIR ?? './data';

function snakeToCamel(s: string): string {
    return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

export class CsvWriter {
    private readonly columns: string[];

    constructor(
        private readonly table: string,
        private readonly config: TableConfig,
        private readonly monthly = false
    ) {
        this.columns = Object.keys(config.fieldTypes);
    }

    write(msg: Record<string, unknown>): void {
        const ts = (msg._ts as string | undefined) ?? new Date().toISOString();
        const date = new Date(ts);
        const yyyy = date.getUTCFullYear().toString();
        const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(date.getUTCDate()).padStart(2, '0');

        const filePath = this.monthly
            ? resolve(OUTPUT_DIR, this.table, yyyy, mm, `${this.table}.csv`)
            : resolve(OUTPUT_DIR, this.table, yyyy, mm, dd, `${this.table}.csv`);

        const isNew = !existsSync(filePath);
        if (isNew) {
            mkdirSync(dirname(filePath), { recursive: true });
            appendFileSync(filePath, this.columns.join(',') + '\n', 'utf8');
        }

        const row = this.columns.map((col) => {
            const v = col === 'time'
                ? new Date(ts)
                : (msg[col] ?? msg[snakeToCamel(col)]);
            if (v === null || v === undefined) return '';
            if (v instanceof Date) return v.toISOString();
            if (typeof v === 'string' && v.includes(',')) return `"${v}"`;
            return String(v);
        });
        appendFileSync(filePath, row.join(',') + '\n', 'utf8');
    }
}
