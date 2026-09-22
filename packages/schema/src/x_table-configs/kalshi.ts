/**
 * Kalshi Table Configs (Protobuf SSOT)
 * =====================================
 * Snake_case field names match proto field names and DB column names directly.
 * Used by Phase 2+ generators instead of DbColumnMap.
 */

import type { TableConfig } from '../utils';

// ─── kalshi_market (live) ─────────────────────────────────────────────────────

export const KALSHI_MARKET_CONFIG: TableConfig = {
    name: 'kalshi_market',
    fieldTypes: {
        time:          'TIMESTAMPTZ NOT NULL',
        series:        'TEXT NOT NULL',
        ticker:        'TEXT NOT NULL',
        title:         'TEXT',
        status:        'TEXT',
        yes_bid:       'TEXT',
        yes_ask:       'TEXT',
        no_bid:        'TEXT',
        no_ask:        'TEXT',
        last_price:    'TEXT',
        volume:        'TEXT',
        open_interest: 'TEXT',
        yes_bid_size:  'TEXT',
        yes_ask_size:  'TEXT',
        close_time:    'TEXT',
        source:        'TEXT',
        event_ticker:  'TEXT',
        strike_type:   'TEXT',
        floor_strike:  'TEXT',
        cap_strike:    'TEXT',
        market_type:   'TEXT',
        expiration_time:      'TEXT',
        settlement_ts:        'TEXT',
        result:               'TEXT',
        settlement_value:     'TEXT',
        tick_size:            'TEXT',
        response_price_units: 'TEXT',
        no_bid_size:          'TEXT',
        no_ask_size:          'TEXT',
        last_trade_price:     'TEXT',
        last_trade_size:      'TEXT',
        last_trade_ts:        'TEXT',
        open_time:            'TEXT',
        created_time:         'TEXT',
        updated_time:         'TEXT',
        liquidity:            'TEXT',
        can_close_early:      'TEXT',
    },
    hypertable: { timeColumn: 'time', chunkInterval: '1 day' },
    indexes: [
        { name: 'idx_kalshi_market_series', columns: ['series', 'ticker', 'time DESC'] },
    ],
};

// ─── kalshi_market_api_hist ───────────────────────────────────────────────────

export const KALSHI_MARKET_HISTORICAL_CONFIG: TableConfig = {
    name: 'kalshi_market_api_hist',
    fieldTypes: {
        ticker:                    'TEXT NOT NULL',
        event_ticker:              'TEXT',
        market_type:               'TEXT',
        title:                     'TEXT',
        status:                    'TEXT',
        result:                    'TEXT',
        open_time:                 'TEXT',
        close_time:                'TEXT',
        created_time:              'TEXT',
        expiration_time:           'TEXT',
        expected_expiration_time:  'TEXT',
        settlement_ts:             'TEXT',
        yes_ask_dollars:           'TEXT',
        yes_bid_dollars:           'TEXT',
        no_ask_dollars:            'TEXT',
        no_bid_dollars:            'TEXT',
        last_price_dollars:        'TEXT',
        volume_fp:                 'TEXT',
        volume_24h_fp:             'TEXT',
        open_interest_fp:          'TEXT',
        liquidity_dollars:         'TEXT',
        notional_value_dollars:    'TEXT',
        strike_type:               'TEXT',
        settlement_value_dollars:  'TEXT',
        updated_time:              'TEXT',
        can_close_early:           'TEXT',
        custom_strike:             'JSONB',
        early_close_condition:     'TEXT',
        expiration_value:          'TEXT',
        fractional_trading_enabled: 'TEXT',
        latest_expiration_time:    'TEXT',
        mve_collection_ticker:     'TEXT',
        mve_selected_legs:         'JSONB',
        no_sub_title:              'TEXT',
        previous_price_dollars:    'TEXT',
        previous_yes_ask_dollars:  'TEXT',
        previous_yes_bid_dollars:  'TEXT',
        price_level_structure:     'TEXT',
        price_ranges:              'JSONB',
        response_price_units:      'TEXT',
        rules_primary:             'TEXT',
        rules_secondary:           'TEXT',
        settlement_timer_seconds:  'TEXT',
        tick_size:                 'TEXT',
        yes_ask_size_fp:           'TEXT',
        yes_bid_size_fp:           'TEXT',
        yes_sub_title:             'TEXT',
    },
    indexes: [
        { name: 'idx_kalshi_market_api_hist_ticker', columns: ['ticker'] },
    ],
};

// ─── kalshi_trade (live) ──────────────────────────────────────────────────────

