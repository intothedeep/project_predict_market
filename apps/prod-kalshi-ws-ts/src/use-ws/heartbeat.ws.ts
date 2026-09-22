import { log } from '@repo/common';

export function createHeartbeatMonitor(
    wsName: string,
    onTimeout: () => void,
    timeoutMs: number = 30_000
): { recordMessage: () => void; stop: () => void } {
    let lastMessageMs = Date.now();
    let checkTimer: ReturnType<typeof setInterval> | null = null;

    function startCheck(): void {
        checkTimer = setInterval(() => {
            const now = Date.now();
            if (now - lastMessageMs > timeoutMs) {
                log(
                    'warn',
                    wsName,
                    `heartbeat timeout: no message for ${timeoutMs}ms`
                );
                onTimeout();
            }
        }, 5_000);
    }

    startCheck();

    return {
        recordMessage: () => {
            lastMessageMs = Date.now();
        },
        stop: () => {
            if (checkTimer) {
                clearInterval(checkTimer);
                checkTimer = null;
            }
        },
    };
}
