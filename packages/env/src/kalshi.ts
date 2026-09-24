import { loadDotenv } from './load-dotenv';
import { z } from 'zod';
import * as path from 'path';

loadDotenv();

export const kalshiSchema = z.object({
    KALSHI_API_KEY_ID: z.string().optional(),
    KALSHI_PRIVATE_KEY_PATH: z.string().optional(),
    KALSHI_WS_URL: z.string().url().optional(),
    KALSHI_API_URL: z.string().url().optional(),
    KALSHI_WS_URL_DEMO: z.string().url().optional(),
    KALSHI_API_URL_DEMO: z.string().url().optional(),
    DRY_RUN: z
        .string()
        .default('true')
        .transform((v) => v.toLowerCase() === 'true'),

    // §1 excludes the weather domain entirely — the prior weather-category
    // enum value is removed, 'hot' added to match trimmed TKalshiCategory
    // ('crypto' | 'hot' | 'all'), default 'crypto' (00.architecture.mvp1.md
    // §7 carry-over table, kalshi.ts row).
    KALSHI_SERIES_CATEGORY: z.enum(['crypto', 'hot', 'all']).default('crypto'),
    KALSHI_WS_MARKET_CHUNK_SIZE: z.coerce.number().default(50),
    KALSHI_MARKETS_REFRESH_MS: z.coerce.number().default(300),
    KALSHI_MIN_VOLUME_FP: z.coerce.number().default(0),
    KALSHI_MIN_OPEN_INTEREST_FP: z.coerce.number().default(0),
    KALSHI_MIN_BEST_DEPTH_FP: z.coerce.number().default(0),
    KALSHI_MIN_MINUTES_TO_CLOSE: z.coerce.number().default(0),
    KALSHI_MAX_MINUTES_TO_CLOSE: z.coerce.number().default(0),
    KALSHI_MAX_MARKETS: z.coerce.number().default(0),
});

export const KALSHI_ENV = kalshiSchema.parse(process.env);

export const KALSHI_PEM_PATH = path.resolve(
    process.cwd(),
    '../../',
    KALSHI_ENV.KALSHI_PRIVATE_KEY_PATH ?? '.env.kalshi.pem'
);

export const KALSHI_API_KEY_ID = KALSHI_ENV.KALSHI_API_KEY_ID;
export const KALSHI_WS_URL =
    KALSHI_ENV.KALSHI_WS_URL ?? 'wss://demo-api.kalshi.co/trade-api/ws/v2';
export const KALSHI_API_URL =
    KALSHI_ENV.KALSHI_API_URL ?? 'https://demo-api.kalshi.co/trade-api/v2';
export const KALSHI_WS_URL_DEMO =
    KALSHI_ENV.KALSHI_WS_URL_DEMO ?? 'wss://demo-api.kalshi.co/trade-api/ws/v2';
export const KALSHI_API_URL_DEMO =
    KALSHI_ENV.KALSHI_API_URL_DEMO ?? 'https://demo-api.kalshi.co/trade-api/v2';
export const DRY_RUN = KALSHI_ENV.DRY_RUN;

export const KALSHI_SERIES_CATEGORY = KALSHI_ENV.KALSHI_SERIES_CATEGORY;

export const KALSHI_WS_MARKET_CHUNK_SIZE =
    KALSHI_ENV.KALSHI_WS_MARKET_CHUNK_SIZE;
export const KALSHI_MARKETS_REFRESH_MS =
    KALSHI_ENV.KALSHI_MARKETS_REFRESH_MS * 1_000;
export const KALSHI_MIN_VOLUME_FP = KALSHI_ENV.KALSHI_MIN_VOLUME_FP;
export const KALSHI_MIN_OPEN_INTEREST_FP =
    KALSHI_ENV.KALSHI_MIN_OPEN_INTEREST_FP;
export const KALSHI_MIN_BEST_DEPTH_FP = KALSHI_ENV.KALSHI_MIN_BEST_DEPTH_FP;
export const KALSHI_MIN_MINUTES_TO_CLOSE =
    KALSHI_ENV.KALSHI_MIN_MINUTES_TO_CLOSE;
export const KALSHI_MAX_MINUTES_TO_CLOSE =
    KALSHI_ENV.KALSHI_MAX_MINUTES_TO_CLOSE;
export const KALSHI_MAX_MARKETS = KALSHI_ENV.KALSHI_MAX_MARKETS;
