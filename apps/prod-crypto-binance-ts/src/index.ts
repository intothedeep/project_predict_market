/**
 * Binance Crypto Producer
 * =======================
 * Connects to Binance WS and publishes trade and ticker messages to Kafka.
 * BTC-only (§3.3). No orderbook — Q2 closed: Binance/Coinbase are
 * tick/trade only, no crypto orderbook collection in MVP1.
 *
 * Run: pnpm --filter @repo/prod-crypto-binance-ts dev
 * Or:  pnpm --filter @repo/prod-crypto-binance-ts produce
 */

import { log, registerShutdown, startHeartbeatFile } from '@repo/common';
import { initProducer, disconnectProducer } from '@repo/common/kafka';
import '@repo/env';
import { connectBinance } from './ws/connect.ws';
import { COINS } from './config';

async function main() {
    await initProducer();

    const handle = connectBinance();

    log('info', 'binance', 'crypto producer started', {
        exchange: 'binance',
        coinCount: COINS.length,
        coins: COINS,
    });

    const heartbeat = startHeartbeatFile();

    registerShutdown({
        name: 'binance',
        stop: async () => {
            handle.stop();
            heartbeat.stop();
            await disconnectProducer();
        },
    });
}

main().catch((e) => {
    log('error', 'binance', 'fatal', { error: e });
    process.exit(1);
});
