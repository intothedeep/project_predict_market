/**
 * mockSource — replays a `.jsonl` mock file as if it were the
 * `pred.orderbook.ws` topic (§4.5). Each line is byte-for-byte the same as
 * what a producer would put on the wire (§3.6), so decoding it is exactly
 * @repo/schema's PROTO_DECODERS — no mock-specific parsing.
 *
 * Loops the file indefinitely at `intervalMs` so the writer keeps running
 * (heartbeat stays fresh) past a single pass, matching "replay like
 * real-time" (§4.5).
 */

import { readFileSync } from 'node:fs';
import { PROTO_DECODERS } from '@repo/schema';
import { log } from '@repo/common';
import type { DecodedOrderbook, MessageSource } from './message-source';

const TOPIC = 'pred.orderbook.ws';
const SERVICE = 'orderbook-writer';
const encoder = new TextEncoder();

function readLines(filePath: string): string[] {
    const lines = readFileSync(filePath, 'utf-8')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    if (lines.length === 0) {
        throw new Error(`mockSource: file has no lines: ${filePath}`);
    }
    return lines;
}

export function createMockSource(
    filePath: string,
    intervalMs: number
): MessageSource {
    const lines = readLines(filePath);
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    return {
        async subscribe(topic, onMessage) {
            if (topic !== TOPIC) {
                throw new Error(
                    `mockSource only serves ${TOPIC}, got: ${topic}`
                );
            }
            const decode = PROTO_DECODERS[TOPIC];

            let index = 0;
            const tick = (): void => {
                if (stopped) return;
                const line = lines[index % lines.length];
                index += 1;
                try {
                    const decoded = decode(
                        encoder.encode(line)
                    ) as unknown as DecodedOrderbook;
                    onMessage(decoded);
                } catch (err) {
                    log('error', SERVICE, 'mock line decode failed', {
                        err,
                        line,
                    });
                }
                timer = setTimeout(tick, intervalMs);
            };
            tick();
        },
        async close() {
            stopped = true;
            if (timer) clearTimeout(timer);
        },
    };
}