export const KALSHI_TRADE_CONFIG: TableConfig = {
    name: 'kalshi_trade',
    fieldTypes: {
        time:       'TIMESTAMPTZ NOT NULL',
        ticker:     'TEXT NOT NULL',
        trade_id:   'TEXT',
        yes_price:  'TEXT',
        no_price:   'TEXT',
        count:      'TEXT',
        taker_side: 'TEXT',
        source:     'TEXT',
    },
    hypertable: { timeColumn: 'time', chunkInterval: '1 day' },
    indexes: [
        { name: 'idx_kalshi_trade_ticker', columns: ['ticker', 'time DESC'] },
    ],
};

// ─── kalshi_trade_api_hist ────────────────────────────────────────────────────

export const KALSHI_TRADE_HISTORICAL_CONFIG: TableConfig = {
    name: 'kalshi_trade_api_hist',
    fieldTypes: {
        time:       'TIMESTAMPTZ NOT NULL',
        ticker:     'TEXT NOT NULL',
        trade_id:   'TEXT',
        yes_price:  'TEXT',
        no_price:   'TEXT',
        count:      'TEXT',
        taker_side: 'TEXT',
    },
    hypertable: { timeColumn: 'time', chunkInterval: '30 days' },
    compression: { segmentBy: 'ticker', orderBy: 'time DESC', after: '7 days' },
    indexes: [
        { name: 'idx_kalshi_trade_api_hist_ticker', columns: ['ticker', 'time DESC'] },
    ],
};

// ─── kalshi_candlestick_api_hist ──────────────────────────────────────────────

export const KALSHI_CANDLESTICK_HISTORICAL_CONFIG: TableConfig = {
    name: 'kalshi_candlestick_api_hist',
    fieldTypes: {
        time:            'TIMESTAMPTZ NOT NULL',
        ticker:          'TEXT NOT NULL',
        series:          'TEXT NOT NULL',
        period_interval: 'TEXT NOT NULL',
        price_open:      'TEXT',
        price_close:     'TEXT',
        price_high:      'TEXT',
        price_low:       'TEXT',
        price_mean:      'TEXT',
        yes_bid_close:   'TEXT',
        yes_ask_close:   'TEXT',
        volume:          'TEXT',
        open_interest:   'TEXT',
        price_previous:  'TEXT',
        yes_bid_open:    'TEXT',
        yes_bid_high:    'TEXT',
        yes_bid_low:     'TEXT',
        yes_ask_open:    'TEXT',
        yes_ask_high:    'TEXT',
        yes_ask_low:     'TEXT',
        yes_bid_mean:    'TEXT',
        yes_ask_mean:    'TEXT',
    },
    hypertable: { timeColumn: 'time', chunkInterval: '30 days' },
    compression: { segmentBy: 'series, ticker', orderBy: 'time DESC', after: '7 days' },
    indexes: [
        { name: 'idx_kalshi_candlestick_api_hist_ticker', columns: ['ticker', 'period_interval', 'time DESC'] },
    ],
};


// ─── kalshi_candlestick_api ───────────────────────────────────────────────────
// Topic: kalshi.candlestick.api

export const KALSHI_CANDLESTICK_API_CONFIG: TableConfig = {
    name: 'kalshi_candlestick_api',
    fieldTypes: {
        time:            'TIMESTAMPTZ NOT NULL',
        ticker:          'TEXT NOT NULL',
        series:          'TEXT NOT NULL',
        period_interval: 'TEXT NOT NULL',
        price_open:      'TEXT',
        price_close:     'TEXT',
        price_high:      'TEXT',
        price_low:       'TEXT',
        price_mean:      'TEXT',
        yes_bid_close:   'TEXT',
        yes_ask_close:   'TEXT',
        volume:          'TEXT',
        open_interest:   'TEXT',
        price_previous:  'TEXT',
        yes_bid_open:    'TEXT',
        yes_bid_high:    'TEXT',
        yes_bid_low:     'TEXT',
        yes_ask_open:    'TEXT',
        yes_ask_high:    'TEXT',
        yes_ask_low:     'TEXT',
        yes_bid_mean:    'TEXT',
        yes_ask_mean:    'TEXT',
    },
    hypertable: { timeColumn: 'time', chunkInterval: '1 day' },
    indexes: [
        { name: 'idx_kalshi_candlestick_api_ticker', columns: ['ticker', 'period_interval', 'time DESC'] },
    ],
};
// ─── kalshi_tick (live WS) ────────────────────────────────────────────────────

export const KALSHI_TICK_CONFIG: TableConfig = {
    name: 'kalshi_tick',
    fieldTypes: {
        time:          'TIMESTAMPTZ NOT NULL',
        ticker:        'TEXT NOT NULL',
        yes_bid:       'TEXT',
        yes_ask:       'TEXT',
        no_bid:        'TEXT',
        no_ask:        'TEXT',
        last_price:    'TEXT',
        volume:        'TEXT',
        open_interest: 'TEXT',
        yes_bid_size:  'TEXT',
        yes_ask_size:  'TEXT',
        source:        'TEXT',
    },
    hypertable: { timeColumn: 'time', chunkInterval: '1 hour' },
    indexes: [
        { name: 'idx_kalshi_tick_ticker', columns: ['ticker', 'time DESC'] },
    ],
};

