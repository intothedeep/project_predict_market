/**
 * Coinbase Crypto Producer — Entry Point
 * =======================================
 * Starts Coinbase WebSocket stream, publishes trades and ticker updates to Kafka.
 */

import { log, registerShutdown, startHeartbeatFile } from '@repo/common';
import { initProducer, disconnectProducer } from '@repo/common/kafka';
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
        stop: async () => {
            handle.stop();
            heartbeat.stop();
            await disconnectProducer();
        },
    });
}

main().catch((e) => {
    log('error', 'crypto-coinbase', 'fatal', { error: e });
    process.exit(1);
});
