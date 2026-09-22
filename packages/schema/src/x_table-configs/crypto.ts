/**
 * Crypto Table Configs (Protobuf SSOT)
 */

import type { TableConfig } from '../utils';

// ─── crypto_trades ────────────────────────────────────────────────────────────

export const CRYPTO_TRADE_CONFIG: TableConfig = {
    name: 'crypto_trades',
    fieldTypes: {
        time:        'TIMESTAMPTZ NOT NULL',
        source:      'TEXT NOT NULL',
        symbol:      'TEXT NOT NULL',
        price:       'NUMERIC NOT NULL',
        qty:         'NUMERIC NOT NULL',
        trade_id:    'TEXT',
        side:        'TEXT',
        buyer_maker: 'BOOLEAN',
    },
    hypertable: { timeColumn: 'time', chunkInterval: '1 day' },
    unique: ['source', 'symbol', 'trade_id', 'time'],
    indexes: [
        { name: 'idx_crypto_trades_source_symbol', columns: ['source', 'symbol', 'time DESC'] },
    ],
};

// ─── crypto_ticks ─────────────────────────────────────────────────────────────

export const CRYPTO_TICK_CONFIG: TableConfig = {
    name: 'crypto_ticks',
    fieldTypes: {
        time:       'TIMESTAMPTZ NOT NULL',
        source:     'TEXT NOT NULL',
        symbol:     'TEXT NOT NULL',
        last_price: 'NUMERIC',
        best_bid:   'NUMERIC',
        best_ask:   'NUMERIC',
        volume_24h: 'NUMERIC',
        high_24h:   'NUMERIC',
        low_24h:    'NUMERIC',
    },
    hypertable: { timeColumn: 'time', chunkInterval: '1 day' },
    indexes: [
        { name: 'idx_crypto_ticks_source_symbol', columns: ['source', 'symbol', 'time DESC'] },
    ],
};

// ─── crypto_dex_prices ────────────────────────────────────────────────────────

export const CRYPTO_DEX_CONFIG: TableConfig = {
    name: 'crypto_dex_prices',
    fieldTypes: {
        time:         'TIMESTAMPTZ NOT NULL',
        source:       'TEXT NOT NULL',
        symbol:       'TEXT NOT NULL',
        price:        'DOUBLE PRECISION',
        price_impact: 'TEXT',
        route_count:  'INTEGER',
        volume_24h:   'TEXT',
    },
    hypertable: { timeColumn: 'time', chunkInterval: '1 day' },
};
