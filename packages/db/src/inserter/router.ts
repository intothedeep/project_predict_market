/**
 * routePublish — unified publish entry point for producers.
 *
 * Kafka-only (§7 — csv branch, insert-csv.ts, and the pg raw-query pool were
 * dropped as MVP1 has no Postgres/CSV sink). Wire format is JSON
 * (00.architecture.mvp1.md §3.0/§3.7): the topic's PROTO_ENCODERS entry
 * produces already-proto-field-named, already-JSON-encoded wire bytes; this
 * function sends them unmodified via publishJsonWire.
 *
 * Do NOT route through @repo/common's publishJson() — it injects `_ts`/`_key`
 * into the payload, and neither key is a proto field (§3.7 rule 4, this is
 * the exact trap the architecture calls out).
 *
 * §7's carry-over row for this file additionally says "proto 분기는 유지
 * (복귀 경로)" — a KAFKA_ENCODING=proto branch producing real proto-binary
 * bytes. That branch is NOT ported here: @repo/schema's PROTO_ENCODERS (as
 * landed by U3b) only emits JSON wire bytes now — there is no binary encoder
 * to call. A runtime env-switch branch would have nothing to encode against
 * except the JSON encoder, which would mislabel JSON bytes with a `proto`
 * header — worse than not having the branch. This is a disagreement between
 * §7's carry-over table and the actual state of @repo/schema post-U3b;
 * flagging for the architect rather than fabricating a binary path. The
 * documented revert-to-binary path is the one-line swap inside
 * proto-codec.ts's toJsonBytes/fromJsonBytes, not a router env switch.
 */

import { publishJsonWire, log } from '@repo/common';
import { PROTO_ENCODERS } from '@repo/schema';

// Returns a promise that resolves once the message has been enqueued for
// Kafka. Existing fire-and-forget callers can ignore the return value;
// one-shot batch producers should `await Promise.all(...)` before disconnect
// to guarantee no message loss.
export function routePublish(
    topic: string,
    key: string,
    data: Record<string, unknown>
): Promise<void> {
    const encoder = PROTO_ENCODERS[topic];

    if (!encoder) {
        log('error', 'router', `no proto encoder registered for topic ${topic}`);
        return Promise.resolve();
    }

    let bytes: Uint8Array;
    try {
        // `_key` is encoder input only — PROTO_ENCODERS maps it onto the
        // proto `idempotencyKey` field (see proto-codec.ts); it never reaches
        // the wire as a top-level `_key` since toJson only emits declared
        // schema fields. `event_time_ms` is deliberately NOT injected here:
        // the encoder already falls back to Date.now() when absent, and
        // producers that carry an event timestamp put it on `data` directly.
        bytes = encoder({ ...data, _key: key });
    } catch (e) {
        log('error', 'router', `proto encode failed for ${topic}: ${e}`);
        return Promise.resolve();
    }

    return publishJsonWire(topic, key, bytes);
}
