/**
 * Coinbase Crypto Producer — Entry Point
 * =======================================
 * Starts Coinbase WebSocket stream, publishes trades and ticker updates to Kafka.
 */

import { initProducer, log, registerShutdown, startHeartbeatFile } from '@repo/common';
import '@repo/env';
import { connectCoinbase } from './ws/connect.ws';
import { PRODUCTS } from './config';

async function main() {
    await initProducer();

    const handle = connectCoinbase();

    log('info', 'crypto-coinbase', 'producer started', {
        exchange: 'coinbase',
        products: PRODUCTS.length,
    });

    const heartbeat = startHeartbeatFile();

    registerShutdown({
        name: 'crypto-coinbase',
        stop: () => {
            handle.stop();
            heartbeat.stop();
        },
    });
}

main().catch((e) => {
    console.error('Fatal:', e);
    process.exit(1);
});
