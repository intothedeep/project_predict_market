/**
 * Coinbase Message Dispatcher
 * ===========================
 * Routes inbound Coinbase messages to appropriate parser.
 * Silently ignores unhandled types (subscriptions, heartbeats, etc).
 */

import { createRateLimitedLog } from '@repo/common';
import { parseTrade } from './parse-trade.ws';
import { parseTicker } from './parse-ticker.ws';

const logParseError = createRateLimitedLog('crypto-coinbase-ws');

export function handleCoinbaseMessage(raw: string): void {
    let data: any;
    try {
        data = JSON.parse(raw);
    } catch (err) {
        logParseError('warn', 'ws message parse failed', {
            err,
            sample: raw.slice(0, 200),
        });
        return;
    }

    const type: string = data.type ?? '';

    if (type === 'match' || type === 'last_match') {
        parseTrade(data);
    } else if (type === 'ticker') {
        parseTicker(data);
    }
    // Silently ignore subscription, heartbeat, and other message types
}
