import { log, type LogLevel } from './logger';

/**
 * Returns a log function that emits at most one line per intervalMs.
 * Calls in between are counted and surfaced as `suppressedCount` on the
 * next emitted line — hot paths (WS parse errors) stay observable without
 * flooding stdout. Single bucket per instance, pure closure, no timers.
 */
export function createRateLimitedLog(
    service: string,
    intervalMs = 60_000
): (level: LogLevel, message: string, meta?: Record<string, unknown>) => void {
    let lastLoggedAt = -Infinity;
    let suppressed = 0;

    return (
        level: LogLevel,
        message: string,
        meta?: Record<string, unknown>
    ): void => {
        const now = Date.now();
        if (now - lastLoggedAt >= intervalMs) {
            log(level, service, message, {
                ...meta,
                suppressedCount: suppressed,
            });
            lastLoggedAt = now;
            suppressed = 0;
        } else {
            suppressed++;
        }
    };
}
