/**
 * Binance WebSocket Connection
 * =============================
 * Orchestrates persistent WS connection with reconnection handling.
 */

import { createReconnectingWS, log } from '@repo/common';
import { COINS } from '../config';
import { buildStreamUrl } from './subscribe.ws';
import { handleBinanceMessage } from './handle-message.ws';

/**
 * Connects to Binance combined-stream WS and returns a handle with .stop() method.
 */
export function connectBinance() {
    const url = buildStreamUrl(COINS);

    log('info', 'binance', 'connecting to Binance WS', {
        coinCount: COINS.length,
        coins: COINS,
    });

    return createReconnectingWS({
        name: 'binance',
        url,
        onMessage: handleBinanceMessage,
    });
}
