// MVP1 redesign (§6, §7): weather/apiHist/private-channel/legacy-api 상수
// 제거. 예측시장 4개는 `pred.*`로 개명(3개 proto 메시지 + orderbook_delta
// 변형). crypto 2개는 그대로.
export const KAFKA_TOPICS = {
    ws: {
        MARKET_TICK_WS: 'pred.market.tick.ws',
        TRADE_WS: 'pred.trade.ws',
        ORDERBOOK_WS: 'pred.orderbook.ws',
        ORDERBOOK_DELTA_WS: 'pred.orderbook_delta.ws',
    },
    crypto: {
        TRADES: 'crypto.trades',
        TICKS: 'crypto.ticks',
    },
} as const;

export type TKalshiKafkaTopic =
    | (typeof KAFKA_TOPICS.ws)[keyof typeof KAFKA_TOPICS.ws]
    | (typeof KAFKA_TOPICS.crypto)[keyof typeof KAFKA_TOPICS.crypto];
