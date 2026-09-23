/**
 * orderbook-writer env
 * =====================
 * Local to this app (not packages/env — U8's scope is apps/orderbook-writer
 * only). MOCK_SOURCE has no default and must be the literal string "1" to
 * select mockSource — an unset/other value falls through to kafkaSource,
 * which does not exist until MVP3, so main() throws rather than silently
 * doing nothing (00.architecture.mvp1.md §4.5 — mock must never be the
 * default path).
 */

import { fileURLToPath } from 'node:url';
import { z } from 'zod';

// apps/orderbook-writer/src/env.ts -> repo root is three levels up, whether
// this runs from src/ (tsx) or dist/ (tsc build) — same directory depth.
const REPO_ROOT = fileURLToPath(new URL('../../..', import.meta.url));

const schema = z.object({
    REDIS_URL: z.string().default('redis://localhost:6379'),
    MOCK_SOURCE: z.string().optional(),
    MOCK_ORDERBOOK_FILE: z
        .string()
        .default(`${REPO_ROOT}mocks/pred-orderbook.mock.jsonl`),
    MOCK_REPLAY_INTERVAL_MS: z.coerce.number().int().positive().default(200),
});

const parsed = schema.parse(process.env);

export const REDIS_URL = parsed.REDIS_URL;
export const MOCK_SOURCE_ENABLED = parsed.MOCK_SOURCE === '1';
export const MOCK_ORDERBOOK_FILE = parsed.MOCK_ORDERBOOK_FILE;
export const MOCK_REPLAY_INTERVAL_MS = parsed.MOCK_REPLAY_INTERVAL_MS;

// §4.4: hash TTL 600s, heartbeat TTL 60s.
export const ORDERBOOK_TTL_SECONDS = 600;
export const HEARTBEAT_TTL_SECONDS = 60;
export const HEARTBEAT_INTERVAL_MS = 10_000;
