import { createOrderbookReconstructor } from './orderbook-reconstructor';
import { createKalshiOrderbookAdapter } from '../adapters/kalshi-orderbook.adapter';

export function createOrderbookDeltaHandler(reconnect: () => void): {
    handle: (msg: Record<string, unknown>) => void;
    stop: () => void;
} {
    const reconstructor = createOrderbookReconstructor(
        createKalshiOrderbookAdapter()
    );

    return {
        handle: (msg: Record<string, unknown>) => {
            reconstructor.handle(msg, reconnect);
        },
        stop: () => {
            reconstructor.stop();
        },
    };
}
