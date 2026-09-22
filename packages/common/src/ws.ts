/**
 * Reconnecting WebSocket wrapper
 * Automatically reconnects on disconnect
 */

import WebSocket from 'ws';
import { log } from './logger';

interface ReconnectWSOptions {
    name: string;
    url: string;
    onMessage: (
        data: string,
        ctx: { ws: WebSocket; reconnect: () => void }
    ) => void;
    onOpen?: (ws: WebSocket) => void;
    headers?: Record<string, string>;
    reconnectDelayMs?: number;
    pingIntervalMs?: number;
}

export function createReconnectingWS(opts: ReconnectWSOptions): {
    stop: () => void;
} {
    const {
        name,
        url,
        onMessage,
        onOpen,
        headers,
        reconnectDelayMs = 3_000,
        pingIntervalMs,
    } = opts;

    let ws: WebSocket | null = null;
    let stopped = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let pingTimer: ReturnType<typeof setInterval> | null = null;

    function clearPingTimer() {
        if (pingTimer) {
            clearInterval(pingTimer);
            pingTimer = null;
        }
    }

    function scheduleReconnect() {
        if (stopped || reconnectTimer) return;
        reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            connect();
        }, reconnectDelayMs);
    }

    function reconnect() {
        clearPingTimer();
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.close();
            return;
        }
        scheduleReconnect();
    }

    function connect() {
        if (stopped) return;

        log('info', name, `connecting to ${url}`);
        ws = new WebSocket(url, { headers });

        ws.on('open', () => {
            log('info', name, 'connected');

            if (onOpen && ws) {
                try {
                    onOpen(ws);
                } catch (error) {
                    log('error', name, `onOpen handler error: ${error}`);
                }
            }

            // Start ping timer if configured
            if (pingIntervalMs && ws) {
                pingTimer = setInterval(() => {
                    if (ws && ws.readyState === WebSocket.OPEN) {
                        ws.ping();
                    }
                }, pingIntervalMs);
            }
        });

        ws.on('message', (data: Buffer) => {
            try {
                if (!ws) return;
                onMessage(data.toString(), { ws, reconnect });
            } catch (error) {
                log('error', name, `message handler error: ${error}`);
            }
        });

        ws.on('error', (error) => {
            log('error', name, `websocket error: ${error.message}`);
        });

        ws.on('close', () => {
            log(
                'warn',
                name,
                `disconnected, reconnecting in ${reconnectDelayMs}ms`
            );

            clearPingTimer();

            if (!stopped) {
                scheduleReconnect();
            }
        });
    }

    connect();

    return {
        stop: () => {
            stopped = true;
            if (reconnectTimer) {
                clearTimeout(reconnectTimer);
                reconnectTimer = null;
            }
            if (pingTimer) {
                clearInterval(pingTimer);
                pingTimer = null;
            }
            if (ws) {
                ws.close();
                ws = null;
            }
            log('info', name, 'stopped');
        },
    };
}
