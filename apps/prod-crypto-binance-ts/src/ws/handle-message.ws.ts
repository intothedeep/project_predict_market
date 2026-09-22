/**
 * Binance Message Dispatcher
 * ===========================
 * Routes inbound WS messages to appropriate stream parser.
 * No @depth route — Q2 closed: no crypto orderbook collection in MVP1.
 */

import { createRateLimitedLog } from '@repo/common';
import { parseTrade } from './parse-trade.ws';
import { parseTicker } from './parse-ticker.ws';

const logParseError = createRateLimitedLog('binance-ws');

/**
 * Dispatches a raw Binance combined-stream message to the correct parser.
 * Extracts the stream field and routes based on stream type.
 */
export function handleBinanceMessage(raw: string): void {
    try {
        const message = JSON.parse(raw);
        const stream: string = message.stream ?? '';
        const data = message.data;

        if (!data) return;

        if (stream.includes('@trade')) {
            parseTrade(data);
        } else if (stream.includes('@miniTicker')) {
            parseTicker(data);
        }
    } catch (e) {
        logParseError('warn', 'ws message parse failed', {
            err: e,
            sample: raw.slice(0, 200),
        });
    }
}