// ─── kalshi_orderbook (live) ──────────────────────────────────────────────────

export const KALSHI_ORDERBOOK_CONFIG: TableConfig = {
    name: 'kalshi_orderbook',
    fieldTypes: {
        time:   'TIMESTAMPTZ NOT NULL',
        ticker: 'TEXT NOT NULL',
        bids:   'JSONB',
        asks:   'JSONB',
    },
    hypertable: { timeColumn: 'time', chunkInterval: '1 day' },
    indexes: [
        { name: 'idx_kalshi_ob_ticker', columns: ['ticker', 'time DESC'] },
    ],
};

// ─── kalshi_orderbook_delta (live WS) ────────────────────────────────────────

export const KALSHI_ORDERBOOK_DELTA_CONFIG: TableConfig = {
    name: 'kalshi_orderbook_delta',
    fieldTypes: {
        time:   'TIMESTAMPTZ NOT NULL',
        ticker: 'TEXT NOT NULL',
        type:   'TEXT NOT NULL',
        bids:   'JSONB',
        asks:   'JSONB',
        seq:    'BIGINT',
    },
    hypertable: { timeColumn: 'time', chunkInterval: '1 hour' },
    indexes: [
        { name: 'idx_kalshi_orderbook_delta_ticker', columns: ['ticker', 'time DESC'] },
    ],
};

// ─── kalshi_settled_market (static) ──────────────────────────────────────────

export const KALSHI_SETTLED_MARKET_CONFIG: TableConfig = {
    name: 'kalshi_settled_market',
    fieldTypes: {
        ticker:           'TEXT NOT NULL PRIMARY KEY',
        series:           'TEXT NOT NULL',
        event_ticker:     'TEXT',
        title:            'TEXT',
        result:           'TEXT',
        expiration_value: 'TEXT',
        floor_strike:     'TEXT',
        cap_strike:       'TEXT',
        strike_type:      'TEXT',
        settlement_ts:    'TIMESTAMPTZ',
        close_time:       'TIMESTAMPTZ',
        last_price:       'TEXT',
        yes_bid:          'TEXT',
        yes_ask:          'TEXT',
        volume:           'TEXT',
        open_interest:    'TEXT',
        fetched_at:       'TIMESTAMPTZ DEFAULT NOW()',
    },
    indexes: [
        { name: 'idx_kalshi_settled_market_series', columns: ['series', 'settlement_ts DESC'] },
    ],
};

// ─── kalshi_series (static) ───────────────────────────────────────────────────

export const KALSHI_SERIES_CONFIG: TableConfig = {
    name: 'kalshi_series',
    fieldTypes: {
        ticker:               'TEXT NOT NULL PRIMARY KEY',
        title:                'TEXT NOT NULL',
        category:             'TEXT',
        frequency:            'TEXT',
        fee_type:             'TEXT',
        fee_multiplier:       'TEXT',
        settlement_src_name:  'TEXT',
        settlement_src_url:   'TEXT',
        contract_terms_url:   'TEXT',
        tags:                 'TEXT[]',
    },
};

// ─── kalshi_event (static) ────────────────────────────────────────────────────

export const KALSHI_EVENT_CONFIG: TableConfig = {
    name: 'kalshi_event',
    fieldTypes: {
        event_ticker:       'TEXT NOT NULL PRIMARY KEY',
        series_ticker:      'TEXT NOT NULL',
        title:              'TEXT',
        category:           'TEXT',
        mutually_exclusive: 'TEXT',
        status:             'TEXT',
        fetched_at:         'TIMESTAMPTZ DEFAULT NOW()',
    },
    indexes: [
        { name: 'idx_kalshi_event_series', columns: ['series_ticker'] },
    ],
};

// ════════════════════════════════════════════════════════════════════════════
// KALSHI — source-specific live tables (no generic source routing)
// ════════════════════════════════════════════════════════════════════════════

// ─── kalshi_market_api ────────────────────────────────────────────────────────
// Topic: kalshi.market.api

