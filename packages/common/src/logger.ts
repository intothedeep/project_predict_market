export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export function log(
    level: LogLevel,
    service: string,
    message: string,
    meta?: Record<string, unknown>
): void {
    const line = JSON.stringify({
        level,
        ts: new Date().toISOString(),
        service,
        message,
        ...(meta ?? {}),
    }, (_k, v) =>
        v instanceof Error
            ? { name: v.name, message: v.message, stack: v.stack }
            : typeof v === 'bigint'
              ? v.toString()
              : v
    );

    if (level === 'error') {
        console.error(line);
    } else {
        console.log(line);
    }
}
