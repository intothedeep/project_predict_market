/**
 * Kalshi crypto series → underlying exchange proxy symbols.
 *
 * Settlement basis: Kalshi crypto contracts settle on CF Benchmarks indices
 * (e.g. BRTI for BTC). Exchange spot prices are a proxy only — basis risk
 * exists between spot and the CF Benchmarks fixing.
 *
 * BTC 한정 (MVP1, §3.3) — ETH/SOL/XRP/DOGE/BNB/HYPE entries trimmed along
 * with CRYPTO_15M_SERIES_ARR in ./crypto.ts.
 *
 * coinbaseSymbol: BASE-USD form. binanceSymbol: BASEUSDT form.
 * Producer subscriptions verified from:
 *   apps/prod-crypto-coinbase-ts/src/config.ts  → PRODUCTS = ['BTC-USD']
 *   apps/prod-crypto-binance-ts/src/config.ts   → COINS    = ['btcusdt']
 */

import { CRYPTO_15M_SERIES_ARR } from './crypto';

export interface CryptoUnderlying {
    /** Base coin ticker (e.g. 'BTC'). */
    coin: string;
    coinbaseSymbol: string | null;
    binanceSymbol: string | null;
}

export const CRYPTO_UNDERLYING_BY_SERIES: Readonly<
    Record<(typeof CRYPTO_15M_SERIES_ARR)[number], CryptoUnderlying>
> = {
    KXBTC15M: {
        coin: 'BTC',
        coinbaseSymbol: 'BTC-USD', // prod-crypto-coinbase-ts PRODUCTS ✓
        binanceSymbol: 'BTCUSDT',  // prod-crypto-binance-ts COINS ✓
    },
} as const;

/**
 * Returns the exchange-proxy entry for a given Kalshi series ticker,
 * or undefined if the series is not a known HOT crypto series.
 */
export function getUnderlyingForSeries(series: string): CryptoUnderlying | undefined {
    return CRYPTO_UNDERLYING_BY_SERIES[series as keyof typeof CRYPTO_UNDERLYING_BY_SERIES];
}