export const KALSHI_MARKET_API_CONFIG: TableConfig = {
    name: 'kalshi_market_api',
    fieldTypes: {
        time:          'TIMESTAMPTZ NOT NULL',
        series:        'TEXT NOT NULL',
        ticker:        'TEXT NOT NULL',
        title:         'TEXT',
        status:        'TEXT',
        yes_bid:       'TEXT',
        yes_ask:       'TEXT',
        no_bid:        'TEXT',
        no_ask:        'TEXT',
        last_price:    'TEXT',
        volume:        'TEXT',
        open_interest: 'TEXT',
        close_time:    'TEXT',
        yes_bid_size:  'TEXT',
        yes_ask_size:  'TEXT',
        event_ticker:  'TEXT',
        strike_type:   'TEXT',
        floor_strike:  'TEXT',
        cap_strike:    'TEXT',
        market_type:   'TEXT',
        open_time:                 'TEXT',
        expiration_time:           'TEXT',
        expected_expiration_time:  'TEXT',
        volume_24h:                'TEXT',
        settlement_timer_seconds:  'TEXT',
        result:                    'TEXT',
        expiration_value:          'TEXT',
        settlement_ts:             'TEXT',
        settlement_value:          'TEXT',
        tick_size:                 'TEXT',
        response_price_units:      'TEXT',
        no_bid_size:               'TEXT',
        no_ask_size:               'TEXT',
        last_trade_price:          'TEXT',
        last_trade_size:           'TEXT',
        last_trade_ts:             'TEXT',
        created_time:              'TEXT',
        updated_time:              'TEXT',
        liquidity:                 'TEXT',
        can_close_early:           'TEXT',
    },
    hypertable: { timeColumn: 'time', chunkInterval: '1 day' },
    indexes: [
        { name: 'idx_kalshi_market_api_ticker', columns: ['ticker', 'time DESC'] },
    ],
};

// ─── kalshi_market_api_latest ────────────────────────────────────────────────
// Derived latest-state table fed from kalshi_market_api inside ClickHouse.
// Current-state buckets (active/closed/settled) are derived downstream from this
// latest layer and do not introduce new Kafka topics or proto messages.

export const KALSHI_MARKET_API_LATEST_CONFIG: TableConfig = {
    name: 'kalshi_market_api_latest',
    fieldTypes: {
        time:          'TIMESTAMPTZ NOT NULL',
        series:        'TEXT NOT NULL',
        ticker:        'TEXT NOT NULL',
        title:         'TEXT',
        status:        'TEXT',
        yes_bid:       'TEXT',
        yes_ask:       'TEXT',
        no_bid:        'TEXT',
        no_ask:        'TEXT',
        last_price:    'TEXT',
        volume:        'TEXT',
        open_interest: 'TEXT',
        close_time:    'TEXT',
        yes_bid_size:  'TEXT',
        yes_ask_size:  'TEXT',
        event_ticker:  'TEXT',
        strike_type:   'TEXT',
        floor_strike:  'TEXT',
        cap_strike:    'TEXT',
        market_type:   'TEXT',
        open_time:                 'TEXT',
        expiration_time:           'TEXT',
        expected_expiration_time:  'TEXT',
        volume_24h:                'TEXT',
        settlement_timer_seconds:  'TEXT',
        result:                    'TEXT',
        expiration_value:          'TEXT',
        settlement_ts:             'TEXT',
        settlement_value:          'TEXT',
        tick_size:                 'TEXT',
        response_price_units:      'TEXT',
        no_bid_size:               'TEXT',
        no_ask_size:               'TEXT',
        last_trade_price:          'TEXT',
        last_trade_size:           'TEXT',
        last_trade_ts:             'TEXT',
        created_time:              'TEXT',
        updated_time:              'TEXT',
        liquidity:                 'TEXT',
        can_close_early:           'TEXT',
    },
    hypertable: { timeColumn: 'time', chunkInterval: '1 day' },
    indexes: [
        { name: 'idx_kalshi_market_api_latest_ticker', columns: ['ticker', 'time DESC'] },
    ],
};

// ─── kalshi_market_tick_ws ────────────────────────────────────────────────────
// Topic: kalshi.market.tick.ws

export const KALSHI_MARKET_TICK_WS_CONFIG: TableConfig = {
    name: 'kalshi_market_tick_ws',
    fieldTypes: {
        time:          'TIMESTAMPTZ NOT NULL',
        ticker:        'TEXT NOT NULL',
        yes_bid:       'TEXT',
        yes_ask:       'TEXT',
        no_bid:        'TEXT',
        no_ask:        'TEXT',
        last_price:    'TEXT',
        volume:        'TEXT',
        open_interest: 'TEXT',
        yes_bid_size:  'TEXT',
        yes_ask_size:  'TEXT',
    },
    hypertable: { timeColumn: 'time', chunkInterval: '1 hour' },
    indexes: [
        { name: 'idx_kalshi_market_tick_ws_ticker', columns: ['ticker', 'time DESC'] },
    ],
};

// ─── kalshi_trade_api ─────────────────────────────────────────────────────────
// Topic: kalshi.trade.api

