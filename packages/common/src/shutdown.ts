import { disconnectProducer } from './kafka.js';
import { log } from './logger';

/**
 * Registers a single SIGINT/SIGTERM handler that stops app work, drains the
 * Kafka producer, then exits. A watchdog forces exit(1) after timeoutMs so a
 * hung stop()/disconnect never outlives the k8s termination grace period
 * (default 20 s < terminationGracePeriodSeconds 30). A second signal forces
 * immediate exit(1).
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
        try {
            await disconnectProducer();
        } catch (err) {
            log('warn', name, 'disconnectProducer failed during shutdown', {
                err,
            });
        }
        process.exit(0);
    };

    process.on('SIGINT', onSignal);
    process.on('SIGTERM', onSignal);
}
