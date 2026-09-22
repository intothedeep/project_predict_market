/**
 * Binance Configuration
 * =====================
 * Centralized constants for Binance WS streams and coin symbols.
 *
 * BTC 한정 (MVP1, 00.architecture.mvp1.md §3.3) — ETH/SOL/XRP trimmed.
 */

export const COINS = ['btcusdt'];

export const WS_URL = 'wss://stream.binance.com:9443/stream';
