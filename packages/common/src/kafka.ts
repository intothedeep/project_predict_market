/**
 * Shared Kafka Producer
 * =====================
 * One BufferedKafkaProducer per topic. Single-consumer queue model: enqueue is
 * lock-free, a single async worker drains the queue and calls librdkafka's
 * produce(). librdkafka batches and compresses on the wire (gzip by default).
 *
 * Idempotence is OFF — dedup is handled at the application layer via stable
 * idempotency keys (ticker, market key, candle key, etc.) and downstream sinks
 * (e.g. ClickHouse ReplacingMergeTree).
 *
 * Shutdown contract:
 *   1. Stop accepting new enqueues (`closed = true`).
 *   2. Drain the in-process queue until empty AND no worker running.
 *   3. librdkafka `flush()` waits for all in-flight produces to be acked.
 *   4. `disconnect()` closes the broker handle.
 *
 * Backed by @confluentinc/kafka-javascript native librdkafka API.
 */

import pkg from '@confluentinc/kafka-javascript';
import type { LibrdKafkaError } from '@confluentinc/kafka-javascript';
import { KAFKA_BOOTSTRAP, DRY_RUN as ENV_DRY_RUN } from '@repo/env';
import { log } from './logger';
import { envInt } from './utils';

const { Producer } = pkg;
type Producer = InstanceType<typeof Producer>;

const DRY_RUN = ENV_DRY_RUN;
const BATCH_SIZE = envInt('KAFKA_BATCH_SIZE', 100);
const FLUSH_MS = envInt('KAFKA_BATCH_FLUSH_MS', 2000);
const FLUSH_TIMEOUT_MS = envInt('KAFKA_FLUSH_TIMEOUT_MS', 5000);
const POLL_INTERVAL_MS = envInt('KAFKA_POLL_INTERVAL_MS', 100);

type Topic = string;

interface BufferedMessage {
    key: string;
    value: Buffer;
    headers?: Record<string, string>;
    timestamp: number;
}

class BufferedKafkaProducer {
    private readonly topic: Topic;
    private queue: BufferedMessage[] = [];
    private running = false;
    private closed = false;
    private workerPromise: Promise<void> | null = null;
    private producer: Producer | null = null;
    private flushTimer: ReturnType<typeof setInterval> | null = null;
    private initPromise: Promise<void> | null = null;

    constructor(topic: Topic) {
        this.topic = topic;
    }

    async init(): Promise<void> {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = this.connect().catch((error) => {
            this.initPromise = null;
            throw error;
        });

        return this.initPromise;
    }

    private async connect(): Promise<void> {
        if (DRY_RUN) {
            log(
                'info',
                'kafka',
                `DRY_RUN mode enabled for ${this.topic}. Kafka producer will only print to console.`
            );
            return;
        }

        // Fail loudly where the value is needed, in the process that needs
        // it — not at module load (00.architecture.mvp1.md §7.1.2, U19). A
        // silent `?? 'localhost:9092'` default here is the same
        // plausible-substitution shape as the empty idempotency_key and the
        // ACTIVE_STATUSES mismatch this document has flagged before.
        if (!KAFKA_BOOTSTRAP) {
            throw new Error(
                `KAFKA_BOOTSTRAP is not set — cannot connect producer for topic ${this.topic}`
            );
        }
        const BOOTSTRAP = KAFKA_BOOTSTRAP;

        log('info', 'kafka', `KAFKA_BOOTSTRAP: ${BOOTSTRAP}`);

        const producer = new Producer({
            'bootstrap.servers': BOOTSTRAP,
            'client.id': `producer-${process.pid}-${this.topic}`,
            // Idempotent producer disabled: application-level idempotency keys
            // (ticker, market key, candle key, etc.) handle dedup downstream.
            // Avoids the librdkafka GETPID handshake noise on rapid shutdown.
            'enable.idempotence': false,
            'compression.codec': 'gzip',
            // librdkafka log severity threshold (3=ERR). event.log handler
            // below filters remaining noise by facility.
            log_level: 3,
            dr_cb: false,
        });

        // Filter noisy librdkafka shutdown-phase facility logs.
        // GETPID/TERMINATE are emitted during fast disconnects and are not
        // actionable — they say "retrying" but the producer is shutting down.
        producer.on(
            'event.log',
            (entry: { fac?: string; message?: string }) => {
                const fac = entry.fac;
                if (fac === 'GETPID' || fac === 'TERMINATE') return;
                log('warn', 'kafka', `${fac ?? '?'}: ${entry.message ?? ''}`);
            }
        );

        producer.on('event.error', (err: LibrdKafkaError) => {
            log('error', 'kafka', `producer error: ${err.message}`);
        });

        await new Promise<void>((resolve, reject) => {
            producer.once('ready', () => resolve());
            producer.once('connection.failure', (err: LibrdKafkaError) =>
                reject(new Error(err.message))
            );
            producer.connect();
        });

        // Required for librdkafka events (event.log, event.error, etc.) to be
        // delivered to the JS layer.
        producer.setPollInterval(POLL_INTERVAL_MS);

        this.producer = producer;
        log(
            'info',
            'kafka',
            `producer connected for ${this.topic} to ${BOOTSTRAP}`
        );

        this.flushTimer = setInterval(() => this.startWorker(), FLUSH_MS);
    }