export const KALSHI_TRADE_API_CONFIG: TableConfig = {
    name: 'kalshi_trade_api',
    fieldTypes: {
        time:       'TIMESTAMPTZ NOT NULL',
        ticker:     'TEXT NOT NULL',
        trade_id:   'TEXT',
        yes_price:  'TEXT',
        no_price:   'TEXT',
        count:      'TEXT',
        taker_side: 'TEXT',
    },
    hypertable: { timeColumn: 'time', chunkInterval: '1 day' },
    indexes: [
        { name: 'idx_kalshi_trade_api_ticker', columns: ['ticker', 'time DESC'] },
    ],
};

// ─── kalshi_trade_ws ──────────────────────────────────────────────────────────
// Topic: kalshi.trade.ws

export const KALSHI_TRADE_WS_CONFIG: TableConfig = {
    name: 'kalshi_trade_ws',
    fieldTypes: {
        time:       'TIMESTAMPTZ NOT NULL',
        ticker:     'TEXT NOT NULL',
        trade_id:   'TEXT',
        yes_price:  'TEXT',
        no_price:   'TEXT',
        count:      'TEXT',
        taker_side: 'TEXT',
    },
    hypertable: { timeColumn: 'time', chunkInterval: '1 day' },
    indexes: [
        { name: 'idx_kalshi_trade_ws_ticker', columns: ['ticker', 'time DESC'] },
    ],
};

// ─── kalshi_orderbook_api ─────────────────────────────────────────────────────
// Topic: kalshi.orderbook.api

export const KALSHI_ORDERBOOK_API_CONFIG: TableConfig = {
    name: 'kalshi_orderbook_api',
    fieldTypes: {
        time:   'TIMESTAMPTZ NOT NULL',
        ticker: 'TEXT NOT NULL',
        bids:   'JSONB',
        asks:   'JSONB',
    },
    hypertable: { timeColumn: 'time', chunkInterval: '1 day' },
    indexes: [
        { name: 'idx_kalshi_orderbook_api_ticker', columns: ['ticker', 'time DESC'] },
    ],
};

// ─── kalshi_orderbook_ws ──────────────────────────────────────────────────────
// Topic: kalshi.orderbook.ws

export const KALSHI_ORDERBOOK_WS_CONFIG: TableConfig = {
    name: 'kalshi_orderbook_ws',
    fieldTypes: {
        time:   'TIMESTAMPTZ NOT NULL',
        ticker: 'TEXT NOT NULL',
        bids:   'JSONB',
        asks:   'JSONB',
        seq:    'BIGINT',
    },
    hypertable: { timeColumn: 'time', chunkInterval: '1 hour' },
    indexes: [
        { name: 'idx_kalshi_orderbook_ws_ticker', columns: ['ticker', 'time DESC'] },
    ],
};

// ─── kalshi_orderbook_delta_ws ────────────────────────────────────────────────
// Topic: kalshi.orderbook_delta.ws

export const KALSHI_ORDERBOOK_DELTA_WS_CONFIG: TableConfig = {
    name: 'kalshi_orderbook_delta_ws',
    fieldTypes: {
        time:   'TIMESTAMPTZ NOT NULL',
        ticker: 'TEXT NOT NULL',
        type:   'TEXT NOT NULL',
        bids:   'JSONB',
        asks:   'JSONB',
        seq:    'BIGINT',
    },
    hypertable: { timeColumn: 'time', chunkInterval: '1 hour' },
    indexes: [
        { name: 'idx_kalshi_orderbook_delta_ws_ticker', columns: ['ticker', 'time DESC'] },
    ],
};

// ─── kalshi_cutoff_api_hist ──────────────────────────────────────────────────
// Topic: kalshi.cutoff.api_hist

export const KALSHI_CUTOFF_API_HIST_CONFIG: TableConfig = {
    name: 'kalshi_cutoff_api_hist',
    fieldTypes: {
        market_settled_ts: 'TEXT NOT NULL',
        trades_created_ts: 'TEXT NOT NULL',
        orders_updated_ts: 'TEXT NOT NULL',
    },
    indexes: [
        { name: 'idx_kalshi_cutoff_api_hist_market_settled_ts', columns: ['market_settled_ts'] },
    ],
};

// ─── kalshi_fill_api_hist ─────────────────────────────────────────────────────
// Source: GET /portfolio/fills (auth-gated, backfill only)
// Proto:  KalshiFill

export const KALSHI_FILL_API_HIST_CONFIG: TableConfig = {
    name: 'kalshi_fill_api_hist',
    fieldTypes: {
        time:       'TIMESTAMPTZ NOT NULL',
        ticker:     'TEXT NOT NULL',
        fill_id:    'TEXT NOT NULL',
        side:       'TEXT',
        action:     'TEXT',
        count:      'TEXT',
        yes_price:  'TEXT',
        no_price:   'TEXT',
        trade_id:   'TEXT',
    },
    hypertable: { timeColumn: 'time', chunkInterval: '30 days' },
    compression: { segmentBy: 'ticker', orderBy: 'time DESC', after: '7 days' },
    indexes: [
        { name: 'idx_kalshi_fill_api_hist_ticker', columns: ['ticker', 'time DESC'] },
    ],
};

