// Kafka is deliberately NOT re-exported here (00.architecture.mvp1.md §7.1.2,
// U19). Importing this barrel must not map the librdkafka native binary or
// touch KAFKA_BOOTSTRAP in processes that never talk to Kafka. Producers
// import Kafka helpers from the explicit subpath: '@repo/common/kafka'.
export { log, type LogLevel } from './logger';
export { createRateLimitedLog } from './log-rate-limited';
export { registerShutdown } from './shutdown';
export { startHeartbeatFile } from './heartbeat';
export { createReconnectingWS } from './ws';
export { env, envInt, toNumber, toFixedNumber100 } from './utils';
export * from './idempotency';
export { ClickHouseManager } from './clickhouse';
