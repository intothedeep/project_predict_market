/**
 * apps/api env
 * ============
 * Local to this app (not packages/env — U9's scope is apps/api only, same
 * pattern as apps/orderbook-writer/src/env.ts).
 */

import { z } from 'zod';

const schema = z.object({
    REDIS_URL: z.string().default('redis://localhost:6379'),
    API_PORT: z.coerce.number().int().positive().default(3001),
    SSE_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(500),
});

const parsed = schema.parse(process.env);

export const REDIS_URL = parsed.REDIS_URL;
export const API_PORT = parsed.API_PORT;
export const SSE_POLL_INTERVAL_MS = parsed.SSE_POLL_INTERVAL_MS;
