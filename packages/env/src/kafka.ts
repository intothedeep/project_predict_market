import { loadDotenv } from './load-dotenv';
import { z } from 'zod';

loadDotenv();

export const kafkaSchema = z.object({
    KAFKA_BOOTSTRAP: z.string().optional(),
    KAFKA_TOPIC_ENCODING: z.string().optional(),
});

export const KAFKA_ENV = kafkaSchema.parse(process.env);
export const KAFKA_BOOTSTRAP = KAFKA_ENV.KAFKA_BOOTSTRAP;
export const KAFKA_TOPIC_ENCODING = KAFKA_ENV.KAFKA_TOPIC_ENCODING;
