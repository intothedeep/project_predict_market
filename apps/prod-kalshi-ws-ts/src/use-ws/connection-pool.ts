import type WebSocket from 'ws';
import { createRateLimitedLog, createReconnectingWS } from '@repo/common';
import { createHeartbeatMonitor } from './heartbeat.ws';

export function createConnectionPool(opts: {
    name: string;
    url: string;
    headers?: () => Record<string, string>;
    onOpen: (ws: WebSocket) => void;
    onMessage: (msg: Record<string, unknown>, reconnect: () => void) => void;
    heartbeatTimeoutMs?: number;
}): { stop: () => void } {
    const {
        name,
        url,
        headers,
        onOpen,
        onMessage,
        heartbeatTimeoutMs = 30_000,
    } = opts;

    let heartbeat: ReturnType<typeof createHeartbeatMonitor> | null = null;
    const logParseError = createRateLimitedLog(name);

    const pool = createReconnectingWS({
        name,
        url,
        headers: headers?.(),
        onOpen: (ws: WebSocket) => {
            if (heartbeat) {
                heartbeat.stop();
            }
            heartbeat = createHeartbeatMonitor(
                name,
                () => {
                    // Trigger reconnect via closing the connection
                    ws.close();
                },
                heartbeatTimeoutMs
            );
            onOpen(ws);
        },
        onMessage: (data: string, ctx: { ws: WebSocket; reconnect: () => void }) => {
            let msg: Record<string, unknown>;
            try {
                msg = JSON.parse(data);
            } catch (err) {
                logParseError('warn', `${name} parse failed`, {
                    err,
                    sample: data.slice(0, 200),
                });
                return;
            }
            heartbeat?.recordMessage();
            // Outside the try — handler errors must propagate loudly,
            // not be swallowed as parse errors.
            onMessage(msg, ctx.reconnect);
        },
    });

    return {
        stop: () => {
            heartbeat?.stop();
            pool.stop();
        },
    };
}
