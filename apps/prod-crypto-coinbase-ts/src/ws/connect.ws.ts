/**
 * Coinbase WebSocket Orchestration
 * =================================
 * Manages persistent connection with reconnection and subscription.
 */

import WebSocket from 'ws';
import { createReconnectingWS } from '@repo/common';
import { WS_URL } from '../config';
import { sendSubscription } from './subscribe.ws';
import { handleCoinbaseMessage } from './handle-message.ws';

export function connectCoinbase() {
    return createReconnectingWS({
        name: 'coinbase',
        url: WS_URL,
        onOpen: (ws: WebSocket) => {
            sendSubscription(ws);
        },
        onMessage: handleCoinbaseMessage,
    });
}