// ─── kalshi_order_api_hist ────────────────────────────────────────────────────
// Source: GET /portfolio/orders (auth-gated, backfill only)
// Proto:  KalshiOrder

export const KALSHI_ORDER_API_HIST_CONFIG: TableConfig = {
    name: 'kalshi_order_api_hist',
    fieldTypes: {
        time:             'TIMESTAMPTZ NOT NULL',
        ticker:           'TEXT NOT NULL',
        order_id:         'TEXT NOT NULL',
        side:             'TEXT',
        action:           'TEXT',
        type:             'TEXT',
        status:           'TEXT',
        yes_price:        'TEXT',
        no_price:         'TEXT',
        quantity:         'TEXT',
        remaining_count:  'TEXT',
        last_update_time: 'TIMESTAMPTZ',
    },
    hypertable: { timeColumn: 'time', chunkInterval: '30 days' },
    compression: { segmentBy: 'ticker', orderBy: 'time DESC', after: '7 days' },
    indexes: [
        { name: 'idx_kalshi_order_api_hist_ticker', columns: ['ticker', 'time DESC'] },
    ],
};

// ─── kalshi_job_checkpoint ────────────────────────────────────────────────────
// Internal state table — not a hypertable (no time column).
// Proto:  KalshiJobCheckpoint

export const KALSHI_JOB_CHECKPOINT_CONFIG: TableConfig = {
    name: 'kalshi_job_checkpoint',
    fieldTypes: {
        endpoint:                 'TEXT NOT NULL PRIMARY KEY',
        auth_scope:               'TEXT NOT NULL',
        cursor:                   'TEXT',
        watermark_ts:             'TEXT',
        last_successful_batch_ts: 'TEXT NOT NULL',
    },
};

// ─── kalshi_fill_ws ───────────────────────────────────────────────────────────
// Source: private WS channel `fill`
// Proto:  KalshiFillWs

export const KALSHI_FILL_WS_CONFIG: TableConfig = {
    name: 'kalshi_fill_ws',
    fieldTypes: {
        time:          'TIMESTAMPTZ NOT NULL',
        id:            'TEXT',
        type:          'TEXT',
        sid:           'TEXT',
        seq:           'TEXT',
        channel:       'TEXT',
        fill_id:       'TEXT',
        order_id:      'TEXT',
        user_id:       'TEXT',
        market_ticker: 'TEXT',
        ticker:        'TEXT',
        side:          'TEXT',
        action:        'TEXT',
        count:         'TEXT',
        yes_price:     'TEXT',
        no_price:      'TEXT',
        is_taker:      'TEXT',
        created_time:  'TEXT',
        idempotency_key: 'TEXT',
    },
    hypertable: { timeColumn: 'time', chunkInterval: '1 day' },
    indexes: [{ name: 'idx_kalshi_fill_ws_user', columns: ['user_id', 'time DESC'] }],
};

// ─── kalshi_market_position_ws ────────────────────────────────────────────────
// Source: private WS channel `market_position`
// Proto:  KalshiMarketPositionWs

export const KALSHI_MARKET_POSITION_WS_CONFIG: TableConfig = {
    name: 'kalshi_market_position_ws',
    fieldTypes: {
        time:                 'TIMESTAMPTZ NOT NULL',
        id:                   'TEXT',
        type:                 'TEXT',
        sid:                  'TEXT',
        seq:                  'TEXT',
        channel:              'TEXT',
        user_id:              'TEXT',
        market_ticker:        'TEXT',
        ticker:               'TEXT',
        position:             'TEXT',
        market_exposure:      'TEXT',
        realized_pnl:         'TEXT',
        total_traded:         'TEXT',
        resting_orders_count: 'TEXT',
        last_updated_time:    'TEXT',
        idempotency_key:      'TEXT',
    },
    hypertable: { timeColumn: 'time', chunkInterval: '1 day' },
    indexes: [{ name: 'idx_kalshi_market_position_ws_user', columns: ['user_id', 'ticker', 'time DESC'] }],
};

// ─── kalshi_market_lifecycle_ws ───────────────────────────────────────────────
// Source: private WS channel `market_lifecycle`
// Proto:  KalshiMarketLifecycleWs

