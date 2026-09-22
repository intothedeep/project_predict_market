/**
 * Coinbase Subscription Builder
 * =============================
 * Constructs and sends subscription message for ticker and matches channels.
 */

import WebSocket from 'ws';
import { PRODUCTS } from '../config';
import { log } from '@repo/common';

export function sendSubscription(ws: WebSocket): void {
    try {
        ws.send(
            JSON.stringify({
                type: 'subscribe',
                channels: [
                    { name: 'ticker', product_ids: PRODUCTS },
                    { name: 'matches', product_ids: PRODUCTS },
                ],
            })
        );
        log('info', 'coinbase-ws', 'subscription sent', { channels: ['ticker', 'matches'], products: PRODUCTS });
    } catch (err) {
        log('error', 'coinbase-ws', 'subscription error', { error: String(err) });
    }
}