    async disconnect(): Promise<void> {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }

        // Refuse new enqueues so late fire-and-forget callers can't race shutdown.
        this.closed = true;

        // Drain in a loop: a worker may spawn from microtasks that run between
        // awaits, so a single `await this.workerPromise` is not sufficient.
        while (this.queue.length > 0 || this.running) {
            this.startWorker();
            if (this.workerPromise) await this.workerPromise;
        }

        if (this.producer) {
            const producer = this.producer;

            // librdkafka native flush — block until all in-flight produce
            // requests are acked or the timeout elapses.
            await new Promise<void>((resolve) => {
                producer.flush(FLUSH_TIMEOUT_MS, (err: LibrdKafkaError) => {
                    if (err) {
                        log(
                            'warn',
                            'kafka',
                            `flush warning for ${this.topic}: ${err.message}`
                        );
                    }
                    resolve();
                });
            });

            await new Promise<void>((resolve) => {
                producer.disconnect((err: unknown) => {
                    if (err) {
                        const message =
                            err instanceof Error
                                ? err.message
                                : String(
                                      (err as { message?: string })?.message ??
                                          err
                                  );
                        log(
                            'warn',
                            'kafka',
                            `disconnect warning for ${this.topic}: ${message}`
                        );
                    }
                    resolve();
                });
            });

            this.producer = null;
        }

        this.initPromise = null;
    }

    // append to queue; trigger worker immediately when BATCH_SIZE is reached
    enqueue(message: BufferedMessage): void {
        if (this.closed) {
            log(
                'warn',
                'kafka',
                `enqueue after disconnect dropped for ${this.topic}`
            );
            return;
        }

        this.queue.push(message);

        if (this.queue.length >= BATCH_SIZE) {
            this.startWorker();
        }
    }

    private startWorker(): void {
        if (this.running || !this.producer) return;

        this.running = true;
        this.workerPromise = this.runWorker().finally(() => {
            this.running = false;
        });
    }

    private async runWorker(): Promise<void> {
        while (this.queue.length > 0) {
            // Re-check producer each iteration: disconnect() may null it out
            // between batches.
            const producer = this.producer;
            if (!producer) return;

            const messages = this.queue.splice(0, BATCH_SIZE);

            try {
                for (const m of messages) {
                    const headers = m.headers
                        ? Object.entries(m.headers).map(([k, v]) => ({
                              [k]: v,
                          }))
                        : undefined;
                    producer.produce(
                        this.topic,
                        null,
                        m.value,
                        m.key,
                        m.timestamp,
                        undefined,
                        headers
                    );
                }
            } catch (err) {
                log('error', 'kafka', `produce failed for ${this.topic}`, {
                    err,
                });
                this.queue.unshift(...messages);
                return; // stop; timer will retry
            }
        }
    }

    getCount(): number {
        return this.queue.length;
    }

    async sendMessage(
        topic: string,
        key: string,
        message: Record<string, unknown>
    ): Promise<void> {
        if (DRY_RUN) {
            log('info', 'kafka', `DRY_RUN send`, { topic, message });
            return;
        }

        if (!this.producer) {
            throw new Error(
                'Producer not initialized. Call initProducer() first.'
            );
        }

        this.enqueue({
            key,
            value: Buffer.from(JSON.stringify(message)),
            timestamp: Date.now(),
        });
    }

    async sendBinary(
        topic: string,
        key: string,
        bytes: Uint8Array
    ): Promise<void> {
        if (DRY_RUN) {
            log('info', 'kafka', `DRY_RUN send binary`, {
                topic,
                bytes: bytes.length,
            });
            return;
        }

        if (!this.producer) {
            throw new Error(
                'Producer not initialized. Call initProducer() first.'
            );
        }

        this.enqueue({
            key,
            value: Buffer.from(bytes),
            headers: { encoding: 'proto' },
            timestamp: Date.now(),
        });
    }

    // Wire is JSON for MVP1 (00.architecture.mvp1.md §3.0/§3.7). `bytes` is
    // already-encoded wire payload from @repo/schema's PROTO_ENCODERS
    // (toJsonString with useProtoFieldName) — sent as-is, no _ts/_key
    // injection (§3.7 rule 4 — do not route this through publishJson()).
    async sendJsonWire(
        topic: string,
        key: string,
        bytes: Uint8Array
    ): Promise<void> {
        if (DRY_RUN) {
            log('info', 'kafka', `DRY_RUN send json wire`, {
                topic,
                bytes: bytes.length,
            });
            return;
        }

        if (!this.producer) {
            throw new Error(
                'Producer not initialized. Call initProducer() first.'
            );
        }

        this.enqueue({
            key,
            value: Buffer.from(bytes),
            headers: { encoding: 'json' },
            timestamp: Date.now(),
        });
    }
}

