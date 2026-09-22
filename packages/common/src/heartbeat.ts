import { promises as fs } from 'node:fs';
import { createRateLimitedLog } from './log-rate-limited';

/**
 * Touches filePath with the current epoch ms every intervalMs so a k8s
 * exec liveness probe can check file freshness (stat mtime). No-op when
 * filePath is unset (local dev). Interval is unref()ed — never keeps the
 * process alive. Write failures emit one rate-limited warn.
 */
export function startHeartbeatFile(
    filePath = process.env.HEARTBEAT_FILE,
    intervalMs = 10_000
): { stop: () => void } {
    if (!filePath) {
        return { stop: () => {} };
    }

    const logWriteError = createRateLimitedLog('heartbeat');
    const touch = (): void => {
        fs.writeFile(filePath, String(Date.now())).catch((err) => {
            logWriteError('warn', `heartbeat write failed: ${filePath}`, {
                err,
            });
        });
    };

    touch();
    const timer = setInterval(touch, intervalMs);
    timer.unref();

    return { stop: () => clearInterval(timer) };
}
