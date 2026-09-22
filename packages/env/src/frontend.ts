import { loadDotenv } from './load-dotenv';
import { z } from 'zod';

loadDotenv();

export const frontendSchema = z.object({
    NEXT_PUBLIC_API_URL: z.string().url().optional(),
});

export const FRONTEND_ENV = frontendSchema.parse(process.env);
export const NEXT_PUBLIC_API_URL = FRONTEND_ENV.NEXT_PUBLIC_API_URL;