export const KALSHI_MARKET_LIFECYCLE_WS_CONFIG: TableConfig = {
    name: 'kalshi_market_lifecycle_ws',
    fieldTypes: {
        time:            'TIMESTAMPTZ NOT NULL',
        id:              'TEXT',
        type:            'TEXT',
        sid:             'TEXT',
        seq:             'TEXT',
        channel:         'TEXT',
        market_ticker:   'TEXT',
        ticker:          'TEXT',
        status:          'TEXT',
        previous_status: 'TEXT',
        open_time:       'TEXT',
        close_time:      'TEXT',
        expiration_time: 'TEXT',
        idempotency_key: 'TEXT',
    },
    hypertable: { timeColumn: 'time', chunkInterval: '7 days' },
    indexes: [{ name: 'idx_kalshi_market_lifecycle_ws_ticker', columns: ['ticker', 'time DESC'] }],
};

// ─── kalshi_event_lifecycle_ws ────────────────────────────────────────────────
// Source: private WS channel `event_lifecycle`
// Proto:  KalshiEventLifecycleWs

export const KALSHI_EVENT_LIFECYCLE_WS_CONFIG: TableConfig = {
    name: 'kalshi_event_lifecycle_ws',
    fieldTypes: {
        time:            'TIMESTAMPTZ NOT NULL',
        id:              'TEXT',
        type:            'TEXT',
        sid:             'TEXT',
        seq:             'TEXT',
        channel:         'TEXT',
        event_ticker:    'TEXT',
        status:          'TEXT',
        previous_status: 'TEXT',
        open_time:       'TEXT',
        close_time:      'TEXT',
        expiration_time: 'TEXT',
        series_ticker:   'TEXT',
        idempotency_key: 'TEXT',
    },
    hypertable: { timeColumn: 'time', chunkInterval: '7 days' },
    indexes: [{ name: 'idx_kalshi_event_lifecycle_ws_event', columns: ['event_ticker', 'time DESC'] }],
};

// ─── kalshi_multivariate_market_lifecycle_ws ──────────────────────────────────
// Source: private WS channel `multivariate_market_lifecycle`
// Proto:  KalshiMultivariateMarketLifecycleWs

export const KALSHI_MULTIVARIATE_MARKET_LIFECYCLE_WS_CONFIG: TableConfig = {
    name: 'kalshi_multivariate_market_lifecycle_ws',
    fieldTypes: {
        time:            'TIMESTAMPTZ NOT NULL',
        id:              'TEXT',
        type:            'TEXT',
        sid:             'TEXT',
        seq:             'TEXT',
        channel:         'TEXT',
        market_ticker:   'TEXT',
        ticker:          'TEXT',
        event_ticker:    'TEXT',
        status:          'TEXT',
        previous_status: 'TEXT',
        open_time:       'TEXT',
        close_time:      'TEXT',
        expiration_time: 'TEXT',
        idempotency_key: 'TEXT',
    },
    hypertable: { timeColumn: 'time', chunkInterval: '7 days' },
    indexes: [{ name: 'idx_kalshi_mv_market_lifecycle_ws_ticker', columns: ['ticker', 'time DESC'] }],
};

// ─── kalshi_multivariate_lookup_ws ────────────────────────────────────────────
// Source: private WS channel `multivariate_lookups`
// Proto:  KalshiMultivariateLookupWs
// Note:   `lookups` is JSON-serialized array string

export const KALSHI_MULTIVARIATE_LOOKUP_WS_CONFIG: TableConfig = {
    name: 'kalshi_multivariate_lookup_ws',
    fieldTypes: {
        time:            'TIMESTAMPTZ NOT NULL',
        id:              'TEXT',
        type:            'TEXT',
        sid:             'TEXT',
        seq:             'TEXT',
        channel:         'TEXT',
        event_ticker:    'TEXT',
        lookups:         'TEXT',
        idempotency_key: 'TEXT',
    },
    hypertable: { timeColumn: 'time', chunkInterval: '7 days' },
    indexes: [{ name: 'idx_kalshi_mv_lookup_ws_event', columns: ['event_ticker', 'time DESC'] }],
};

// ─── kalshi_communication_ws ──────────────────────────────────────────────────
// Source: private WS channel `communications`
// Proto:  KalshiCommunicationWs

export const KALSHI_COMMUNICATION_WS_CONFIG: TableConfig = {
    name: 'kalshi_communication_ws',
    fieldTypes: {
        time:            'TIMESTAMPTZ NOT NULL',
        id:              'TEXT',
        type:            'TEXT',
        sid:             'TEXT',
        seq:             'TEXT',
        channel:         'TEXT',
        user_id:         'TEXT',
        msg_id:          'TEXT',
        msg_type:        'TEXT',
        subject:         'TEXT',
        body:            'TEXT',
        created_time:    'TEXT',
        is_read:         'TEXT',
        idempotency_key: 'TEXT',
    },
    hypertable: { timeColumn: 'time', chunkInterval: '7 days' },
    indexes: [{ name: 'idx_kalshi_communication_ws_user', columns: ['user_id', 'time DESC'] }],
};

