/**
 * Schema Utilities — Shared Types
 * =================================
 * TableConfig is the Protobuf SSOT replacement for the old DbColumnMap.
 * snake_case field names match proto field names and DB column names directly.
 */

// ─── TableConfig (Protobuf SSOT) ──────────────────────────────────────────────

/**
 * Maps snake_case field names (matching proto field names and DB column names)
 * to their SQL type strings. No camelCase↔snake_case mapping needed.
 *
 * @example { yes_bid: 'DOUBLE PRECISION', time: 'TIMESTAMPTZ NOT NULL' }
 */
export type FieldTypeMap = Record<string, string>;

/**
 * Table configuration for the Protobuf SSOT architecture.
 * Replaces DbColumnMap — proto fields ARE snake_case, so column name mapping is
 * unnecessary. Only sqlType annotation is needed alongside TimescaleDB metadata.
 */
export interface TableConfig {
    readonly name: string;
    readonly fieldTypes: FieldTypeMap;
    readonly hypertable?: {
        readonly timeColumn: string;
        readonly chunkInterval: string;
    };
    readonly compression?: {
        readonly segmentBy?: string;
        readonly orderBy?: string;
        readonly after: string;
    };
    readonly unique?: readonly string[];
    readonly indexes?: readonly {
        readonly name: string;
        readonly columns: readonly string[];
    }[];
}
