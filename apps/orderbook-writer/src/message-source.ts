/**
 * MessageSource — the mock/real seam (00.architecture.mvp1.md §4.5).
 *
 * MVP1: only mockSource (mock-source.ts) exists. kafkaSource is MVP3 — the
 * architect ruled that building a consumer with nothing flowing through it
 * is the "code-only phase" the MVP ladder forbids (see PLAN.md U8).
 *
 * The writer applies full books statelessly (§4.2 option A): it has no
 * venue dialect to absorb, so there is no VenueOrderbookAdapter here — that
 * boundary lives in the producer (U6, §4.0/§4.1).
 */

/**
 * Decoded `pred.orderbook.ws` wire message (PredOrderbookSchema, §3.1),
 * as produced by @repo/schema's PROTO_DECODERS. `seq` is `bigint |
 * undefined` at the TS level because the proto field is `optional int64`,
 * but the wire contract (§4.0) guarantees the producer always populates it
 * for this topic — the writer treats a missing seq as a contract violation
 * (see redis-writer.ts), not something to synthesize itself.
 */
export interface DecodedOrderbook {
    timeMs: bigint;
    ticker: string;
    bids: Array<[string, string]>;
    asks: Array<[string, string]>;
    seq: bigint | undefined;
    venue: string;
    idempotencyKey: string;
}

export interface MessageSource {
    subscribe(
        topic: string,
        onMessage: (message: DecodedOrderbook) => void
    ): Promise<void>;
    close(): Promise<void>;
}
