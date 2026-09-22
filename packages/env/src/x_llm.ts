import { loadDotenv } from './load-dotenv';
import { z } from 'zod';

loadDotenv();

export const llmSchema = z.object({
    OPENAI_API_KEY: z.string().optional(),
    ANTHROPIC_API_KEY: z.string().optional(),
    GOOGLE_API_KEY: z.string().optional(),
    DEFAULT_LLM_PROVIDER: z.string().default('openai'),
    OLLAMA_BASE_URL: z.string().url().optional(),
    OLLAMA_MODEL: z.string().optional(),
});

export const LLM_ENV = llmSchema.parse(process.env);
export const OPENAI_API_KEY = LLM_ENV.OPENAI_API_KEY;
export const ANTHROPIC_API_KEY = LLM_ENV.ANTHROPIC_API_KEY;
export const GOOGLE_API_KEY = LLM_ENV.GOOGLE_API_KEY;
export const DEFAULT_LLM_PROVIDER = LLM_ENV.DEFAULT_LLM_PROVIDER;
export const OLLAMA_BASE_URL = LLM_ENV.OLLAMA_BASE_URL;
export const OLLAMA_MODEL = LLM_ENV.OLLAMA_MODEL;
