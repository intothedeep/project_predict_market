/**
 * Kalshi crypto series tickers, grouped by coin.
 * Source: https://api.elections.kalshi.com/trade-api/v2/series?category=Crypto
 * Covers market types: 15 Minute, Hourly, Daily, Weekly, Monthly, Annual, One Time.
 *
 * BTC 한정 (MVP1, §3.3) — ETH/SOL/XRP/DOGE/BNB/HYPE entries trimmed.
 */

export const CRYPTO_SERIES_BY_COIN = {
    BTC: [
        // 15 Minute
        'KXBTC15M',
        // Hourly
        'KXBTC',
        'KXBTCD',
        // Daily
        'BTC',
        'BTCD',
        'BTCD-B',
        'KXBTCMAXD',
        // Weekly
        'KXBTCMAXW',
        // Monthly
        'BTCMAXM',
        'KXBTCMAXM',
        'KXBTCMAXMON',
        'KXBTCMINMON',
        // Annual
        'BTCMAX100',
        'BTCMAXY',
        'BTCMINMAXY',
        'KXBTCMAX100',
        'KXBTCMAXY',
        'KXBTCMINMAXY',
        'KXBTCY',
        // One Time
        'BTCATH',
        'BTCMINY',
        'KXBTC2025100',
        'KXBTC2026200',
        'KXBTC2026250',
        'KXBTCATH',
        'KXBTCMINY',
        'KXBTCYEAR',
    ],
} as const;

export const CRYPTO_SERIES_ARR: readonly string[] = Object.values(
    CRYPTO_SERIES_BY_COIN
).flat();

// Explicit list of crypto 15-minute settlement series.
// Hardcoded to break loudly if Kalshi renames a series (vs. silent drift).
// Reaudit periodically if Kalshi adds new coins or changes existing tickers.
export const CRYPTO_15M_SERIES_ARR = ['KXBTC15M'] as const;