const producers = new Map<Topic, BufferedKafkaProducer>();

async function getProducer(topic: Topic): Promise<BufferedKafkaProducer> {
    let producer = producers.get(topic);
    if (!producer) {
        producer = new BufferedKafkaProducer(topic);
        producers.set(topic, producer);
        log('debug', 'kafka', 'producer inited', { topic });
    }

    await producer.init();
    return producer;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function initProducer(topics?: Topic | Topic[]): Promise<void> {
    if (!topics) return;
    const list = Array.isArray(topics) ? topics : [topics];
    await Promise.all(list.map((t) => getProducer(t)));
}

export async function disconnectProducer(): Promise<void> {
    await Promise.all(
        Array.from(producers.values(), (producer) => producer.disconnect())
    );
    producers.clear();
}

export async function sendMessage(
    topic: string,
    key: string,
    message: Record<string, unknown>
): Promise<void> {
    const producer = await getProducer(topic);
    return producer.sendMessage(topic, key, message);
}

export async function sendBinary(
    topic: string,
    key: string,
    bytes: Uint8Array
): Promise<void> {
    const producer = await getProducer(topic);
    return producer.sendBinary(topic, key, bytes);
}

export async function sendJsonWire(
    topic: string,
    key: string,
    bytes: Uint8Array
): Promise<void> {
    const producer = await getProducer(topic);
    return producer.sendJsonWire(topic, key, bytes);
}

// Returns a promise that resolves once the message has been enqueued.
// Errors are caught & logged here so the returned promise never rejects —
// fire-and-forget callers can ignore it, one-shot scripts can `await` it
// before disconnect.
export function publishBinary(
    topic: string,
    key: string,
    bytes: Uint8Array
): Promise<void> {
    return sendBinary(topic, key, bytes).catch((error) => {
        log('error', 'kafka', `publishBinary failed for ${topic}`, { error });
    });
}

// The JSON-wire counterpart to publishBinary — sends pre-encoded bytes as-is.
// Not publishJson(): that function injects _ts/_key into the payload, which
// are not proto fields (§3.7 rule 4). Callers must encode via
// @repo/schema's PROTO_ENCODERS first.
export function publishJsonWire(
    topic: string,
    key: string,
    bytes: Uint8Array
): Promise<void> {
    return sendJsonWire(topic, key, bytes).catch((error) => {
        log('error', 'kafka', `publishJsonWire failed for ${topic}`, {
            error,
        });
    });
}

export function publishJson(
    topic: string,
    key: string,
    data: Record<string, unknown>
): Promise<void> {
    const message = {
        ...data,
        _ts: new Date().toISOString(),
        _key: key,
    };
    return sendMessage(topic, key, message).catch((error) => {
        log('error', 'kafka', `publishJson failed for ${topic}/${key}`, {
            error,
        });
    });
}
