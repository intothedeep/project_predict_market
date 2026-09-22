import { createReconnectingWS } from '@repo/common';
import type { KalshiSigner } from '@repo/kalshi-core';

export { createReconnectingWS };

export function makeWsHeaders(sign: KalshiSigner): Record<string, string> {
    return sign('GET', '/trade-api/ws/v2');
}
