/**
 * Generic batch buffer — shared across all insert paths.
 * Accumulates items and flushes when either:
 *   - buffer reaches maxSize
 *   - flushIntervalMs has passed
 */

import { log } from '@repo/common';

export interface BatchBufferOpts<T> {
    name: string;
    maxSize: number;
    flushIntervalMs: number;
    flush: (items: T[]) => Promise<void>;
}

export class BatchBuffer<T> {
    private buffer: T[] = [];
    private timer: ReturnType<typeof setInterval>;
    private opts: BatchBufferOpts<T>;
    private flushing = false;

    constructor(opts: BatchBufferOpts<T>) {
        this.opts = opts;
        this.timer = setInterval(() => this.doFlush(), opts.flushIntervalMs);
    }

    push(item: T): void {
        this.buffer.push(item);
        if (this.buffer.length >= this.opts.maxSize) {
            this.doFlush();
        }
    }

    private async doFlush(): Promise<void> {
        if (this.flushing || this.buffer.length === 0) return;
        this.flushing = true;

        const batch = this.buffer.splice(0, this.opts.maxSize);
        try {
            await this.opts.flush(batch);
        } catch (e) {
            log(
                'error',
                this.opts.name,
                `flush failed (${batch.length} items): ${e}`
            );
            this.buffer.unshift(...batch);
        } finally {
            this.flushing = false;
        }
    }

    async stop(): Promise<void> {
        clearInterval(this.timer);
        if (this.buffer.length > 0) {
            await this.doFlush();
        }
    }

    get size(): number {
        return this.buffer.length;
    }
}
