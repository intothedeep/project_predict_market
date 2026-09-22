/**
 * Utility functions
 */

/**
 * Get string from environment variable with default
 */
export function env(name: string, defaultValue: string): string {
    return process.env[name] ?? defaultValue;
}

/**
 * Get integer from environment variable with default
 */
export function envInt(name: string, defaultValue: number): number {
    const val = process.env[name];
    if (!val) return defaultValue;
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? defaultValue : parsed;
}

export function toNumber(value: unknown): number | undefined {
    if (typeof value === 'number') {
        if (!Number.isFinite(value)) {
            return undefined;
        }
        return value;
    }

    if (typeof value === 'string') {
        const num = Number(value.trim());
        if (!Number.isFinite(num)) {
            return undefined;
        }
        return num;
    }

    return undefined;
}

export function toFixedNumber100(value: unknown): number | undefined {
    if (typeof value === 'number') {
        if (!Number.isFinite(value)) {
            return undefined;
        }
        return Math.round(value * 100);
    }

    if (typeof value === 'string') {
        const num = Number(value.trim());

        if (!Number.isFinite(num)) {
            return undefined;
        }

        return Math.round(num * 100);
    }

    return undefined;
}
