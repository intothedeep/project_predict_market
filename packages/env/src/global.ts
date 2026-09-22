import { loadDotenv } from './load-dotenv';
import { z } from 'zod';

loadDotenv();

export const globalSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().default(3001),
    AGENT_PORT: z.coerce.number().default(8000),
    LOG_LEVEL: z.string().default('INFO'),
});

export const GLOBAL_ENV = globalSchema.parse(process.env);
export const NODE_ENV = GLOBAL_ENV.NODE_ENV;
export const PORT = GLOBAL_ENV.PORT;
export const AGENT_PORT = GLOBAL_ENV.AGENT_PORT;
export const LOG_LEVEL = GLOBAL_ENV.LOG_LEVEL;
