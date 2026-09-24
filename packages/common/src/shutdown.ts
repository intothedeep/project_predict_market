import { log } from './logger';

/**
 * Registers a single SIGINT/SIGTERM handler that runs `stop()`, then exits.
 * A watchdog forces exit(1) after timeoutMs so a hung stop() never outlives
 * the k8s termination grace period (default 20 s < terminationGracePeriodSeconds
 * 30). A second signal forces immediate exit(1).
 *
 * Kafka producer drain is NOT done here (00.architecture.mvp1.md §7.1.2,
 * U19) — this module must stay Kafka-free so non-producer processes
 * (apps/api, apps/orderbook-writer) importing @repo/common don't map the
 * librdkafka native binary. Producers call @repo/common/kafka's
 * disconnectProducer() themselves inside their own `stop`.
 */
export function registerShutdown(opts: {
    name: string;
    stop?: () => void | Promise<void>;
    timeoutMs?: number;
}): void {
    const { name, stop, timeoutMs = 20_000 } = opts;
    let shuttingDown = false;

    const onSignal = async (): Promise<void> => {
        if (shuttingDown) {
            log('warn', name, 'forced exit');
            process.exit(1);
            return;
        }
        shuttingDown = true;

        log('info', name, 'shutting down...');
        setTimeout(() => {
            log('error', name, 'shutdown timeout — forcing exit');
            process.exit(1);
        }, timeoutMs).unref();

        try {
            await stop?.();
        } catch (err) {
            log('warn', name, 'stop() threw during shutdown', { err });
        }
        process.exit(0);
    };

    process.on('SIGINT', onSignal);
    process.on('SIGTERM', onSignal);
}
