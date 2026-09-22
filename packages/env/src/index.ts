export * from './global';
export * from './db';
export * from './kalshi';
export * from './kafka';
export * from './frontend';

import { GLOBAL_ENV } from './global';
import { DB_ENV } from './db';
import { KALSHI_ENV } from './kalshi';
import { KAFKA_ENV } from './kafka';
import { FRONTEND_ENV } from './frontend';

/** @deprecated Prefer subpath imports (e.g. `@repo/env/global`). Kept for backward compat. */
export const parsedEnv = {
    ...GLOBAL_ENV,
    ...DB_ENV,
    ...KALSHI_ENV,
    ...KAFKA_ENV,
    ...FRONTEND_ENV,
};