// ─── kalshi_order_group_update_ws ─────────────────────────────────────────────
// Source: private WS channel `order_group_update`
// Proto:  KalshiOrderGroupUpdateWs
// Note:   `orders` is JSON-serialized array string

export const KALSHI_ORDER_GROUP_UPDATE_WS_CONFIG: TableConfig = {
    name: 'kalshi_order_group_update_ws',
    fieldTypes: {
        time:            'TIMESTAMPTZ NOT NULL',
        id:              'TEXT',
        type:            'TEXT',
        sid:             'TEXT',
        seq:             'TEXT',
        channel:         'TEXT',
        user_id:         'TEXT',
        group_id:        'TEXT',
        status:          'TEXT',
        orders:          'TEXT',
        created_time:    'TEXT',
        updated_time:    'TEXT',
        idempotency_key: 'TEXT',
    },
    hypertable: { timeColumn: 'time', chunkInterval: '1 day' },
    indexes: [{ name: 'idx_kalshi_order_group_update_ws_user', columns: ['user_id', 'group_id', 'time DESC'] }],
};

// ─── kalshi_user_order_ws ─────────────────────────────────────────────────────
// Source: private WS channel `user_orders`
// Proto:  KalshiUserOrderWs
// Note:   `order_type` maps to WS payload "type" field (limit|market)

export const KALSHI_USER_ORDER_WS_CONFIG: TableConfig = {
    name: 'kalshi_user_order_ws',
    fieldTypes: {
        time:            'TIMESTAMPTZ NOT NULL',
        id:              'TEXT',
        type:            'TEXT',
        sid:             'TEXT',
        seq:             'TEXT',
        channel:         'TEXT',
        user_id:         'TEXT',
        order_id:        'TEXT',
        market_ticker:   'TEXT',
        ticker:          'TEXT',
        side:            'TEXT',
        action:          'TEXT',
        order_type:      'TEXT',
        yes_price:       'TEXT',
        no_price:        'TEXT',
        count:           'TEXT',
        remaining_count: 'TEXT',
        filled_count:    'TEXT',
        status:          'TEXT',
        created_time:    'TEXT',
        updated_time:    'TEXT',
        expiration_time: 'TEXT',
        order_group_id:  'TEXT',
        idempotency_key: 'TEXT',
    },
    hypertable: { timeColumn: 'time', chunkInterval: '1 day' },
    indexes: [{ name: 'idx_kalshi_user_order_ws_user', columns: ['user_id', 'order_id', 'time DESC'] }],
};


// ════════════════════════════════════════════════════════════════════════════
// KALSHI — ARB dimension + output tables (ClickHouse only, direct-insert)
// ════════════════════════════════════════════════════════════════════════════

// ─── market_underlying_link ──────────────────────────────────────────────────
// Proto:  KalshiMarketUnderlyingLink
// Engine: ReplacingMergeTree(updated_at), ORDER BY (market_ticker)
// Write:  direct-insert (not a Kafka topic)

export const KALSHI_MARKET_UNDERLYING_LINK_CONFIG: TableConfig = {
    name: 'market_underlying_link',
    fieldTypes: {
        market_ticker:        'String',
        series:               'String',
        event_ticker:         'String',
        underlying_kind:      'String',
        underlying_symbol:    'String',
        city_id:              'String',
        strike_type:          'String',
        strike_floor_scaled:  'Int64',
        strike_cap_scaled:    'Int64',
        strike_unit:          'String',
        resolution_ts:        'DateTime64(3)',
        resolution_source:    'String',
        tz:                   'String',
        updated_at:           'DateTime64(3)',
        ingested_at:          'DateTime64(3)',
    },
    // ClickHouse only — no hypertable/compression (TimescaleDB not used)
};

// ─── fair_value ───────────────────────────────────────────────────────────────
// Proto:  KalshiFairValue
// Engine: ReplacingMergeTree(ingested_at), PARTITION BY toDate(time),
//         ORDER BY (market_ticker, model_id, time), TTL 30 days
// Write:  direct-insert (not a Kafka topic)

export const KALSHI_FAIR_VALUE_CONFIG: TableConfig = {
    name: 'fair_value',
    fieldTypes: {
        time:                  'DateTime64(3)',
        market_ticker:         'String',
        model_id:              'String',
        fair_yes_bps:          'Int32',
        market_yes_mid_cents:  'Int32',
        divergence_bps:        'Int32',
        inputs_json:           'String',
        feature_asof_ts:       'DateTime64(3)',
        ingested_at:           'DateTime64(3)',
    },
    // ClickHouse only — no hypertable/compression (TimescaleDB not used)
};
