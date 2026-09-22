import * as dotenv from 'dotenv';
import * as path from 'path';

let loaded = false;

export function loadDotenv(): void {
    if (loaded) return;
    if (process.env.NODE_ENV !== 'production') {
        dotenv.config({ path: path.resolve(process.cwd(), '.env') });
    }
    loaded = true;
}
